import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from './is'
import { registerFileSystemHandlers } from './ipc/fileSystem'
import { registerDialogHandlers } from './ipc/dialog'
import { registerWindowHandlers, attachWindowStateEvents } from './ipc/window'
import { registerSettingsHandlers } from './ipc/settings'
import { registerWatcherHandlers } from './watcher'
import { getSettings, updateSettings } from './settings'

function createWindow(): void {
  const { windowBounds } = getSettings()

  const mainWindow = new BrowserWindow({
    title: 'MD Tools',
    width: windowBounds?.width ?? 1280,
    height: windowBounds?.height ?? 800,
    x: windowBounds?.x,
    y: windowBounds?.y,
    minWidth: 760,
    minHeight: 480,
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

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
