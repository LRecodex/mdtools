import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

const THEME_CYCLE: Array<'light' | 'dark' | 'system'> = ['system', 'light', 'dark']

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handler = async (e: KeyboardEvent): Promise<void> => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const state = useAppStore.getState()

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault()
          await state.createUntitledFile()
          break
        case 'o':
          e.preventDefault()
          {
            const path = await window.api.dialog.openFolder()
            if (path) await state.openWorkspace(path)
          }
          break
        case 's':
          e.preventDefault()
          if (state.activeTabPath) await state.saveTab(state.activeTabPath)
          break
        case 'w':
          e.preventDefault()
          if (state.activeTabPath) state.requestCloseTab(state.activeTabPath)
          break
        case 'p':
          e.preventDefault()
          if (state.workspaceRoot) state.setQuickOpenOpen(!state.quickOpenOpen)
          break
        case ',':
          e.preventDefault()
          {
            const idx = THEME_CYCLE.indexOf(state.theme)
            state.setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length])
          }
          break
        case 'tab':
          if (state.tabs.length > 1) {
            e.preventDefault()
            const idx = state.tabs.findIndex((t) => t.path === state.activeTabPath)
            const delta = e.shiftKey ? -1 : 1
            const next = (idx + delta + state.tabs.length) % state.tabs.length
            state.setActiveTab(state.tabs[next].path)
          }
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
