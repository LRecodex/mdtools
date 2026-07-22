import { ipcMain, shell } from 'electron'
import { promises as fs } from 'fs'
import { join, extname, dirname } from 'path'
import mammoth from 'mammoth'
import ExcelJS from 'exceljs'
import { documentKind, isCreatableKind, isEditableKind, type FileNode, type OpenedDocument, type SpreadsheetData } from '../../shared/types'

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdx'])

function isMarkdownFile(name: string): boolean {
  return MARKDOWN_EXTENSIONS.has(extname(name).toLowerCase())
}

function imageMime(path: string): string {
  const extension = extname(path).toLowerCase()
  const types: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.webp': 'image/webp', '.bmp': 'image/bmp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    '.avif': 'image/avif'
  }
  return types[extension] ?? 'application/octet-stream'
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toLocaleString()
  if (typeof value !== 'object') return String(value)
  const record = value as unknown as Record<string, unknown>
  if (record.result != null) return String(record.result)
  if (Array.isArray(record.richText)) return (record.richText as Array<{ text: string }>).map((part) => part.text).join('')
  if (record.text != null) return String(record.text)
  if (record.hyperlink != null) return String(record.hyperlink)
  return JSON.stringify(value)
}

async function openDocument(path: string): Promise<OpenedDocument> {
  const kind = documentKind(path)
  if (kind === 'unsupported') {
    return { kind, editable: false, content: '' }
  }
  if (kind === 'markdown' || kind === 'text' || kind === 'json' || kind === 'code' || kind === 'csv') {
    return { kind, editable: isEditableKind(kind), content: await fs.readFile(path, 'utf-8') }
  }

  const buffer = await fs.readFile(path)
  if (kind === 'image' || kind === 'pdf') {
    const mime = kind === 'pdf' ? 'application/pdf' : imageMime(path)
    return { kind, editable: false, content: '', dataUrl: `data:${mime};base64,${buffer.toString('base64')}` }
  }
  if (kind === 'docx') {
    const result = await mammoth.convertToHtml(
      { buffer },
      { convertImage: mammoth.images.imgElement((image) => image.read('base64').then((data) => ({ src: `data:${image.contentType};base64,${data}` }))) }
    )
    return { kind, editable: false, content: '', html: result.value }
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)
  const sheets: SpreadsheetData[] = workbook.worksheets.map((sheet) => {
    const maxRows = Math.min(sheet.rowCount, 1000)
    const maxColumns = Math.min(sheet.columnCount, 100)
    const rows: string[][] = []
    for (let rowNumber = 1; rowNumber <= maxRows; rowNumber += 1) {
      const row: string[] = []
      for (let column = 1; column <= maxColumns; column += 1) {
        row.push(cellText(sheet.getCell(rowNumber, column).value))
      }
      rows.push(row)
    }
    return { name: sheet.name, rows, truncated: sheet.rowCount > maxRows || sheet.columnCount > maxColumns }
  })
  return { kind, editable: false, content: '', sheets }
}

function readDirEntries(path: string) {
  return fs.readdir(path, { withFileTypes: true, encoding: 'utf-8' })
}

async function readDir(path: string): Promise<FileNode[]> {
  const entries = await readDirEntries(path)
  const nodes: FileNode[] = entries
    .filter((entry) => !entry.name.startsWith('.'))
    .map((entry) => ({
      name: entry.name,
      path: join(path, entry.name),
      isDirectory: entry.isDirectory(),
      isMarkdown: !entry.isDirectory() && isMarkdownFile(entry.name),
      kind: entry.isDirectory() ? 'unsupported' : documentKind(entry.name)
    }))

  nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })

  return nodes
}

function withMarkdownExtension(name: string): string {
  return extname(name) ? name : `${name}.md`
}

function validateChildName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed || trimmed === '.' || trimmed === '..' || /[\\/:*?"<>|]/.test(trimmed)) {
    throw new Error('Invalid file or folder name')
  }
  return trimmed
}

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'out', 'release', '.cache'])
const SEARCH_RESULT_CAP = 200

async function searchFiles(root: string, query: string): Promise<FileNode[]> {
  const q = query.trim().toLowerCase()
  const results: FileNode[] = []

  async function walk(dir: string): Promise<void> {
    if (results.length >= SEARCH_RESULT_CAP) return
    let entries: Awaited<ReturnType<typeof readDirEntries>>
    try {
      entries = await readDirEntries(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      if (results.length >= SEARCH_RESULT_CAP) return
      if (entry.name.startsWith('.')) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue
        await walk(full)
      } else if (!q || entry.name.toLowerCase().includes(q)) {
        results.push({
          name: entry.name,
          path: full,
          isDirectory: false,
          isMarkdown: isMarkdownFile(entry.name),
          kind: documentKind(entry.name)
        })
      }
    }
  }

  await walk(root)
  return results
}

export function registerFileSystemHandlers(): void {
  ipcMain.handle('fs:readDir', async (_event, path: string) => readDir(path))

  ipcMain.handle('fs:openDocument', async (_event, path: string) => openDocument(path))

  ipcMain.handle('fs:writeFile', async (_event, path: string, content: string) => {
    if (!isEditableKind(documentKind(path))) {
      throw new Error('This file type is read-only')
    }
    await fs.writeFile(path, content, 'utf-8')
  })

  ipcMain.handle('fs:createFile', async (_event, dirPath: string, name: string, content = '') => {
    const fileName = withMarkdownExtension(validateChildName(name))
    if (!isCreatableKind(documentKind(fileName))) {
      throw new Error('Only Markdown, TXT, and JSON files can be created')
    }
    const target = join(dirPath, fileName)
    await fs.writeFile(target, content, { flag: 'wx', encoding: 'utf-8' })
    return target
  })

  ipcMain.handle('fs:createFolder', async (_event, dirPath: string, name: string) => {
    const target = join(dirPath, validateChildName(name))
    await fs.mkdir(target)
    return target
  })

  ipcMain.handle('fs:rename', async (_event, oldPath: string, newName: string) => {
    const target = join(dirname(oldPath), validateChildName(newName))
    await fs.rename(oldPath, target)
    return target
  })

  ipcMain.handle('fs:delete', async (_event, path: string) => {
    await shell.trashItem(path)
  })

  ipcMain.handle('fs:exists', async (_event, path: string) => {
    try {
      await fs.access(path)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('fs:searchFiles', async (_event, root: string, query: string) =>
    searchFiles(root, query)
  )
}
