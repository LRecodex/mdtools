import { Sun, Moon, Monitor } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

function readingTime(text: string): string {
  const minutes = Math.max(1, Math.ceil(countWords(text) / 220))
  return `${minutes} min read`
}

const THEME_CYCLE: Array<'light' | 'dark' | 'system'> = ['system', 'light', 'dark']
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon }

export default function StatusBar(): React.JSX.Element {
  const tabs = useAppStore((s) => s.tabs)
  const activeTabPath = useAppStore((s) => s.activeTabPath)
  const cursorPosition = useAppStore((s) => s.cursorPosition)
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  const activeTab = tabs.find((t) => t.path === activeTabPath)
  const ThemeIcon = THEME_ICON[theme]

  const cycleTheme = (): void => {
    const idx = THEME_CYCLE.indexOf(theme)
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length])
  }

  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-(--color-border) bg-(--color-titlebar) px-3 text-xs text-(--color-text-muted)">
      <div className="flex items-center gap-3 truncate">
        {activeTab && <span className="truncate text-select">{activeTab.path}</span>}
        {activeTab?.saveError ? (
          <span className="shrink-0 text-red-500" title={activeTab.saveError}>Save failed</span>
        ) : activeTab?.saving ? (
          <span className="shrink-0 text-(--color-accent)">Saving…</span>
        ) : activeTab?.dirty ? (
          <span className="shrink-0">Unsaved</span>
        ) : activeTab ? (
          <span className="shrink-0">Saved</span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {activeTab && (
          <>
            <span>{countWords(activeTab.content)} words</span>
            <span>{readingTime(activeTab.content)}</span>
            <span>{activeTab.content.length} chars</span>
            {cursorPosition && (
              <span>
                Ln {cursorPosition.line}, Col {cursorPosition.col}
              </span>
            )}
          </>
        )}
        <button
          type="button"
          aria-label={`Theme: ${theme}. Click to change.`}
          title={`Theme: ${theme}. Click to change.`}
          onClick={cycleTheme}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-(--color-bg-inset) hover:text-(--color-text)"
        >
          <ThemeIcon size={12} />
        </button>
      </div>
    </div>
  )
}
