import { X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export default function EditorTabs(): React.JSX.Element {
  const tabs = useAppStore((s) => s.tabs)
  const activeTabPath = useAppStore((s) => s.activeTabPath)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const requestCloseTab = useAppStore((s) => s.requestCloseTab)

  if (tabs.length === 0) {
    return <div className="h-9 shrink-0 border-b border-(--color-border)" />
  }

  return (
    <div className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-(--color-border) bg-(--color-bg-elevated)">
      {tabs.map((tab) => {
        const active = tab.path === activeTabPath
        return (
          <div
            key={tab.path}
            role="tab"
            aria-selected={active}
            onClick={() => setActiveTab(tab.path)}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault()
                requestCloseTab(tab.path)
              }
            }}
            title={tab.path}
            className={`group flex max-w-48 min-w-28 cursor-pointer items-center gap-2 border-r border-(--color-border) px-3 text-sm ${
              active
                ? 'bg-(--color-bg) text-(--color-text)'
                : 'text-(--color-text-muted) hover:bg-(--color-bg-inset)'
            }`}
          >
            <span className="truncate">{tab.name}</span>
            <span className="relative ml-auto flex h-4 w-4 shrink-0 items-center justify-center">
              {tab.dirty && (
                <span className="h-2 w-2 rounded-full bg-(--color-accent) group-hover:opacity-0" />
              )}
              <button
                type="button"
                aria-label={`Close ${tab.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  requestCloseTab(tab.path)
                }}
                className={`absolute inset-0 flex items-center justify-center rounded hover:bg-(--color-border) ${
                  tab.dirty ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                }`}
              >
                <X size={12} />
              </button>
            </span>
          </div>
        )
      })}
    </div>
  )
}
