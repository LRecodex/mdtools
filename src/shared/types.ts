export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  isMarkdown: boolean
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  lastWorkspace: string | null
  recentWorkspaces: string[]
  windowBounds: { width: number; height: number; x?: number; y?: number } | null
  editorMode: 'edit' | 'split' | 'preview'
}

export type WatchEventType = 'add' | 'addDir' | 'unlink' | 'unlinkDir' | 'change'

export interface WatchEvent {
  type: WatchEventType
  path: string
}

export interface ExternalFileChange {
  path: string
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  lastWorkspace: null,
  recentWorkspaces: [],
  windowBounds: null,
  editorMode: 'split'
}
