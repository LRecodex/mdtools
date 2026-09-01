import { create } from 'zustand'
import { documentKind, isEditableKind, type DocumentKind, type FileNode, type Settings, type SpreadsheetData, type WatchEvent } from '../../../shared/types'
import { dirname, basename } from '../lib/path'

export interface Tab {
  path: string
  name: string
  content: string
  originalContent: string
  dirty: boolean
  saving: boolean
  saveError: string | null
  kind: DocumentKind
  editable: boolean
  dataUrl?: string
  html?: string
  sheets?: SpreadsheetData[]
}

export type TemplateDialogState =
  | { mode: 'create'; dirPath: string }
  | { mode: 'replace'; path: string }

interface AppState {
  workspaceRoot: string | null
  selectedFolderPath: string | null
  childrenByDir: Record<string, FileNode[]>
  expandedDirs: Set<string>
  loadingDirs: Set<string>
  tabs: Tab[]
  activeTabPath: string | null
  theme: Settings['theme']
  resolvedTheme: 'light' | 'dark'
  editorMode: Settings['editorMode']
  sidebarVisible: boolean
  sidebarWidth: number
  recentWorkspaces: string[]
  quickOpenOpen: boolean
  helpOpen: boolean
  templateDialog: TemplateDialogState | null
  pendingCloseTab: string | null
  pendingCloseTabs: string[]
  bootstrapped: boolean
  cursorPosition: { line: number; col: number } | null
  copiedPath: string | null
  copiedPathIsDirectory: boolean
  setCursorPosition: (pos: { line: number; col: number } | null) => void

  bootstrap: () => Promise<void>
  openWorkspace: (path: string) => Promise<void>
  refreshDir: (dirPath: string) => Promise<void>
  selectFolder: (dirPath: string) => void
  revealFolder: (dirPath: string) => void
  collapseAllFolders: () => void
  toggleDir: (dirPath: string) => void
  openFile: (path: string) => Promise<void>
  setActiveTab: (path: string) => void
  updateTabContent: (path: string, content: string) => void
  saveTab: (path: string) => Promise<void>
  requestCloseTab: (path: string) => void
  requestCloseTabs: (paths: string[]) => void
  confirmCloseTab: (path: string) => void
  cancelCloseTab: () => void
  createFile: (dirPath: string, name: string, content?: string) => Promise<string>
  createUntitledFile: () => Promise<void>
  createFolder: (dirPath: string, name: string) => Promise<string>
  renamePath: (oldPath: string, newName: string, isDir: boolean) => Promise<void>
  deletePath: (path: string) => Promise<void>
  copyPath: (path: string, isDirectory: boolean) => void
  pastePath: (destinationDir: string) => Promise<string | null>
  setTheme: (theme: Settings['theme']) => void
  setEditorMode: (mode: Settings['editorMode']) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setQuickOpenOpen: (open: boolean) => void
  setHelpOpen: (open: boolean) => void
  setTemplateDialog: (dialog: TemplateDialogState | null) => void
  handleWatchEvent: (event: WatchEvent) => void
}

function computeResolvedTheme(theme: Settings['theme']): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

