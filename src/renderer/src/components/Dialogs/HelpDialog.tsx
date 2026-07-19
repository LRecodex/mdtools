import { useEffect } from 'react'
import {
  FolderOpen,
  Files,
  Columns2,
  Search,
  Save,
  Palette,
  X,
  FileText
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

const FEATURES: { icon: typeof FolderOpen; title: string; description: string }[] = [
  {
    icon: FolderOpen,
    title: 'Workspace browsing',
    description: 'Open a folder and browse, create, rename, and delete files and folders in the sidebar.'
  },
  {
    icon: Files,
    title: 'Tabs',
    description: 'Work on multiple files at once, with an unsaved-changes prompt before closing a dirty tab.'
  },
  {
    icon: Columns2,
    title: 'Source, Split & Preview',
    description: 'Switch between a raw markdown editor, a live side-by-side split view, or a rendered preview.'
  },
  {
    icon: Search,
    title: 'Quick Open',
    description: 'Press Ctrl+P to fuzzy-search and jump to any file in the workspace.'
  },
  {
    icon: Save,
    title: 'Autosave',
    description: 'Changes are saved automatically shortly after you stop typing, or instantly with Ctrl+S.'
  },
  {
    icon: Palette,
    title: 'Themes',
    description: 'Cycle between system, light, and dark themes from the status bar or with Ctrl+,.'
  }
]

const MARKDOWN_EXAMPLE = `# Heading
**bold**, *italic*, \`inline code\`

- [ ] todo item
- [x] done item

| Col A | Col B |
| ----- | ----- |
| 1     | 2     |

\`\`\`js
console.log('syntax highlighted')
\`\`\``

const MERMAID_EXAMPLE = `\`\`\`mermaid
graph TD
  A[Start] --> B{Is it working?}
  B -->|Yes| C[Ship it]
  B -->|No| D[Debug]
\`\`\``

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl+N', action: 'New file' },
  { keys: 'Ctrl+O', action: 'Open folder' },
  { keys: 'Ctrl+S', action: 'Save current file' },
  { keys: 'Ctrl+W', action: 'Close current tab' },
  { keys: 'Ctrl+P', action: 'Quick Open' },
  { keys: 'Ctrl+Tab', action: 'Next tab' },
  { keys: 'Ctrl+Shift+Tab', action: 'Previous tab' },
  { keys: 'Ctrl+,', action: 'Cycle theme' },
  { keys: 'Ctrl+/', action: 'Toggle this help' }
]

export default function HelpDialog(): React.JSX.Element | null {
  const helpOpen = useAppStore((s) => s.helpOpen)
  const setHelpOpen = useAppStore((s) => s.setHelpOpen)

  useEffect(() => {
    if (!helpOpen) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setHelpOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [helpOpen, setHelpOpen])

  if (!helpOpen) return null

  return (
    <div
      className="text-select fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setHelpOpen(false)
      }}
    >
      <div className="flex max-h-[80vh] w-[520px] flex-col rounded-xl border border-(--color-border) bg-(--color-bg-elevated) shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-(--color-border) px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-(--color-accent)" />
            <h2 className="text-base font-semibold">MD Tools</h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setHelpOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) hover:bg-(--color-bg-inset) hover:text-(--color-text)"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm text-(--color-text-muted)">
            A fast, polished desktop app for browsing, viewing, and authoring Markdown files.
          </p>

          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
            Features
          </h3>
          <ul className="mt-2 space-y-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-(--color-bg-inset) text-(--color-accent)">
                  <Icon size={14} />
                </div>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-sm text-(--color-text-muted)">{description}</p>
                </div>
              </li>
            ))}
          </ul>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
            Markdown syntax
          </h3>
          <p className="mt-2 text-sm text-(--color-text-muted)">
            Headings, bold/italic, links, task lists, tables, and fenced code blocks are all
            supported, with syntax highlighting for JS/TS, Python, Bash, JSON, HTML, CSS, YAML,
            C++, Java, and SQL.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-md border border-(--color-border) bg-(--color-bg-inset) p-3 text-xs">
            <code>{MARKDOWN_EXAMPLE}</code>
          </pre>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
            Mermaid diagrams
          </h3>
          <p className="mt-2 text-sm text-(--color-text-muted)">
            Fence a code block with <code className="rounded bg-(--color-bg-inset) px-1 py-0.5">mermaid</code> to
            render flowcharts, sequence diagrams, Gantt charts, and more directly in the preview.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-md border border-(--color-border) bg-(--color-bg-inset) p-3 text-xs">
            <code>{MERMAID_EXAMPLE}</code>
          </pre>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
            Keyboard shortcuts
          </h3>
          <ul className="mt-2 space-y-1.5">
            {SHORTCUTS.map(({ keys, action }) => (
              <li key={keys} className="flex items-center justify-between text-sm">
                <span className="text-(--color-text-muted)">{action}</span>
                <kbd className="rounded border border-(--color-border) bg-(--color-bg-inset) px-1.5 py-0.5 font-mono text-xs">
                  {keys}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
