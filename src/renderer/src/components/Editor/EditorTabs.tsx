import { useState } from 'react'
import { Copy, FolderOpen, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import ContextMenu, { type ContextMenuItem } from '../common/ContextMenu'

export default function EditorTabs(): React.JSX.Element {
  const tabs = useAppStore((s) => s.tabs)
  const activeTabPath = useAppStore((s) => s.activeTabPath)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const requestCloseTab = useAppStore((s) => s.requestCloseTab)
  const requestCloseTabs = useAppStore((s) => s.requestCloseTabs)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null)

  if (tabs.length === 0) {
    return <div className="h-9 shrink-0 border-b border-(--color-border)" />
  }

  const contextTab = tabs.find((tab) => tab.path === contextMenu?.path)
  const contextTabIndex = contextTab ? tabs.findIndex((tab) => tab.path === contextTab.path) : -1
  const savedTabs = tabs.filter((tab) => !tab.dirty)
  const tabsToRight = contextTabIndex >= 0 ? tabs.slice(contextTabIndex + 1) : []
  const otherTabs = contextTab ? tabs.filter((tab) => tab.path !== contextTab.path) : []

  const menuItems: ContextMenuItem[] = contextTab
    ? [
        {
          label: 'Close Tab',
          onSelect: () => requestCloseTab(contextTab.path)
        },
        {
          label: 'Close Others',
          disabled: otherTabs.length === 0,
          onSelect: () => requestCloseTabs(otherTabs.map((tab) => tab.path))
        },
        {
          label: 'Close Tabs to Right',
          disabled: tabsToRight.length === 0,
          onSelect: () => requestCloseTabs(tabsToRight.map((tab) => tab.path))
        },
        {
          label: 'Close Saved Tabs',
          disabled: savedTabs.length === 0,
          onSelect: () => requestCloseTabs(savedTabs.map((tab) => tab.path))
        },
        {
          label: 'Close All',
          danger: true,
          onSelect: () => requestCloseTabs(tabs.map((tab) => tab.path))
        },
        {
          label: 'Copy File Path',
          separatorBefore: true,
          onSelect: () => window.api.clipboard.writeText(contextTab.path)
        },
        {
          label: 'Reveal in Explorer',
          onSelect: () => window.api.dialog.showItemInFolder(contextTab.path)
        }
      ]
    : []

  return (
    <>
      <div className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-(--color-border) bg-(--color-bg-elevated)">
        {tabs.map((tab) => {
          const active = tab.path === activeTabPath
          return (
            <div
              key={tab.path}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveTab(tab.path)}
              onContextMenu={(event) => {
                event.preventDefault()
                setActiveTab(tab.path)
                setContextMenu({ x: event.clientX, y: event.clientY, path: tab.path })
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setActiveTab(tab.path)
                }
              }}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault()
                  requestCloseTab(tab.path)
                }
              }}
              title={tab.path}
              className={`group flex max-w-64 min-w-32 cursor-pointer items-center gap-2 border-r border-(--color-border) px-3 text-sm ${
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
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems}
          onClose={() => setContextMenu(null)}
          renderIcon={(item) => {
            if (item.label === 'Copy File Path') return <Copy size={13} />
            if (item.label === 'Reveal in Explorer') return <FolderOpen size={13} />
            return null
          }}
        />
      )}
    </>
  )
}