function applyThemeClass(resolved: 'light' | 'dark'): void {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

function nextActiveTabPath(tabs: Tab[], closingPaths: Set<string>, activeTabPath: string | null): string | null {
  const remaining = tabs.filter((tab) => !closingPaths.has(tab.path))
  if (remaining.length === 0) return null
  if (activeTabPath && !closingPaths.has(activeTabPath)) return activeTabPath

  const activeIndex = activeTabPath ? tabs.findIndex((tab) => tab.path === activeTabPath) : -1
  const fallbackIndex = activeIndex >= 0 ? activeIndex : tabs.length - 1
  return remaining[Math.min(fallbackIndex, remaining.length - 1)]?.path ?? remaining.at(-1)?.path ?? null
}

function closeTabPaths(state: AppState, paths: string[]): Pick<AppState, 'tabs' | 'activeTabPath'> {
  const closingPaths = new Set(paths)
  return {
    tabs: state.tabs.filter((tab) => !closingPaths.has(tab.path)),
    activeTabPath: nextActiveTabPath(state.tabs, closingPaths, state.activeTabPath)
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  workspaceRoot: null,
  selectedFolderPath: null,
  childrenByDir: {},
  expandedDirs: new Set(),
  loadingDirs: new Set(),
  tabs: [],
  activeTabPath: null,
  theme: 'system',
  resolvedTheme: 'light',
  editorMode: 'split',
  sidebarVisible: true,
  sidebarWidth: 256,
  recentWorkspaces: [],
  quickOpenOpen: false,
  helpOpen: false,
  templateDialog: null,
  pendingCloseTab: null,
  pendingCloseTabs: [],
  bootstrapped: false,
  cursorPosition: null,
  copiedPath: null,
  copiedPathIsDirectory: false,
  setCursorPosition: (pos) => set({ cursorPosition: pos }),

  bootstrap: async () => {
    const settings = await window.api.settings.get()
    const resolved = computeResolvedTheme(settings.theme)
    applyThemeClass(resolved)
    set({
      theme: settings.theme,
      resolvedTheme: resolved,
      editorMode: settings.editorMode,
      sidebarVisible: settings.sidebarVisible,
      sidebarWidth: settings.sidebarWidth,
      recentWorkspaces: settings.recentWorkspaces,
      bootstrapped: true
    })

    window.api.watcher.onEvent((event) => get().handleWatchEvent(event))

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', () => {
      if (get().theme === 'system') {
        const next = computeResolvedTheme('system')
        applyThemeClass(next)
        set({ resolvedTheme: next })
      }
    })

    if (settings.lastWorkspace && (await window.api.fs.exists(settings.lastWorkspace))) {
      await get().openWorkspace(settings.lastWorkspace)
    }
  },

  openWorkspace: async (path) => {
    const children = await window.api.fs.readDir(path)
    set({
      workspaceRoot: path,
      selectedFolderPath: path,
      childrenByDir: { [path]: children },
      expandedDirs: new Set([path]),
      tabs: [],
      activeTabPath: null
    })
    await window.api.watcher.start(path)
    await window.api.settings.update({ lastWorkspace: path })
    const settings = await window.api.settings.get()
    set({ recentWorkspaces: settings.recentWorkspaces })
  },

  refreshDir: async (dirPath) => {
    const loading = new Set(get().loadingDirs)
    loading.add(dirPath)
    set({ loadingDirs: loading })
    try {
      const children = await window.api.fs.readDir(dirPath)
      set((state) => ({ childrenByDir: { ...state.childrenByDir, [dirPath]: children } }))
    } finally {
      const done = new Set(get().loadingDirs)
      done.delete(dirPath)
      set({ loadingDirs: done })
    }
  },

  selectFolder: (dirPath) => set({ selectedFolderPath: dirPath }),

  revealFolder: (dirPath) => {
    const expanded = new Set(get().expandedDirs)
    expanded.add(dirPath)
    set({ expandedDirs: expanded, selectedFolderPath: dirPath })
    if (!get().childrenByDir[dirPath]) get().refreshDir(dirPath)
  },

  collapseAllFolders: () => {
    const root = get().workspaceRoot
    set({
      expandedDirs: root ? new Set([root]) : new Set(),
      selectedFolderPath: root
    })
  },

  toggleDir: (dirPath) => {
    const expanded = new Set(get().expandedDirs)
    if (expanded.has(dirPath)) {
      expanded.delete(dirPath)
      set({ expandedDirs: expanded })
    } else {
      expanded.add(dirPath)
      set({ expandedDirs: expanded })
      if (!get().childrenByDir[dirPath]) {
        get().refreshDir(dirPath)
      }
    }
  },

  openFile: async (path) => {
    const existing = get().tabs.find((t) => t.path === path)
    if (existing) {
      set({ activeTabPath: path })
      return
    }
    const document = await window.api.fs.openDocument(path)
    const tab: Tab = {
      path,
      name: basename(path),
      content: document.content,
      originalContent: document.content,
      dirty: false,
      saving: false,
      saveError: null,
      kind: document.kind,
      editable: document.editable,
      dataUrl: document.dataUrl,
      html: document.html,
      sheets: document.sheets
    }
    set((state) => ({ tabs: [...state.tabs, tab], activeTabPath: path }))
  },

  setActiveTab: (path) => set({ activeTabPath: path }),

  updateTabContent: (path, content) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.path === path && t.editable ? { ...t, content, dirty: content !== t.originalContent, saveError: null } : t
      )
    }))
  },

  saveTab: async (path) => {
    const tab = get().tabs.find((t) => t.path === path)
    if (!tab || !tab.editable) return
    const contentToSave = tab.content
    set((state) => ({
      tabs: state.tabs.map((item) => item.path === path ? { ...item, saving: true, saveError: null } : item)
    }))
    try {
      await window.api.fs.writeFile(path, contentToSave)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught)
      set((state) => ({
        tabs: state.tabs.map((item) => item.path === path ? { ...item, saving: false, saveError: message } : item)
      }))
      throw caught
    }
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.path === path
          ? { ...t, originalContent: contentToSave, dirty: t.content !== contentToSave, saving: false, saveError: null }
          : t
      )
    }))
  },

  requestCloseTab: (path) => {
    get().requestCloseTabs([path])
  },

  requestCloseTabs: (paths) => {
    const uniquePaths = [...new Set(paths)].filter((path) => get().tabs.some((tab) => tab.path === path))
    if (uniquePaths.length === 0) return

    const dirtyPaths = uniquePaths.filter((path) => get().tabs.find((tab) => tab.path === path)?.dirty)
    const cleanPaths = uniquePaths.filter((path) => !dirtyPaths.includes(path))

    if (cleanPaths.length > 0) {
      set((state) => closeTabPaths(state, cleanPaths))
    }

    const [pendingCloseTab, ...pendingCloseTabs] = dirtyPaths
    if (pendingCloseTab) {
      set({ pendingCloseTab, pendingCloseTabs })
    }
  },

  confirmCloseTab: (path) => {
    const queuedTabs = get().pendingCloseTabs
    const nextPending = queuedTabs.find((queuedPath) => queuedPath !== path) ?? null
    const nextQueue = queuedTabs.filter((queuedPath) => queuedPath !== path && queuedPath !== nextPending)
    set((state) => ({
      ...closeTabPaths(state, [path]),
      pendingCloseTab: nextPending,
      pendingCloseTabs: nextQueue
    }))
  },

  cancelCloseTab: () => set({ pendingCloseTab: null, pendingCloseTabs: [] }),

  createFile: async (dirPath, name, content = '') => {
    const path = await window.api.fs.createFile(dirPath, name, content)
    await get().refreshDir(dirPath)
    await get().openFile(path)
    return path
  },

  createUntitledFile: async () => {
    const target = get().selectedFolderPath ?? get().workspaceRoot
    if (!target) return
    set({ templateDialog: { mode: 'create', dirPath: target } })
  },

  createFolder: async (dirPath, name) => {
    const path = await window.api.fs.createFolder(dirPath, name)
    await get().refreshDir(dirPath)
    const expanded = new Set(get().expandedDirs)
    expanded.add(dirPath)
    expanded.add(path)
    set({ expandedDirs: expanded, selectedFolderPath: path })
    return path
  },

  renamePath: async (oldPath, newName, isDir) => {
    const parent = dirname(oldPath)
    const oldKind = documentKind(oldPath)
    const preserveExtension = !isDir && isEditableKind(oldKind) && !/\.[^./\\]+$/.test(newName)
    const oldExtension = /\.([^./\\]+)$/.exec(oldPath)?.[1] ?? 'md'
    const finalName = preserveExtension ? `${newName}.${oldExtension}` : newName
    const hadLoadedChildren = Boolean(get().childrenByDir[oldPath])
    const newPath = await window.api.fs.rename(oldPath, finalName)
    await get().refreshDir(parent)
    if (isDir && hadLoadedChildren) {
      await get().refreshDir(newPath)
    }
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        const affected = tab.path === oldPath || (isDir && (tab.path.startsWith(`${oldPath}\\`) || tab.path.startsWith(`${oldPath}/`)))
        if (!affected) return tab
        const path = `${newPath}${tab.path.slice(oldPath.length)}`
        const kind = documentKind(path)
        return { ...tab, path, name: basename(path), kind, editable: isEditableKind(kind) }
      }),
      activeTabPath:
        state.activeTabPath && (state.activeTabPath === oldPath || (isDir && (state.activeTabPath.startsWith(`${oldPath}\\`) || state.activeTabPath.startsWith(`${oldPath}/`))))
          ? `${newPath}${state.activeTabPath.slice(oldPath.length)}`
          : state.activeTabPath,
      selectedFolderPath:
        state.selectedFolderPath && (state.selectedFolderPath === oldPath || (isDir && (state.selectedFolderPath.startsWith(`${oldPath}\\`) || state.selectedFolderPath.startsWith(`${oldPath}/`))))
          ? `${newPath}${state.selectedFolderPath.slice(oldPath.length)}`
          : state.selectedFolderPath,
      childrenByDir: isDir
        ? Object.fromEntries(Object.entries(state.childrenByDir).filter(([path]) => path !== oldPath && !path.startsWith(`${oldPath}\\`) && !path.startsWith(`${oldPath}/`)))
        : state.childrenByDir,
      expandedDirs: isDir
        ? new Set([...state.expandedDirs].map((path) => path === oldPath || path.startsWith(`${oldPath}\\`) || path.startsWith(`${oldPath}/`) ? `${newPath}${path.slice(oldPath.length)}` : path))
        : state.expandedDirs
    }))
  },

  deletePath: async (path) => {
    const parent = dirname(path)
    await window.api.fs.delete(path)
    await get().refreshDir(parent)
    set((state) => {
      const removed = (tabPath: string): boolean => tabPath === path || tabPath.startsWith(`${path}\\`) || tabPath.startsWith(`${path}/`)
      const tabs = state.tabs.filter((tab) => !removed(tab.path))
      const activeTabPath = state.activeTabPath && removed(state.activeTabPath)
        ? tabs.at(-1)?.path ?? null
        : state.activeTabPath
      const selectedFolderPath = state.selectedFolderPath && removed(state.selectedFolderPath)
        ? (parent.startsWith(state.workspaceRoot ?? '') ? parent : state.workspaceRoot)
        : state.selectedFolderPath
      return { tabs, activeTabPath, selectedFolderPath }
    })
  },

  copyPath: (path, isDirectory) => set({ copiedPath: path, copiedPathIsDirectory: isDirectory }),

  pastePath: async (destinationDir) => {
    const sourcePath = get().copiedPath
    if (!sourcePath) return null
    const target = await window.api.fs.copy(sourcePath, destinationDir)
    await get().refreshDir(destinationDir)
    if (get().copiedPathIsDirectory) {
      const expanded = new Set(get().expandedDirs)
      expanded.add(destinationDir)
      set({ expandedDirs: expanded })
    }
    return target
  },

  setTheme: (theme) => {
    const resolved = computeResolvedTheme(theme)
    applyThemeClass(resolved)
    set({ theme, resolvedTheme: resolved })
    window.api.settings.update({ theme })
  },

  setEditorMode: (mode) => {
    set({ editorMode: mode })
    window.api.settings.update({ editorMode: mode })
  },

  toggleSidebar: () => {
    const sidebarVisible = !get().sidebarVisible
    set({ sidebarVisible })
    window.api.settings.update({ sidebarVisible })
  },

  setSidebarWidth: (width) => {
    const sidebarWidth = Math.round(Math.min(520, Math.max(208, width)))
    set({ sidebarWidth })
    window.api.settings.update({ sidebarWidth })
  },

  setQuickOpenOpen: (open) => set({ quickOpenOpen: open }),

  setHelpOpen: (open) => set({ helpOpen: open }),

  setTemplateDialog: (templateDialog) => set({ templateDialog }),

  handleWatchEvent: (event) => {
    const state = get()
    const parent = dirname(event.path)

    if (event.type === 'change') {
      const tab = state.tabs.find((t) => t.path === event.path)
      if (tab && !tab.dirty) {
        window.api.fs.openDocument(event.path).then((document) => {
          set((s) => ({
            tabs: s.tabs.map((t) =>
              t.path === event.path ? {
                ...t,
                content: document.content,
                originalContent: document.content,
                kind: document.kind,
                editable: document.editable,
                dataUrl: document.dataUrl,
                html: document.html,
                sheets: document.sheets,
                saving: false,
                saveError: null
              } : t
            )
          }))
        })
      }
      return
    }

    if (state.childrenByDir[parent] || parent === state.workspaceRoot) {
      get().refreshDir(parent)
    }
    if ((event.type === 'unlinkDir' || event.type === 'unlink') && state.childrenByDir[event.path]) {
      set((s) => {
        const next = { ...s.childrenByDir }
        delete next[event.path]
        const selectedFolderPath = s.selectedFolderPath && (
          s.selectedFolderPath === event.path ||
          s.selectedFolderPath.startsWith(`${event.path}\\`) ||
          s.selectedFolderPath.startsWith(`${event.path}/`)
        )
          ? (parent.startsWith(s.workspaceRoot ?? '') ? parent : s.workspaceRoot)
          : s.selectedFolderPath
        return { childrenByDir: next, selectedFolderPath }
      })
    }
  }
}))
