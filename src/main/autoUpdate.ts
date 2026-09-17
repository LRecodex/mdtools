import { app, BrowserWindow, ipcMain } from 'electron'
import electronUpdater from 'electron-updater'
import { version } from '../../package.json'
import type { UpdateStatus } from '../shared/types'

const { autoUpdater } = electronUpdater
let status: UpdateStatus = { status: 'idle', currentVersion: version }
let registered = false

function setStatus(next: UpdateStatus): void {
  status = next
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('update:status', status)
  }
}

export function registerAutoUpdater(): void {
  if (registered) return
  registered = true

  ipcMain.handle('update:getStatus', () => status)
  ipcMain.handle('update:check', async () => {
    if (!app.isPackaged) {
      setStatus({ status: 'unsupported', currentVersion: version, message: 'Updates are available in packaged builds.' })
      return status
    }
    setStatus({ status: 'checking', currentVersion: version })
    await autoUpdater.checkForUpdates()
    return status
  })
  ipcMain.handle('update:download', async () => {
    if (status.status !== 'available') return status
    setStatus({ ...status, status: 'downloading', percent: 0 })
    await autoUpdater.downloadUpdate()
    return status
  })
  ipcMain.handle('update:install', () => {
    if (status.status === 'downloaded') autoUpdater.quitAndInstall()
  })

  if (!app.isPackaged) {
    status = { status: 'unsupported', currentVersion: version, message: 'Updates are available in packaged builds.' }
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('update-available', (info) => {
    setStatus({ status: 'available', currentVersion: version, availableVersion: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    setStatus({ status: 'not-available', currentVersion: version })
  })

  autoUpdater.on('download-progress', (progress) => {
    setStatus({
      ...status,
      status: 'downloading',
      percent: Math.round(progress.percent)
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    setStatus({ status: 'downloaded', currentVersion: version, availableVersion: info.version })
  })

  autoUpdater.on('error', (error) => {
    console.warn('Auto update check failed:', error)
    setStatus({ status: 'error', currentVersion: version, message: error.message })
  })

  setTimeout(() => {
    setStatus({ status: 'checking', currentVersion: version })
    void autoUpdater.checkForUpdates().catch((error: Error) => {
      setStatus({ status: 'error', currentVersion: version, message: error.message })
    })
  }, 5000)
}
