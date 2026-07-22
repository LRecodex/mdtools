import { create } from 'zustand'
import type { FileNode, Settings, WatchEvent } from '../../../shared/types'
import { dirname, basename } from '../lib/path'

export interface Tab {
  path: string
  name: string
  content: string
  originalContent: string
  dirty: boolean
  saving: boolean
  saveError: string | null
}

export type TemplateDialogState =
  | { mode: 'create'; dirPath: string }
  | { mode: 'replace'; path: string }

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
  sidebarVisible: boolean
  recentWorkspaces: string[]
  quickOpenOpen: boolean
  helpOpen: boolean
  templateDialog: TemplateDialogState | null
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
  createFile: (dirPath: string, name: string, content?: string) => Promise<string>
  createUntitledFile: () => Promise<void>
  createFolder: (dirPath: string, name: string) => Promise<string>
  renamePath: (oldPath: string, newName: string, isDir: boolean) => Promise<void>
  deletePath: (path: string) => Promise<void>
  setTheme: (theme: Settings['theme']) => void
  setEditorMode: (mode: Settings['editorMode']) => void
  toggleSidebar: () => void
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
  sidebarVisible: true,
  recentWorkspaces: [],
  quickOpenOpen: false,
  helpOpen: false,
  templateDialog: null,
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
      sidebarVisible: settings.sidebarVisible,
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
    const tab: Tab = { path, name: basename(path), content, originalContent: content, dirty: false, saving: false, saveError: null }
    set((state) => ({ tabs: [...state.tabs, tab], activeTabPath: path }))
  },

  setActiveTab: (path) => set({ activeTabPath: path }),

  updateTabContent: (path, content) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.path === path ? { ...t, content, dirty: content !== t.originalContent, saveError: null } : t
      )
    }))
  },

  saveTab: async (path) => {
    const tab = get().tabs.find((t) => t.path === path)
    if (!tab) return
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

  createFile: async (dirPath, name, content = '') => {
    const path = await window.api.fs.createFile(dirPath, name, content)
    await get().refreshDir(dirPath)
    await get().openFile(path)
    return path
  },

  createUntitledFile: async () => {
    const root = get().workspaceRoot
    if (!root) return
    set({ templateDialog: { mode: 'create', dirPath: root } })
  },

  createFolder: async (dirPath, name) => {
    const path = await window.api.fs.createFolder(dirPath, name)
    await get().refreshDir(dirPath)
    return path
  },

  renamePath: async (oldPath, newName, isDir) => {
    const parent = dirname(oldPath)
    const preserveMarkdownExtension = !isDir && /\.(md|markdown|mdx)$/i.test(oldPath) && !/\.[^./\\]+$/.test(newName)
    const finalName = preserveMarkdownExtension ? `${newName}.md` : newName
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
        return { ...tab, path, name: basename(path) }
      }),
      activeTabPath:
        state.activeTabPath && (state.activeTabPath === oldPath || (isDir && (state.activeTabPath.startsWith(`${oldPath}\\`) || state.activeTabPath.startsWith(`${oldPath}/`))))
          ? `${newPath}${state.activeTabPath.slice(oldPath.length)}`
          : state.activeTabPath,
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
      return { tabs, activeTabPath }
    })
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

  setQuickOpenOpen: (open) => set({ quickOpenOpen: open }),

  setHelpOpen: (open) => set({ helpOpen: open }),

  setTemplateDialog: (templateDialog) => set({ templateDialog }),

  handleWatchEvent: (event) => {
    const state = get()
    const parent = dirname(event.path)

    if (event.type === 'change') {
      const tab = state.tabs.find((t) => t.path === event.path)
      if (tab && !tab.dirty) {
        window.api.fs.readFile(event.path).then((content) => {
          set((s) => ({
            tabs: s.tabs.map((t) =>
              t.path === event.path ? { ...t, content, originalContent: content, saving: false, saveError: null } : t
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
