import { ipcMain } from 'electron'
import { getSettings, updateSettings } from '../settings'
import type { Settings } from '../../shared/types'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:update', (_event, partial: Partial<Settings>) => updateSettings(partial))
}
