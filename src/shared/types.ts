export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  isMarkdown: boolean
  kind: DocumentKind
}

export type DocumentKind =
  | 'markdown'
  | 'text'
  | 'json'
  | 'code'
  | 'csv'
  | 'image'
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'unsupported'

export interface SpreadsheetData {
  name: string
  rows: string[][]
  truncated: boolean
}

export interface OpenedDocument {
  kind: DocumentKind
  editable: boolean
  content: string
  dataUrl?: string
  html?: string
  sheets?: SpreadsheetData[]
}

const CODE_EXTENSIONS = new Set([
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'php', 'html', 'htm', 'css', 'scss', 'sass',
  'less', 'py', 'rb', 'java', 'c', 'h', 'cpp', 'cc', 'cxx', 'hpp', 'cs', 'go', 'rs',
  'swift', 'kt', 'kts', 'sh', 'bash', 'ps1', 'sql', 'xml', 'yaml', 'yml', 'toml', 'ini',
  'vue', 'svelte', 'dart', 'lua', 'r', 'gradle', 'graphql', 'gql'
])

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif'])

export function documentKind(name: string): DocumentKind {
  const match = /\.([^./\\]+)$/.exec(name.toLowerCase())
  const extension = match?.[1] ?? ''
  if (extension === 'md' || extension === 'markdown' || extension === 'mdx') return 'markdown'
  if (extension === 'txt') return 'text'
  if (extension === 'json') return 'json'
  if (extension === 'csv') return 'csv'
  if (extension === 'pdf') return 'pdf'
  if (extension === 'docx') return 'docx'
  if (extension === 'xlsx' || extension === 'xlsm') return 'xlsx'
  if (IMAGE_EXTENSIONS.has(extension)) return 'image'
  if (CODE_EXTENSIONS.has(extension)) return 'code'
  return 'unsupported'
}

export function isEditableKind(kind: DocumentKind): boolean {
  return kind === 'markdown' || kind === 'text' || kind === 'json' || kind === 'code'
}

export function isCreatableKind(kind: DocumentKind): boolean {
  return kind === 'markdown' || kind === 'text' || kind === 'json'
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  lastWorkspace: string | null
  recentWorkspaces: string[]
  windowBounds: { width: number; height: number; x?: number; y?: number } | null
  editorMode: 'edit' | 'split' | 'preview'
  sidebarVisible: boolean
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
  editorMode: 'split',
  sidebarVisible: true
}
