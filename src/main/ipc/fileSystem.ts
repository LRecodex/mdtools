import { ipcMain, shell } from 'electron'
import { promises as fs } from 'fs'
import { join, extname, dirname, basename, parse, relative, resolve, sep } from 'path'
import mammoth from 'mammoth'
import ExcelJS from 'exceljs'
import { documentKind, isCreatableKind, isEditableKind, type FileNode, type OpenedDocument, type SearchResult, type SpreadsheetCellStyle, type SpreadsheetData, type SpreadsheetMerge } from '../../shared/types'

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
  if (value instanceof Date) return value.toLocaleDateString('en-GB')
  if (typeof value !== 'object') return String(value)
  const record = value as unknown as Record<string, unknown>
  if (record.result instanceof Date) return record.result.toLocaleDateString('en-GB')
  if (record.result != null) return String(record.result)
  if (Array.isArray(record.richText)) return (record.richText as Array<{ text: string }>).map((part) => part.text).join('')
  if (record.text != null) return String(record.text)
  if (record.hyperlink != null) return String(record.hyperlink)
  return JSON.stringify(value)
}

function cellDisplay(cell: ExcelJS.Cell): string {
  // ExcelJS uses the cell's number format for text, which prevents long binary
  // decimals and verbose Date.toString() output from spilling across the grid.
  return cell.text || cellText(cell.value)
}

function cellFormula(cell: ExcelJS.Cell): string | undefined {
  if (cell.formula) return cell.formula
  const value = cell.value
  if (value && typeof value === 'object' && 'formula' in value) {
    const formula = (value as { formula?: unknown }).formula
    return typeof formula === 'string' ? formula : undefined
  }
  return undefined
}

function excelColor(color: { argb?: string } | undefined): string | undefined {
  const argb = color?.argb
  if (!argb || !/^[A-Fa-f0-9]{8}$/.test(argb)) return undefined
  const alpha = Number.parseInt(argb.slice(0, 2), 16) / 255
  const rgb = argb.slice(2)
  return alpha >= 0.99 ? `#${rgb}` : `#${rgb}${argb.slice(0, 2)}`
}

function cellStyle(cell: ExcelJS.Cell): SpreadsheetCellStyle | undefined {
  const style: SpreadsheetCellStyle = {}
  const fill = cell.fill as { fgColor?: { argb?: string } } | undefined
  const background = excelColor(fill?.fgColor)
  const color = excelColor(cell.font?.color)
  if (background) style.background = background
  if (color) style.color = color
  if (cell.font?.bold) style.bold = true
  if (cell.font?.italic) style.italic = true
  if (cell.alignment?.horizontal) style.horizontal = cell.alignment.horizontal as SpreadsheetCellStyle['horizontal']
  if (cell.alignment?.vertical) style.vertical = cell.alignment.vertical as SpreadsheetCellStyle['vertical']
  if (cell.alignment?.wrapText) style.wrapText = true
  return Object.keys(style).length ? style : undefined
}

