import { useEffect, useState } from 'react'
import { Minus, Square, Copy, X, FileText } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { basename } from '../../lib/path'

export default function TitleBar(): React.JSX.Element {
  const [maximized, setMaximized] = useState(false)
  const workspaceRoot = useAppStore((s) => s.workspaceRoot)
  const activeTabPath = useAppStore((s) => s.activeTabPath)
  const dirty = useAppStore((s) => s.tabs.find((t) => t.path === activeTabPath)?.dirty)

  useEffect(() => {
    window.api.win.isMaximized().then(setMaximized)
    return window.api.win.onStateChanged(setMaximized)
  }, [])

  const title = activeTabPath
    ? `${dirty ? '● ' : ''}${basename(activeTabPath)}`
    : workspaceRoot
      ? basename(workspaceRoot)
      : 'MD Tools'

  return (
    <div className="app-region-drag flex h-9 shrink-0 items-center justify-between border-b border-(--color-border) bg-(--color-titlebar) pl-3 text-sm">
      <div className="flex items-center gap-2 text-(--color-text-muted)">
        <FileText size={15} className="text-(--color-accent)" />
        <span className="select-none">{title}</span>
      </div>
      <div className="flex h-full">
        <button
          type="button"
          aria-label="Minimize"
          className="app-region-no-drag flex h-full w-12 items-center justify-center text-(--color-text-muted) hover:bg-(--color-bg-inset) hover:text-(--color-text)"
          onClick={() => window.api.win.minimize()}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          aria-label={maximized ? 'Restore' : 'Maximize'}
          className="app-region-no-drag flex h-full w-12 items-center justify-center text-(--color-text-muted) hover:bg-(--color-bg-inset) hover:text-(--color-text)"
          onClick={() => window.api.win.maximizeToggle()}
        >
          {maximized ? <Copy size={13} /> : <Square size={13} />}
        </button>
        <button
          type="button"
          aria-label="Close"
          className="app-region-no-drag flex h-full w-12 items-center justify-center text-(--color-text-muted) hover:bg-red-600 hover:text-white"
          onClick={() => window.api.win.close()}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
