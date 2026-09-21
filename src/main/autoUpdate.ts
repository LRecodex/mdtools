import { app, BrowserWindow, ipcMain } from 'electron'
import electronUpdater from 'electron-updater'
import { version } from '../../package.json'
import type { UpdateStatus } from '../shared/types'

const { autoUpdater } = electronUpdater
let status: UpdateStatus = { status: 'idle', currentVersion: version }
let registered = false
let updateCheckTimer: NodeJS.Timeout | null = null
const UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 1000

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
  const checkForUpdates = async (): Promise<UpdateStatus> => {
    if (!app.isPackaged) {
      setStatus({ status: 'unsupported', currentVersion: version, message: 'Updates are available in packaged builds.' })
      return status
    }
    if (status.status === 'checking' || status.status === 'downloading' || status.status === 'downloaded') return status
    setStatus({ status: 'checking', currentVersion: version })
    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setStatus({ status: 'error', currentVersion: version, message })
    }
    return status
  }

  ipcMain.handle('update:check', checkForUpdates)
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
    void checkForUpdates()
  }, 5000)
  updateCheckTimer = setInterval(() => {
    void checkForUpdates()
  }, UPDATE_CHECK_INTERVAL_MS)
  app.on('will-quit', () => {
    if (updateCheckTimer) clearInterval(updateCheckTimer)
    updateCheckTimer = null
  })
}
