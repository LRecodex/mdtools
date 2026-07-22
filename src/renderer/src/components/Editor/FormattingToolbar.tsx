import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Bold,
  Braces,
  CheckSquare,
  Code,
  Heading2,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Network,
  Quote,
  Strikethrough,
  Table
} from 'lucide-react'
import IconButton from '../common/IconButton'
import type { CodeBlockLanguage, MarkdownFormat, MermaidDiagramType } from './formatting'

interface FormattingToolbarProps {
  onFormat: (format: MarkdownFormat) => void
}

const ACTIONS: Array<{
  format: MarkdownFormat
  label: string
  icon: typeof Bold
  separator?: boolean
}> = [
  { format: 'heading', label: 'Heading', icon: Heading2 },
  { format: 'bold', label: 'Bold (Ctrl+B)', icon: Bold },
  { format: 'italic', label: 'Italic (Ctrl+I)', icon: Italic },
  { format: 'strikethrough', label: 'Strikethrough', icon: Strikethrough },
  { format: 'inlineCode', label: 'Inline code', icon: Code },
  { format: 'link', label: 'Link', icon: Link, separator: true },
  { format: 'image', label: 'Image', icon: Image },
  { format: 'quote', label: 'Blockquote', icon: Quote },
  { format: 'bulletList', label: 'Bulleted list', icon: List },
  { format: 'numberedList', label: 'Numbered list', icon: ListOrdered },
  { format: 'taskList', label: 'Task list', icon: CheckSquare },
  { format: 'table', label: 'Insert table template', icon: Table },
  { format: 'horizontalRule', label: 'Horizontal rule', icon: Minus }
]

const CODE_BLOCKS: Array<{ value: CodeBlockLanguage; label: string }> = [
  { value: 'text', label: 'Plain text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'yaml', label: 'YAML' },
  { value: 'sql', label: 'SQL' }
]

const MERMAID_DIAGRAMS: Array<{ value: MermaidDiagramType; label: string }> = [
  { value: 'flowchart', label: 'Flowchart' },
  { value: 'sequence', label: 'Sequence diagram' },
  { value: 'class', label: 'Class diagram' },
  { value: 'state', label: 'State diagram' },
  { value: 'er', label: 'Entity relationship' },
  { value: 'gantt', label: 'Gantt chart' },
  { value: 'pie', label: 'Pie chart' },
  { value: 'mindmap', label: 'Mind map' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'gitGraph', label: 'Git graph' },
  { value: 'journey', label: 'User journey' },
  { value: 'quadrant', label: 'Quadrant chart' }
]

interface ToolbarMenuProps {
  label: string
  icon: typeof Braces
  items: Array<{ label: string; format: MarkdownFormat }>
  separator?: boolean
  onFormat: (format: MarkdownFormat) => void
}

function ToolbarMenu({ label, icon: Icon, items, separator, onFormat }: ToolbarMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent): void => {
      if (!menuRef.current?.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const toggle = (): void => {
    if (!open) {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (rect) {
        setPosition({
          top: rect.bottom + 4,
          left: Math.min(rect.left, window.innerWidth - 190)
        })
      }
    }
    setOpen((value) => !value)
  }

  return (
    <div ref={buttonRef} className={`shrink-0 ${separator ? 'ml-1 border-l border-(--color-border) pl-1' : ''}`}>
      <IconButton
        label={`${label} (choose type)`}
        active={open}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggle}
        className="relative"
      >
        <Icon size={15} />
        <span className="absolute bottom-0.5 right-0.5 text-[8px] leading-none" aria-hidden="true">▾</span>
      </IconButton>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          className="fixed z-50 max-h-[min(420px,calc(100vh-60px))] w-48 overflow-y-auto rounded-lg border border-(--color-border) bg-(--color-bg-elevated) p-1 shadow-lg"
          style={position}
        >
          {items.map((item) => (
            <button
              key={item.format}
              type="button"
              role="menuitem"
              className="block w-full rounded px-3 py-1.5 text-left text-xs text-(--color-text) hover:bg-(--color-bg-inset)"
              onClick={() => {
                onFormat(item.format)
                setOpen(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

export default function FormattingToolbar({ onFormat }: FormattingToolbarProps): React.JSX.Element {
  return (
    <div
      className="markdown-toolbar flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto pr-2"
      role="toolbar"
      aria-label="Markdown formatting"
    >
      {ACTIONS.slice(0, 11).map(({ format, label, icon: Icon, separator }) => (
        <div key={format} className={`shrink-0 ${separator ? 'ml-1 border-l border-(--color-border) pl-1' : ''}`}>
          <IconButton label={label} onMouseDown={(event) => event.preventDefault()} onClick={() => onFormat(format)}>
            <Icon size={15} />
          </IconButton>
        </div>
      ))}
      <ToolbarMenu
        label="Insert code block"
        icon={Braces}
        items={CODE_BLOCKS.map(({ value, label }) => ({ label, format: `codeBlock:${value}` }))}
        separator
        onFormat={onFormat}
      />
      {ACTIONS.slice(11, 12).map(({ format, label, icon: Icon }) => (
        <div key={format} className="shrink-0">
          <IconButton label={label} onMouseDown={(event) => event.preventDefault()} onClick={() => onFormat(format)}>
            <Icon size={15} />
          </IconButton>
        </div>
      ))}
      <ToolbarMenu
        label="Insert Mermaid diagram"
        icon={Network}
        items={MERMAID_DIAGRAMS.map(({ value, label }) => ({ label, format: `mermaid:${value}` }))}
        onFormat={onFormat}
      />
      {ACTIONS.slice(12).map(({ format, label, icon: Icon }) => (
        <div key={format} className="shrink-0">
          <IconButton label={label} onMouseDown={(event) => event.preventDefault()} onClick={() => onFormat(format)}>
            <Icon size={15} />
          </IconButton>
        </div>
      ))}
    </div>
  )
}
