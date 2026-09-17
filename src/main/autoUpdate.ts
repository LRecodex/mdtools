import { app } from 'electron'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater

export function registerAutoUpdater(): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('error', (error) => {
    console.warn('Auto update check failed:', error)
  })

  setTimeout(() => {
    void autoUpdater.checkForUpdatesAndNotify()
  }, 5000)
}
