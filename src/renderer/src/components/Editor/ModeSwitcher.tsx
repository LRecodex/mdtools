import { Pencil, Columns2, Eye } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { Settings } from '../../../../shared/types'

const MODES: { key: Settings['editorMode']; label: string; icon: typeof Pencil }[] = [
  { key: 'edit', label: 'Source', icon: Pencil },
  { key: 'split', label: 'Split', icon: Columns2 },
  { key: 'preview', label: 'Preview', icon: Eye }
]

export default function ModeSwitcher(): React.JSX.Element {
  const editorMode = useAppStore((s) => s.editorMode)
  const setEditorMode = useAppStore((s) => s.setEditorMode)

  return (
    <div className="flex items-center gap-0.5 rounded-md bg-(--color-bg-inset) p-0.5">
      {MODES.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          title={label}
          onClick={() => setEditorMode(key)}
          className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
            editorMode === key
              ? 'bg-(--color-bg) text-(--color-text) shadow-sm'
              : 'text-(--color-text-muted) hover:text-(--color-text)'
          }`}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  )
}
