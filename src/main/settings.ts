import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { DEFAULT_SETTINGS, type Settings } from '../shared/types'

const settingsPath = (): string => join(app.getPath('userData'), 'settings.json')

let cache: Settings | null = null

function load(): Settings {
  if (cache) return cache
  let loaded: Settings
  try {
    const raw = readFileSync(settingsPath(), 'utf-8')
    loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    loaded = { ...DEFAULT_SETTINGS }
  }
  cache = loaded
  return loaded
}

function persist(): void {
  if (!cache) return
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(settingsPath(), JSON.stringify(cache, null, 2), 'utf-8')
}

export function getSettings(): Settings {
  return load()
}

export function updateSettings(partial: Partial<Settings>): Settings {
  const current = load()
  cache = { ...current, ...partial }
  persist()
  return cache
}

export function pushRecentWorkspace(path: string): void {
  const current = load()
  const recent = [path, ...current.recentWorkspaces.filter((p) => p !== path)].slice(0, 8)
  updateSettings({ lastWorkspace: path, recentWorkspaces: recent })
}
