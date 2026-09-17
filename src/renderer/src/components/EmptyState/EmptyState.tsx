import { FolderOpen, FileText, Clock, FilePlus2, Settings } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { basename } from '../../lib/path'

export default function EmptyState(): React.JSX.Element {
  const openWorkspace = useAppStore((s) => s.openWorkspace)
  const recentWorkspaces = useAppStore((s) => s.recentWorkspaces)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)

  const handleOpenFolder = async (): Promise<void> => {
    const path = await window.api.dialog.openFolder()
    if (path) openWorkspace(path)
  }

  return (
    <div className="flex flex-1 items-center justify-center overflow-auto px-6 py-8 text-(--color-text-muted)">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-[1fr_320px]">
        <section>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-(--color-bg-elevated)">
            <FileText size={30} className="text-(--color-accent)" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-(--color-text)">MD Tools</h1>
          <p className="mt-2 max-w-xl text-sm leading-6">
            Open a workspace, create a Markdown document, search notes, render Mermaid diagrams, and export polished previews.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={handleOpenFolder} className="flex items-center gap-2 rounded-md bg-(--color-accent) px-4 py-2 text-sm font-medium text-(--color-accent-fg) hover:opacity-90">
              <FolderOpen size={16} /> Open Folder
            </button>
            <button type="button" disabled className="flex items-center gap-2 rounded-md border border-(--color-border) bg-(--color-bg-elevated) px-4 py-2 text-sm opacity-60">
              <FilePlus2 size={16} /> New Document
            </button>
            <button type="button" onClick={() => setSettingsOpen(true)} className="flex items-center gap-2 rounded-md border border-(--color-border) bg-(--color-bg-elevated) px-4 py-2 text-sm text-(--color-text) hover:bg-(--color-bg-inset)">
              <Settings size={16} /> Settings
            </button>
          </div>
          <p className="mt-4 text-xs">Tip: press Ctrl+Shift+P for the command palette.</p>
        </section>
        <section className="min-w-0">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-(--color-text)">
            <Clock size={15} className="text-(--color-accent)" /> Recent workspaces
          </h2>
          <div className="space-y-2">
            {recentWorkspaces.length > 0 ? recentWorkspaces.slice(0, 8).map((path) => (
              <button key={path} type="button" onClick={() => openWorkspace(path)} className="block w-full rounded-md border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2 text-left hover:bg-(--color-bg-inset)">
                <span className="block truncate text-sm text-(--color-text)">{basename(path)}</span>
                <span className="block truncate text-xs">{path}</span>
              </button>
            )) : (
              <p className="rounded-md border border-(--color-border) bg-(--color-bg-elevated) px-3 py-6 text-center text-sm">No recent workspaces yet</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
