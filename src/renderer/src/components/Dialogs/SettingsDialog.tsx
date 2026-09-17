import { X, Settings } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export default function SettingsDialog(): React.JSX.Element | null {
  const open = useAppStore((s) => s.settingsOpen)
  const setOpen = useAppStore((s) => s.setSettingsOpen)
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const editorMode = useAppStore((s) => s.editorMode)
  const setEditorMode = useAppStore((s) => s.setEditorMode)
  const sidebarVisible = useAppStore((s) => s.sidebarVisible)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const sidebarWidth = useAppStore((s) => s.sidebarWidth)
  const setSidebarWidth = useAppStore((s) => s.setSidebarWidth)
  const setUpdateDialogOpen = useAppStore((s) => s.setUpdateDialogOpen)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <div role="dialog" aria-label="Settings" className="flex max-h-[82vh] w-[520px] max-w-[calc(100vw-32px)] flex-col rounded-lg border border-(--color-border) bg-(--color-bg-elevated) shadow-2xl">
        <div className="flex h-12 items-center justify-between border-b border-(--color-border) px-4">
          <div className="flex items-center gap-2">
            <Settings size={17} className="text-(--color-accent)" />
            <h2 className="text-sm font-semibold">Settings</h2>
          </div>
          <button type="button" aria-label="Close settings" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-(--color-text-muted) hover:bg-(--color-bg-inset) hover:text-(--color-text)">
            <X size={15} />
          </button>
        </div>
        <div className="space-y-5 overflow-y-auto p-4 text-sm">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase text-(--color-text-muted)">Appearance</h3>
            <div className="flex gap-2">
              {(['system', 'light', 'dark'] as const).map((value) => (
                <button key={value} type="button" onClick={() => setTheme(value)} className={`rounded-md border px-3 py-1.5 capitalize ${theme === value ? 'border-(--color-accent) bg-(--color-accent) text-(--color-accent-fg)' : 'border-(--color-border) bg-(--color-bg)'}`}>
                  {value}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase text-(--color-text-muted)">Markdown editor</h3>
            <div className="flex gap-2">
              {(['edit', 'split', 'preview'] as const).map((value) => (
                <button key={value} type="button" onClick={() => setEditorMode(value)} className={`rounded-md border px-3 py-1.5 capitalize ${editorMode === value ? 'border-(--color-accent) bg-(--color-accent) text-(--color-accent-fg)' : 'border-(--color-border) bg-(--color-bg)'}`}>
                  {value === 'edit' ? 'Source' : value}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase text-(--color-text-muted)">Sidebar</h3>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={sidebarVisible} onChange={toggleSidebar} />
              Show sidebar
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs text-(--color-text-muted)">Width: {sidebarWidth}px</span>
              <input type="range" min={208} max={520} value={sidebarWidth} onChange={(event) => setSidebarWidth(Number(event.target.value))} className="w-full" />
            </label>
          </section>
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase text-(--color-text-muted)">Updates</h3>
            <button type="button" onClick={() => setUpdateDialogOpen(true)} className="rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-1.5 hover:bg-(--color-bg-inset)">
              Check update status
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
