import { ipcMain, BrowserWindow } from 'electron'
import chokidar, { type FSWatcher } from 'chokidar'
import type { WatchEventType } from '../shared/types'

const IGNORED = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/out/**',
  '**/release/**',
  '**/.cache/**'
]

let watcher: FSWatcher | null = null

function stop(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
}

function start(rootPath: string, win: BrowserWindow): void {
  stop()
  watcher = chokidar.watch(rootPath, {
    ignored: IGNORED,
    ignoreInitial: true,
    persistent: true
  })

  const emit = (type: WatchEventType) => (path: string) => {
    if (!win.isDestroyed()) win.webContents.send('watcher:event', { type, path })
  }

  watcher
    .on('add', emit('add'))
    .on('addDir', emit('addDir'))
    .on('unlink', emit('unlink'))
    .on('unlinkDir', emit('unlinkDir'))
    .on('change', emit('change'))
}

export function registerWatcherHandlers(): void {
  ipcMain.handle('watcher:start', (event, rootPath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) start(rootPath, win)
  })

  ipcMain.handle('watcher:stop', () => {
    stop()
  })
}
