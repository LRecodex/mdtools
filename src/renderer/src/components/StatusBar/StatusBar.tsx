import { useEffect, useMemo, useState } from 'react'
import { Sun, Moon, Monitor, Download, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { UpdateStatus } from '../../../../shared/types'

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
  const setUpdateDialogOpen = useAppStore((s) => s.setUpdateDialogOpen)

  const activeTab = tabs.find((t) => t.path === activeTabPath)
  const ThemeIcon = THEME_ICON[theme]
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)

  const cycleTheme = (): void => {
    const idx = THEME_CYCLE.indexOf(theme)
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length])
  }

  useEffect(() => {
    let mounted = true
    void window.api.update.getStatus().then((status) => {
      if (mounted) setUpdateStatus(status)
    })
    const unsubscribe = window.api.update.onStatus(setUpdateStatus)
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  const updateAction = useMemo(() => {
    if (!updateStatus || updateStatus.status === 'unsupported' || updateStatus.status === 'idle') {
      return updateStatus?.status === 'unsupported' ? null : { label: 'Check for updates', text: 'Check updates', disabled: false, icon: RefreshCw }
    }
    if (updateStatus.status === 'not-available') {
      return { label: 'Check for updates', text: 'Up to date', disabled: false, icon: RefreshCw }
    }
    if (updateStatus.status === 'checking') {
      return { label: 'Checking for updates', text: 'Checking', disabled: true, icon: RefreshCw }
    }
    if (updateStatus.status === 'available') {
      return { label: `Download MD Tools v${updateStatus.availableVersion}`, text: `Update v${updateStatus.availableVersion}`, disabled: false, icon: Download }
    }
    if (updateStatus.status === 'downloading') {
      return { label: 'Downloading update', text: `Downloading ${updateStatus.percent ?? 0}%`, disabled: true, icon: Download }
    }
    if (updateStatus.status === 'downloaded') {
      return { label: `Restart to install MD Tools v${updateStatus.availableVersion}`, text: 'Restart to update', disabled: false, icon: RefreshCw }
    }
    if (updateStatus.status === 'error') {
      return { label: updateStatus.message ?? 'Update check failed', text: 'Update failed', disabled: false, icon: RefreshCw }
    }
    return null
  }, [updateStatus])

  const handleUpdateAction = (): void => {
    setUpdateDialogOpen(true)
  }
  const UpdateIcon = updateAction?.icon

  return (
    <div className="status-bar flex h-7 min-w-0 shrink-0 items-center gap-3 border-t border-(--color-border) bg-(--color-titlebar) px-3 text-xs text-(--color-text-muted)">
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden whitespace-nowrap">
        {activeTab && <span className="min-w-0 truncate text-select" title={activeTab.path}>{activeTab.path}</span>}
        {activeTab?.saveError ? (
          <span className="shrink-0 text-red-500" title={activeTab.saveError}>Save failed</span>
        ) : activeTab?.saving ? (
          <span className="shrink-0 text-(--color-accent)">Saving…</span>
        ) : activeTab?.dirty ? (
          <span className="shrink-0">Unsaved</span>
        ) : activeTab ? (
          <span className="shrink-0">{activeTab.editable ? 'Saved' : 'Read only'}</span>
        ) : null}
      </div>
      <div className="status-metrics flex shrink-0 items-center gap-3 whitespace-nowrap tabular-nums">
        {activeTab?.editable && (
          <>
            <span>{countWords(activeTab.content)} words</span>
            <span className="status-reading">{readingTime(activeTab.content)}</span>
            <span className="status-chars">{activeTab.content.length} chars</span>
            {cursorPosition && (
              <span className="status-cursor">
                Ln {cursorPosition.line}, Col {cursorPosition.col}
              </span>
            )}
          </>
        )}
        {updateAction && (
          <button
            type="button"
            aria-label={updateAction.label}
            title={updateAction.label}
            disabled={updateAction.disabled}
            onClick={handleUpdateAction}
            className="status-update flex max-w-36 items-center gap-1 truncate rounded px-1.5 py-0.5 text-(--color-accent) hover:bg-(--color-bg-inset) hover:text-(--color-text) disabled:cursor-default disabled:text-(--color-text-muted)"
          >
            {UpdateIcon && <UpdateIcon size={12} />}
            <span className="truncate">{updateAction.text}</span>
          </button>
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
