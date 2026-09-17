import { app, shell, BrowserWindow, screen, type Rectangle } from 'electron'
import { join } from 'path'
import { is } from './is'
import { registerFileSystemHandlers } from './ipc/fileSystem'
import { registerDialogHandlers } from './ipc/dialog'
import { registerWindowHandlers, attachWindowStateEvents } from './ipc/window'
import { registerSettingsHandlers } from './ipc/settings'
import { registerWatcherHandlers } from './watcher'
import { getSettings, updateSettings } from './settings'
import { registerAutoUpdater } from './autoUpdate'

const DEFAULT_WINDOW_WIDTH = 1280
const DEFAULT_WINDOW_HEIGHT = 800
const MIN_WINDOW_WIDTH = 760
const MIN_WINDOW_HEIGHT = 480
const MIN_VISIBLE_WIDTH = 100
const MIN_VISIBLE_HEIGHT = 100

function createWindow(): void {
  const { windowBounds } = getSettings()
  const initialBounds = getInitialWindowBounds(windowBounds)

  const mainWindow = new BrowserWindow({
    title: 'MD Tools',
    width: initialBounds.width,
    height: initialBounds.height,
    x: initialBounds.x,
    y: initialBounds.y,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    show: false,
    frame: false,
    backgroundColor: '#1e1f22',
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('resized', () => persistBounds(mainWindow))
  mainWindow.on('moved', () => persistBounds(mainWindow))

  mainWindow.webContents.setWindowOpenHandler((details) => {
    const protocol = new URL(details.url).protocol
    if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:') {
      void shell.openExternal(details.url)
    }
    return { action: 'deny' }
  })

  attachWindowStateEvents(mainWindow)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function getInitialWindowBounds(
  bounds: { width: number; height: number; x?: number; y?: number } | null
): Rectangle {
  const primaryWorkArea = screen.getPrimaryDisplay().workArea
  const width = normalizeDimension(bounds?.width, DEFAULT_WINDOW_WIDTH, MIN_WINDOW_WIDTH, primaryWorkArea.width)
  const height = normalizeDimension(bounds?.height, DEFAULT_WINDOW_HEIGHT, MIN_WINDOW_HEIGHT, primaryWorkArea.height)

  if (typeof bounds?.x !== 'number' || typeof bounds.y !== 'number') {
    return { width, height, ...centerBounds(primaryWorkArea, width, height) }
  }

  const restored = { x: bounds.x, y: bounds.y, width, height }
  if (isWindowVisible(restored)) return restored

  return { width, height, ...centerBounds(primaryWorkArea, width, height) }
}

function normalizeDimension(value: number | undefined, fallback: number, min: number, max: number): number {
  const normalized = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback
  return Math.max(min, Math.min(normalized, Math.max(min, max)))
}

function centerBounds(workArea: Rectangle, width: number, height: number): Pick<Rectangle, 'x' | 'y'> {
  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2)
  }
}

function isWindowVisible(bounds: Rectangle): boolean {
  return screen.getAllDisplays().some(({ workArea }) => {
    const visibleWidth = Math.min(bounds.x + bounds.width, workArea.x + workArea.width) - Math.max(bounds.x, workArea.x)
    const visibleHeight = Math.min(bounds.y + bounds.height, workArea.y + workArea.height) - Math.max(bounds.y, workArea.y)
    return visibleWidth >= MIN_VISIBLE_WIDTH && visibleHeight >= MIN_VISIBLE_HEIGHT
  })
}

function persistBounds(win: BrowserWindow): void {
  if (win.isDestroyed() || win.isMaximized() || win.isMinimized()) return
  const bounds = win.getBounds()
  updateSettings({ windowBounds: bounds })
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.fauzulazim.mdtools')

  registerFileSystemHandlers()
  registerDialogHandlers()
  registerWindowHandlers()
  registerSettingsHandlers()
  registerWatcherHandlers()
  registerAutoUpdater()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