function sheetMerges(sheet: ExcelJS.Worksheet): SpreadsheetMerge[] {
  const merges = (sheet as unknown as { _merges?: Record<string, { model: SpreadsheetMerge }> })._merges ?? {}
  return Object.values(merges).map((merge) => merge.model)
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
    const rows: SpreadsheetData['rows'] = []
    for (let rowNumber = 1; rowNumber <= maxRows; rowNumber += 1) {
      const row: SpreadsheetData['rows'][number] = []
      for (let column = 1; column <= maxColumns; column += 1) {
        const cell = sheet.getCell(rowNumber, column)
        row.push({ address: cell.address, value: cellDisplay(cell), formula: cellFormula(cell), style: cellStyle(cell), locked: cell.protection?.locked })
      }
      rows.push(row)
    }
    const view = (sheet.views ?? [])[0]
    return {
      name: sheet.name,
      rows,
      truncated: sheet.rowCount > maxRows || sheet.columnCount > maxColumns,
      columns: Array.from({ length: maxColumns }, (_, index) => ({ width: sheet.getColumn(index + 1).width, hidden: sheet.getColumn(index + 1).hidden })),
      rowMeta: Array.from({ length: maxRows }, (_, index) => ({ height: sheet.getRow(index + 1).height, hidden: sheet.getRow(index + 1).hidden })),
      merges: sheetMerges(sheet).filter((merge) => merge.top <= maxRows && merge.left <= maxColumns),
      frozenRows: view?.state === 'frozen' ? view.ySplit ?? 0 : 0,
      frozenColumns: view?.state === 'frozen' ? view.xSplit ?? 0 : 0,
      zoom: view?.zoomScale ?? view?.zoomScaleNormal ?? 100,
      activeCell: view?.activeCell,
      hidden: sheet.state === 'hidden' || sheet.state === 'veryHidden',
      protected: Boolean((sheet as unknown as { sheetProtection?: unknown }).sheetProtection)
    }
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
const SEARCH_FILE_SIZE_LIMIT = 2 * 1024 * 1024
const SEARCHABLE_KINDS = new Set(['markdown', 'text', 'json', 'code', 'csv'])

function contentMatchContext(content: string, query: string, terms: string[]): string | undefined {
  const lowered = content.toLocaleLowerCase()
  const phrasePosition = lowered.indexOf(query)
  const positions = terms.map((term) => lowered.indexOf(term))
  if (phrasePosition < 0 && positions.some((position) => position < 0)) return undefined

  const position = phrasePosition >= 0 ? phrasePosition : Math.min(...positions)
  const start = Math.max(0, position - 52)
  const end = Math.min(content.length, position + Math.max(query.length, 1) + 108)
  return `${start > 0 ? '…' : ''}${content.slice(start, end).replace(/\s+/g, ' ').trim()}${end < content.length ? '…' : ''}`
}

async function searchFileContent(path: string, query: string, terms: string[]): Promise<string | undefined> {
  try {
    const stats = await fs.stat(path)
    if (stats.size > SEARCH_FILE_SIZE_LIMIT) return undefined
    return contentMatchContext(await fs.readFile(path, 'utf-8'), query, terms)
  } catch {
    // Files can change or be unavailable while a workspace is being searched.
    return undefined
  }
}

async function searchFiles(root: string, rawQuery: string): Promise<SearchResult[]> {
  const query = rawQuery.trim().toLocaleLowerCase()
  const terms = query.replace(/\\/g, '/').split(/\s+/).filter(Boolean)
  const results: SearchResult[] = []

  async function walk(dir: string): Promise<void> {
    if (results.length >= SEARCH_RESULT_CAP) return
    let entries: Awaited<ReturnType<typeof readDirEntries>>
    try {
      entries = await readDirEntries(dir)
    } catch (error) {
      if (dir === root) throw error
      return
    }
    for (const entry of entries) {
      if (results.length >= SEARCH_RESULT_CAP) return
      if (entry.name.startsWith('.')) continue
      const full = join(dir, entry.name)
      const pathMatches = terms.every((term) => relative(root, full).replace(/\\/g, '/').toLocaleLowerCase().includes(term))
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue
        if (pathMatches) results.push({ name: entry.name, path: full, isDirectory: true, isMarkdown: false, kind: 'unsupported', matchedInContent: false })
        await walk(full)
      } else if (entry.isFile()) {
        const kind = documentKind(entry.name)
        const matchContext = pathMatches || !query || !SEARCHABLE_KINDS.has(kind)
          ? undefined
          : await searchFileContent(full, query, terms)
        if (pathMatches || matchContext) {
          results.push({
            name: entry.name,
            path: full,
            isDirectory: false,
            isMarkdown: isMarkdownFile(entry.name),
            kind,
            matchContext,
            matchedInContent: Boolean(matchContext)
          })
        }
      }
    }
  }

  await walk(root)
  return results
}

async function availableCopyPath(sourcePath: string, destinationDir: string): Promise<string> {
  const sourceName = basename(sourcePath)
  const parsed = parse(sourceName)
  const sourceIsDirectory = (await fs.stat(sourcePath)).isDirectory()
  const originalTarget = join(destinationDir, sourceName)

  try {
    await fs.access(originalTarget)
  } catch {
    return originalTarget
  }

  let copyNumber = 1

  while (true) {
    const suffix = copyNumber === 1 ? ' - Copy' : ` - Copy (${copyNumber})`
    const name = sourceIsDirectory
      ? `${sourceName}${suffix}`
      : `${parsed.name}${suffix}${parsed.ext}`
    const candidate = join(destinationDir, name)
    try {
      await fs.access(candidate)
      copyNumber += 1
    } catch {
      return candidate
    }
  }
}

async function copyEntry(sourcePath: string, destinationDir: string): Promise<string> {
  const source = resolve(sourcePath)
  const destination = resolve(destinationDir)
  const sourceStats = await fs.stat(source)
  const destinationStats = await fs.stat(destination)
  if (!destinationStats.isDirectory()) throw new Error('Paste destination must be a folder')

  if (sourceStats.isDirectory()) {
    const destinationRelativeToSource = relative(source, destination)
    if (!destinationRelativeToSource || (!destinationRelativeToSource.startsWith(`..${sep}`) && destinationRelativeToSource !== '..')) {
      throw new Error('A folder cannot be pasted inside itself')
    }
  }

  const target = await availableCopyPath(source, destination)
  await fs.cp(source, target, { recursive: sourceStats.isDirectory(), errorOnExist: true })
  return target
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

  ipcMain.handle('fs:copy', async (_event, sourcePath: string, destinationDir: string) =>
    copyEntry(sourcePath, destinationDir)
  )

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
