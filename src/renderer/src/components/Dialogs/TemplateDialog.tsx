import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, BriefcaseBusiness, Code2, FileText, GraduationCap, LayoutTemplate, Search, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import {
  DOCUMENT_TEMPLATES,
  titleFromFileName,
  type DocumentTemplate,
  type TemplateCategory
} from '../../lib/documentTemplates'
import ConfirmDialog from '../common/ConfirmDialog'

const CATEGORY_ICONS: Record<TemplateCategory, typeof FileText> = {
  General: FileText,
  Work: BriefcaseBusiness,
  Study: GraduationCap,
  Development: Code2
}

function fileNameError(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'Enter a file name.'
  if (trimmed === '.' || trimmed === '..') return 'Choose a different file name.'
  if (/[\\/:*?"<>|]/.test(trimmed)) return 'File names cannot contain \\ / : * ? " < > or |.'
  const extension = /\.([^./\\]+)$/.exec(trimmed)?.[1]?.toLowerCase()
  if (extension && !['md', 'markdown', 'mdx', 'txt', 'json'].includes(extension)) {
    return 'New files can only be Markdown, TXT, or JSON.'
  }
  return null
}

export default function TemplateDialog(): React.JSX.Element | null {
  const dialog = useAppStore((s) => s.templateDialog)
  const setTemplateDialog = useAppStore((s) => s.setTemplateDialog)
  const createFile = useAppStore((s) => s.createFile)
  const updateTabContent = useAppStore((s) => s.updateTabContent)
  const tabs = useAppStore((s) => s.tabs)

  const [selectedId, setSelectedId] = useState('blank')
  const [query, setQuery] = useState('')
  const [fileName, setFileName] = useState('Untitled.md')
  const [fileType, setFileType] = useState<'md' | 'txt' | 'json'>('md')
  const [title, setTitle] = useState('Untitled')
  const [fileNameTouched, setFileNameTouched] = useState(false)
  const [titleTouched, setTitleTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = DOCUMENT_TEMPLATES.find((template) => template.id === selectedId) ?? DOCUMENT_TEMPLATES[0]
  const targetTab = dialog?.mode === 'replace' ? tabs.find((tab) => tab.path === dialog.path) : undefined

  useEffect(() => {
    if (!dialog) return
    const initialName = dialog.mode === 'replace' ? targetTab?.name ?? 'Untitled.md' : 'Untitled.md'
    setSelectedId('blank')
    setQuery('')
    setFileName(initialName)
    setFileType(/\.json$/i.test(initialName) ? 'json' : /\.txt$/i.test(initialName) ? 'txt' : 'md')
    setTitle(titleFromFileName(initialName))
    setFileNameTouched(false)
    setTitleTouched(false)
    setError(null)
    setWorking(false)
    setConfirmReplace(false)
    requestAnimationFrame(() => searchRef.current?.focus())
  }, [dialog, targetTab?.name])

  useEffect(() => {
    if (!dialog || confirmReplace) return
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setTemplateDialog(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [confirmReplace, dialog, setTemplateDialog])

  const visibleTemplates = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return DOCUMENT_TEMPLATES
    return DOCUMENT_TEMPLATES.filter((template) =>
      `${template.name} ${template.description} ${template.category}`.toLowerCase().includes(needle)
    )
  }, [query])

  if (!dialog) return null

  const selectTemplate = (template: DocumentTemplate): void => {
    setSelectedId(template.id)
    if (template.id !== 'blank' && dialog.mode === 'create') {
      setFileType('md')
      if (fileNameTouched) setFileName((current) => current.replace(/\.[^./\\]+$/, '.md'))
    }
    setError(null)
    if (dialog.mode === 'create' && !fileNameTouched) {
      setFileName(template.suggestedName)
      if (!titleTouched) setTitle(titleFromFileName(template.suggestedName))
    }
  }

  const selectedExtension = /\.(txt|json)$/i.exec(fileName)?.[1]?.toLowerCase()
  const content = dialog.mode === 'create' && selectedExtension === 'txt'
    ? ''
    : dialog.mode === 'create' && selectedExtension === 'json'
      ? '{}\n'
      : selected.createContent(title.trim() || titleFromFileName(fileName))

  const applyReplacement = (): void => {
    if (dialog.mode !== 'replace') return
    updateTabContent(dialog.path, content)
    setConfirmReplace(false)
    setTemplateDialog(null)
  }

  const submit = async (): Promise<void> => {
    if (dialog.mode === 'replace') {
      if (targetTab?.content.trim()) setConfirmReplace(true)
      else applyReplacement()
      return
    }

    const validationError = fileNameError(fileName)
    if (validationError) {
      setError(validationError)
      return
    }

    setWorking(true)
    setError(null)
    try {
      await createFile(dialog.dirPath, fileName.trim(), content)
      setTemplateDialog(null)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught)
      setError(message.includes('EEXIST') ? 'A file with that name already exists.' : 'Could not create the file. Check the name and try again.')
      setWorking(false)
    }
  }

  return (
    <div
      className="text-select fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setTemplateDialog(null)
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-dialog-title"
        className="flex h-[min(720px,90vh)] w-[min(900px,94vw)] flex-col overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-bg-elevated) shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-(--color-border) px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--color-accent)/12 text-(--color-accent)">
              <LayoutTemplate size={18} />
            </div>
            <div>
              <h2 id="template-dialog-title" className="font-semibold">
                {dialog.mode === 'create' ? 'Create a new document' : 'Apply a document template'}
              </h2>
              <p className="text-xs text-(--color-text-muted)">
                {dialog.mode === 'create' ? 'Choose a starting point or begin with a blank page.' : `Choose new content for ${targetTab?.name ?? 'this document'}.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close template picker"
            onClick={() => setTemplateDialog(null)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-(--color-text-muted) hover:bg-(--color-bg-inset) hover:text-(--color-text)"
          >
            <X size={16} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px] max-sm:grid-cols-1">
          <section className="flex min-h-0 flex-col border-r border-(--color-border) max-sm:border-r-0">
            <div className="relative shrink-0 p-3">
              <Search size={15} className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-(--color-text-muted)" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search templates…"
                className="h-9 w-full rounded-lg border border-(--color-border) bg-(--color-bg) pl-9 pr-3 text-sm outline-none focus:border-(--color-accent)"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
                {visibleTemplates.map((template) => {
                  const Icon = CATEGORY_ICONS[template.category]
                  const active = template.id === selectedId
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => selectTemplate(template)}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? 'border-(--color-accent) bg-(--color-accent)/10'
                          : 'border-(--color-border) bg-(--color-bg) hover:border-(--color-text-muted)'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={15} className={active ? 'text-(--color-accent)' : 'text-(--color-text-muted)'} />
                        <span className="text-sm font-medium">{template.name}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-(--color-text-muted)">{template.description}</p>
                    </button>
                  )
                })}
              </div>
              {visibleTemplates.length === 0 && (
                <p className="py-12 text-center text-sm text-(--color-text-muted)">No templates match “{query}”.</p>
              )}
            </div>
          </section>

          <aside className="flex min-h-0 flex-col bg-(--color-bg) p-4 max-sm:hidden">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-(--color-text-muted)">{selected.category}</span>
            <h3 className="mt-1 font-semibold">{selected.name}</h3>
            <p className="mt-1 text-xs leading-5 text-(--color-text-muted)">{selected.description}</p>

            {dialog.mode === 'create' && (
              <div className="mt-5">
                <span className="text-xs font-medium">File type</span>
                <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-md bg-(--color-bg-inset) p-1">
                  {(['md', 'txt', 'json'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setFileType(type)
                        setSelectedId('blank')
                        setFileName((current) => /\.[^./\\]+$/.test(current) ? current.replace(/\.[^./\\]+$/, `.${type}`) : `${current}.${type}`)
                        setFileNameTouched(true)
                        setError(null)
                      }}
                      className={`rounded px-2 py-1 text-xs uppercase ${fileType === type ? 'bg-(--color-accent) text-(--color-accent-fg)' : 'text-(--color-text-muted)'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <label className="mt-4 block text-xs font-medium">
                  File name
                  <input
                    value={fileName}
                    onChange={(event) => {
                      const value = event.target.value
                      setFileName(value)
                      setFileNameTouched(true)
                      setError(null)
                      if (/\.json$/i.test(value)) setFileType('json')
                      else if (/\.txt$/i.test(value)) setFileType('txt')
                      else if (/\.(md|markdown|mdx)$/i.test(value)) setFileType('md')
                      if (!titleTouched) setTitle(titleFromFileName(value))
                    }}
                    className="mt-1.5 h-9 w-full rounded-md border border-(--color-border) bg-(--color-bg-elevated) px-2.5 text-sm outline-none focus:border-(--color-accent)"
                  />
                </label>
              </div>
            )}

            {selected.id !== 'blank' && (
              <label className="mt-4 text-xs font-medium">
                Document title
                <input
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value)
                    setTitleTouched(true)
                  }}
                  className="mt-1.5 h-9 w-full rounded-md border border-(--color-border) bg-(--color-bg-elevated) px-2.5 text-sm outline-none focus:border-(--color-accent)"
                />
              </label>
            )}

            <div className="mt-5 min-h-0 flex-1 overflow-hidden rounded-lg border border-(--color-border) bg-(--color-bg-elevated)">
              <div className="border-b border-(--color-border) px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-(--color-text-muted)">Preview</div>
              <pre className="h-full overflow-auto whitespace-pre-wrap p-3 font-mono text-[11px] leading-5 text-(--color-text-muted)">{content || 'Empty document'}</pre>
            </div>

            {error && <p role="alert" className="mt-3 text-xs text-red-500">{error}</p>}
          </aside>
        </div>

        <footer className="flex shrink-0 items-center justify-between border-t border-(--color-border) px-5 py-3">
          <p className="flex items-center gap-1.5 text-xs text-(--color-text-muted)">
            {dialog.mode === 'replace' && <><AlertTriangle size={13} /> Existing content will be replaced after confirmation.</>}
            {dialog.mode === 'create' && `${DOCUMENT_TEMPLATES.length} templates available`}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setTemplateDialog(null)} className="rounded-md px-3 py-1.5 text-sm text-(--color-text-muted) hover:bg-(--color-bg-inset)">
              Cancel
            </button>
            <button
              type="button"
              disabled={working}
              onClick={submit}
              className="rounded-md bg-(--color-accent) px-4 py-1.5 text-sm font-medium text-(--color-accent-fg) hover:opacity-90 disabled:opacity-50"
            >
              {working ? 'Creating…' : dialog.mode === 'create' ? 'Create document' : 'Use template'}
            </button>
          </div>
        </footer>
      </div>

      {confirmReplace && (
        <ConfirmDialog
          title="Replace this document?"
          message={`All current content in “${targetTab?.name ?? 'this document'}” will be replaced with the ${selected.name} template. This cannot be undone after the file is saved.`}
          confirmLabel="Replace content"
          danger
          onConfirm={applyReplacement}
          onCancel={() => setConfirmReplace(false)}
        />
      )}
    </div>
  )
}
