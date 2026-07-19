import { ipcMain, shell } from 'electron'
import { promises as fs } from 'fs'
import { join, extname, dirname } from 'path'
import type { FileNode } from '../../shared/types'

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdx'])

function isMarkdownFile(name: string): boolean {
  return MARKDOWN_EXTENSIONS.has(extname(name).toLowerCase())
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
      isMarkdown: !entry.isDirectory() && isMarkdownFile(entry.name)
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
          isMarkdown: isMarkdownFile(entry.name)
        })
      }
    }
  }

  await walk(root)
  return results
}

export function registerFileSystemHandlers(): void {
  ipcMain.handle('fs:readDir', async (_event, path: string) => readDir(path))

  ipcMain.handle('fs:readFile', async (_event, path: string) => fs.readFile(path, 'utf-8'))

  ipcMain.handle('fs:writeFile', async (_event, path: string, content: string) => {
    await fs.writeFile(path, content, 'utf-8')
  })

  ipcMain.handle('fs:createFile', async (_event, dirPath: string, name: string) => {
    const fileName = withMarkdownExtension(name)
    const target = join(dirPath, fileName)
    await fs.writeFile(target, '', { flag: 'wx' })
    return target
  })

  ipcMain.handle('fs:createFolder', async (_event, dirPath: string, name: string) => {
    const target = join(dirPath, name)
    await fs.mkdir(target)
    return target
  })

  ipcMain.handle('fs:rename', async (_event, oldPath: string, newName: string) => {
    const target = join(dirname(oldPath), newName)
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
