import { FolderOpen, FileText } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export default function EmptyState(): React.JSX.Element {
  const openWorkspace = useAppStore((s) => s.openWorkspace)

  const handleOpenFolder = async (): Promise<void> => {
    const path = await window.api.dialog.openFolder()
    if (path) openWorkspace(path)
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-(--color-text-muted)">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-(--color-bg-elevated)">
        <FileText size={30} className="text-(--color-accent)" />
      </div>
      <p className="text-sm">Open a folder to browse and edit Markdown files</p>
      <button
        type="button"
        onClick={handleOpenFolder}
        className="mt-1 flex items-center gap-2 rounded-md bg-(--color-accent) px-4 py-2 text-sm font-medium text-(--color-accent-fg) hover:opacity-90"
      >
        <FolderOpen size={16} />
        Open Folder
      </button>
    </div>
  )
}
