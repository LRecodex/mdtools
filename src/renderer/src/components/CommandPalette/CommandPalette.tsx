import { useEffect, useMemo, useState } from 'react'
import { Command, FolderOpen, Search, Settings, FilePlus2, Moon, HelpCircle, Download } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

interface PaletteCommand {
  id: string
  label: string
  detail: string
  icon: typeof Command
  disabled?: boolean
  run: () => void | Promise<void>
}

export default function CommandPalette(): React.JSX.Element | null {
  const open = useAppStore((s) => s.commandPaletteOpen)
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const workspaceRoot = useAppStore((s) => s.workspaceRoot)
  const activeTabPath = useAppStore((s) => s.activeTabPath)
  const createUntitledFile = useAppStore((s) => s.createUntitledFile)
  const setQuickOpenOpen = useAppStore((s) => s.setQuickOpenOpen)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const setUpdateDialogOpen = useAppStore((s) => s.setUpdateDialogOpen)
  const setHelpOpen = useAppStore((s) => s.setHelpOpen)
  const setTheme = useAppStore((s) => s.setTheme)
  const theme = useAppStore((s) => s.theme)
  const openWorkspace = useAppStore((s) => s.openWorkspace)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelected(0)
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, setOpen])

  const commands = useMemo<PaletteCommand[]>(() => [
    {
      id: 'open-folder',
      label: 'Open Folder',
      detail: 'Choose a workspace folder',
      icon: FolderOpen,
      run: async () => {
        const path = await window.api.dialog.openFolder()
        if (path) await openWorkspace(path)
      }
    },
    {
      id: 'new-document',
      label: 'New Document From Template',
      detail: 'Create a Markdown document',
      icon: FilePlus2,
      disabled: !workspaceRoot,
      run: createUntitledFile
    },
    {
      id: 'quick-open',
      label: 'Quick Open',
      detail: 'Search workspace files, folders, and content',
      icon: Search,
      disabled: !workspaceRoot,
      run: () => setQuickOpenOpen(true)
    },
    {
      id: 'find',
      label: 'Find In Current Document',
      detail: 'Search the active editor or preview',
      icon: Search,
      disabled: !activeTabPath,
      run: () => window.dispatchEvent(new Event('mdtools:find'))
    },
    {
      id: 'settings',
      label: 'Settings',
      detail: 'Theme, editor mode, and update preferences',
      icon: Settings,
      run: () => setSettingsOpen(true)
    },
    {
      id: 'updates',
      label: 'Check For Updates',
      detail: 'Open update status and release notes',
      icon: Download,
      run: () => setUpdateDialogOpen(true)
    },
    {
      id: 'theme',
      label: 'Cycle Theme',
      detail: `Current: ${theme}`,
      icon: Moon,
      run: () => setTheme(theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system')
    },
    {
      id: 'help',
      label: 'Help',
      detail: 'Markdown syntax, Mermaid, and shortcuts',
      icon: HelpCircle,
      run: () => setHelpOpen(true)
    }
  ], [activeTabPath, createUntitledFile, openWorkspace, setHelpOpen, setQuickOpenOpen, setSettingsOpen, setTheme, setUpdateDialogOpen, theme, workspaceRoot])

  const filtered = commands.filter((command) =>
    `${command.label} ${command.detail}`.toLowerCase().includes(query.toLowerCase())
  )
  const active = filtered[Math.min(selected, Math.max(0, filtered.length - 1))]

  if (!open) return null

  const runActive = async (): Promise<void> => {
    if (!active || active.disabled) return
    await active.run()
    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 pt-[12vh]" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <div role="dialog" aria-label="Command palette" className="w-[min(640px,calc(100vw-32px))] overflow-hidden rounded-lg border border-(--color-border) bg-(--color-bg-elevated) shadow-2xl">
        <div className="flex h-12 items-center gap-3 border-b border-(--color-border) px-4">
          <Command size={17} className="text-(--color-accent)" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setSelected(0)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setSelected((value) => Math.min(value + 1, filtered.length - 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setSelected((value) => Math.max(value - 1, 0))
              } else if (event.key === 'Enter') {
                event.preventDefault()
                void runActive()
              }
            }}
            placeholder="Type a command"
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <kbd className="rounded border border-(--color-border) bg-(--color-bg-inset) px-1.5 py-0.5 font-mono text-[11px] text-(--color-text-muted)">Esc</kbd>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-2">
          {filtered.map((command, index) => {
            const Icon = command.icon
            return (
              <button
                key={command.id}
                type="button"
                disabled={command.disabled}
                onMouseEnter={() => setSelected(index)}
                onClick={() => void runActive()}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left disabled:opacity-45 ${index === selected ? 'bg-(--color-bg-inset)' : ''}`}
              >
                <Icon size={16} className="shrink-0 text-(--color-accent)" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-(--color-text)">{command.label}</span>
                  <span className="block truncate text-xs text-(--color-text-muted)">{command.detail}</span>
                </span>
              </button>
            )
          })}
          {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-(--color-text-muted)">No commands found</p>}
        </div>
      </div>
    </div>
  )
}
