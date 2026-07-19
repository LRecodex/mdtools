import { create } from 'zustand'
import type { FileNode, Settings, WatchEvent } from '../../../shared/types'
import { dirname, basename } from '../lib/path'

export interface Tab {
  path: string
  name: string
  content: string
  originalContent: string
  dirty: boolean
}

interface AppState {
  workspaceRoot: string | null
  childrenByDir: Record<string, FileNode[]>
  expandedDirs: Set<string>
  loadingDirs: Set<string>
  tabs: Tab[]
  activeTabPath: string | null
  theme: Settings['theme']
  resolvedTheme: 'light' | 'dark'
  editorMode: Settings['editorMode']
  recentWorkspaces: string[]
  quickOpenOpen: boolean
  helpOpen: boolean
  pendingCloseTab: string | null
  bootstrapped: boolean
  cursorPosition: { line: number; col: number } | null
  setCursorPosition: (pos: { line: number; col: number } | null) => void

  bootstrap: () => Promise<void>
  openWorkspace: (path: string) => Promise<void>
  refreshDir: (dirPath: string) => Promise<void>
  toggleDir: (dirPath: string) => void
  openFile: (path: string) => Promise<void>
  setActiveTab: (path: string) => void
  updateTabContent: (path: string, content: string) => void
  saveTab: (path: string) => Promise<void>
  requestCloseTab: (path: string) => void
  confirmCloseTab: (path: string) => void
  cancelCloseTab: () => void
  createFile: (dirPath: string, name: string) => Promise<string>
  createUntitledFile: () => Promise<void>
  createFolder: (dirPath: string, name: string) => Promise<string>
  renamePath: (oldPath: string, newName: string, isDir: boolean) => Promise<void>
  deletePath: (path: string) => Promise<void>
  setTheme: (theme: Settings['theme']) => void
  setEditorMode: (mode: Settings['editorMode']) => void
  setQuickOpenOpen: (open: boolean) => void
  setHelpOpen: (open: boolean) => void
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

export const useAppStore = create<AppState>((set, get) => ({
  workspaceRoot: null,
  childrenByDir: {},
  expandedDirs: new Set(),
  loadingDirs: new Set(),
  tabs: [],
  activeTabPath: null,
  theme: 'system',
  resolvedTheme: 'light',
  editorMode: 'split',
  recentWorkspaces: [],
  quickOpenOpen: false,
  helpOpen: false,
  pendingCloseTab: null,
  bootstrapped: false,
  cursorPosition: null,
  setCursorPosition: (pos) => set({ cursorPosition: pos }),

  bootstrap: async () => {
    const settings = await window.api.settings.get()
    const resolved = computeResolvedTheme(settings.theme)
    applyThemeClass(resolved)
    set({
      theme: settings.theme,
      resolvedTheme: resolved,
      editorMode: settings.editorMode,
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
    const content = await window.api.fs.readFile(path)
    const tab: Tab = { path, name: basename(path), content, originalContent: content, dirty: false }
    set((state) => ({ tabs: [...state.tabs, tab], activeTabPath: path }))
  },

  setActiveTab: (path) => set({ activeTabPath: path }),

  updateTabContent: (path, content) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.path === path ? { ...t, content, dirty: content !== t.originalContent } : t
      )
    }))
  },

  saveTab: async (path) => {
    const tab = get().tabs.find((t) => t.path === path)
    if (!tab) return
    await window.api.fs.writeFile(path, tab.content)
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.path === path ? { ...t, originalContent: t.content, dirty: false } : t
      )
    }))
  },

  requestCloseTab: (path) => {
    const tab = get().tabs.find((t) => t.path === path)
    if (tab?.dirty) {
      set({ pendingCloseTab: path })
    } else {
      get().confirmCloseTab(path)
    }
  },

  confirmCloseTab: (path) => {
    set((state) => {
      const tabs = state.tabs.filter((t) => t.path !== path)
      let activeTabPath = state.activeTabPath
      if (activeTabPath === path) {
        const idx = state.tabs.findIndex((t) => t.path === path)
        activeTabPath = tabs[idx]?.path ?? tabs[idx - 1]?.path ?? null
      }
      return { tabs, activeTabPath, pendingCloseTab: null }
    })
  },

  cancelCloseTab: () => set({ pendingCloseTab: null }),

  createFile: async (dirPath, name) => {
    const path = await window.api.fs.createFile(dirPath, name)
    await get().refreshDir(dirPath)
    await get().openFile(path)
    return path
  },

  createUntitledFile: async () => {
    const root = get().workspaceRoot
    if (!root) return
    let name = 'Untitled.md'
    for (let n = 1; n <= 50; n++) {
      try {
        const path = await window.api.fs.createFile(root, name)
        await get().refreshDir(root)
        await get().openFile(path)
        return
      } catch {
        name = `Untitled-${n}.md`
      }
    }
  },

  createFolder: async (dirPath, name) => {
    const path = await window.api.fs.createFolder(dirPath, name)
    await get().refreshDir(dirPath)
    return path
  },

  renamePath: async (oldPath, newName, isDir) => {
    const parent = dirname(oldPath)
    const newPath = await window.api.fs.rename(oldPath, newName)
    await get().refreshDir(parent)
    if (isDir && get().childrenByDir[oldPath]) {
      await get().refreshDir(newPath)
    }
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.path === oldPath ? { ...t, path: newPath, name: basename(newPath) } : t
      ),
      activeTabPath: state.activeTabPath === oldPath ? newPath : state.activeTabPath
    }))
  },

  deletePath: async (path) => {
    const parent = dirname(path)
    await window.api.fs.delete(path)
    await get().refreshDir(parent)
    const tab = get().tabs.find((t) => t.path === path)
    if (tab) get().confirmCloseTab(path)
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

  setQuickOpenOpen: (open) => set({ quickOpenOpen: open }),

  setHelpOpen: (open) => set({ helpOpen: open }),

  handleWatchEvent: (event) => {
    const state = get()
    const parent = dirname(event.path)

    if (event.type === 'change') {
      const tab = state.tabs.find((t) => t.path === event.path)
      if (tab && !tab.dirty) {
        window.api.fs.readFile(event.path).then((content) => {
          set((s) => ({
            tabs: s.tabs.map((t) =>
              t.path === event.path ? { ...t, content, originalContent: content } : t
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
        return { childrenByDir: next }
      })
    }
  }
}))
