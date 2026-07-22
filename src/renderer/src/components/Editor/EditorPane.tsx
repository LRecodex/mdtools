import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, FilePlus2, FileText, LayoutTemplate, Search } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import EditorTabs from './EditorTabs'
import ModeSwitcher from './ModeSwitcher'
import MarkdownEditor from './MarkdownEditor'
import MarkdownPreview, { renderMarkdownForExport } from './MarkdownPreview'
import FormattingToolbar from './FormattingToolbar'
import type { MarkdownEditorHandle } from './formatting'
import DocumentViewer from './DocumentViewer'

const AUTOSAVE_DELAY_MS = 800
const MIN_SPLIT_RATIO = 0.15
const MAX_SPLIT_RATIO = 0.85

export default function EditorPane(): React.JSX.Element {
  const tabs = useAppStore((s) => s.tabs)
  const activeTabPath = useAppStore((s) => s.activeTabPath)
  const editorMode = useAppStore((s) => s.editorMode)
  const updateTabContent = useAppStore((s) => s.updateTabContent)
  const saveTab = useAppStore((s) => s.saveTab)
  const setCursorPosition = useAppStore((s) => s.setCursorPosition)
  const workspaceRoot = useAppStore((s) => s.workspaceRoot)
  const setQuickOpenOpen = useAppStore((s) => s.setQuickOpenOpen)
  const setTemplateDialog = useAppStore((s) => s.setTemplateDialog)
  const resolvedTheme = useAppStore((s) => s.resolvedTheme)

  const activeTab = tabs.find((t) => t.path === activeTabPath)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const splitContainerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<MarkdownEditorHandle>(null)
  const [splitRatio, setSplitRatio] = useState(0.5)
  const [isDragging, setIsDragging] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExportPdf = async (): Promise<void> => {
    if (!activeTab || activeTab.kind !== 'markdown' || isExportingPdf) return
    setIsExportingPdf(true)
    setExportError(null)
    try {
      const html = await renderMarkdownForExport(activeTab.content, resolvedTheme)
      const title = activeTab.name.replace(/\.(md|markdown|mdx)$/i, '')
      await window.api.dialog.exportMarkdownPdf(html, title, activeTab.name, resolvedTheme)
    } catch (caught) {
      setExportError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent): void => {
      const container = splitContainerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const ratio = (e.clientX - rect.left) / rect.width
      setSplitRatio(Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, ratio)))
    }
    const handleMouseUp = (): void => setIsDragging(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
  }, [isDragging])

  useEffect(() => {
    if (!activeTab?.dirty || !activeTab.editable) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveTab(activeTab.path).catch(() => {
        // The status bar exposes the save error and the next edit retries autosave.
      })
    }, AUTOSAVE_DELAY_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [activeTab?.content, activeTab?.dirty, activeTab?.path, saveTab])

  useEffect(() => {
    return () => setCursorPosition(null)
  }, [activeTab?.path, setCursorPosition])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EditorTabs />
      {activeTab ? (
        activeTab.kind !== 'markdown' ? (
          <>
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-(--color-border) px-3">
              <span className="text-xs font-medium text-(--color-text-muted)">
                {activeTab.editable
                  ? activeTab.kind === 'json'
                    ? 'JSON editor'
                    : activeTab.kind === 'code'
                      ? 'Code editor'
                      : 'Text editor'
                  : 'Read-only preview'}
              </span>
              <span className="rounded-full bg-(--color-bg-inset) px-2 py-0.5 text-[11px] uppercase tracking-wide text-(--color-text-muted)">
                {activeTab.kind}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {activeTab.editable ? (
                <MarkdownEditor
                  path={activeTab.path}
                  value={activeTab.content}
                  documentType={activeTab.kind === 'json' ? 'json' : activeTab.kind === 'code' ? 'code' : 'text'}
                  onChange={(content) => updateTabContent(activeTab.path, content)}
                  onSaveShortcut={() => saveTab(activeTab.path)}
                  onCursorChange={setCursorPosition}
                />
              ) : (
                <DocumentViewer tab={activeTab} />
              )}
            </div>
          </>
        ) : (
        <>
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-(--color-border) px-2">
            {editorMode !== 'preview' ? (
              <FormattingToolbar onFormat={(format) => editorRef.current?.applyFormat(format)} />
            ) : (
              <span className="min-w-0 flex-1 px-1 text-xs text-(--color-text-muted)">Preview</span>
            )}
            <div className="ml-2 flex shrink-0 items-center gap-1 border-l border-(--color-border) pl-2">
              {exportError && <span className="max-w-36 truncate text-xs text-red-500" title={exportError}>Export failed</span>}
              <button
                type="button"
                disabled={isExportingPdf}
                title="Export rendered preview as PDF"
                onClick={handleExportPdf}
                className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-(--color-text-muted) hover:bg-(--color-bg-inset) hover:text-(--color-text) disabled:opacity-50"
              >
                <Download size={14} />
                {isExportingPdf ? 'Exporting…' : 'PDF'}
              </button>
              <button
                type="button"
                title="Replace content from a template (Ctrl+Shift+T)"
                onClick={() => setTemplateDialog({ mode: 'replace', path: activeTab.path })}
                className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-(--color-text-muted) hover:bg-(--color-bg-inset) hover:text-(--color-text)"
              >
                <LayoutTemplate size={14} />
                Templates
              </button>
              <ModeSwitcher />
            </div>
          </div>
          <div ref={splitContainerRef} className="flex min-h-0 flex-1">
            {editorMode !== 'preview' && (
              <div
                className="h-full min-h-0 overflow-hidden"
                style={
                  editorMode === 'split'
                    ? { width: `${splitRatio * 100}%`, flexShrink: 0 }
                    : { flex: '1 1 0%' }
                }
              >
                <MarkdownEditor
                  ref={editorRef}
                  path={activeTab.path}
                  value={activeTab.content}
                  onChange={(content) => updateTabContent(activeTab.path, content)}
                  onSaveShortcut={() => saveTab(activeTab.path)}
                  onCursorChange={setCursorPosition}
                />
              </div>
            )}
            {editorMode === 'split' && (
              <div
                onMouseDown={handleDividerMouseDown}
                className="group relative w-1 shrink-0 cursor-col-resize bg-(--color-border)"
              >
                <div
                  className={`absolute inset-y-0 -left-1.5 -right-1.5 group-hover:bg-(--color-accent)/40 ${isDragging ? 'bg-(--color-accent)/40' : ''}`}
                />
              </div>
            )}
            {editorMode !== 'edit' && (
              <div className="h-full min-h-0 flex-1 overflow-hidden">
                <MarkdownPreview content={activeTab.content} />
              </div>
            )}
          </div>
        </>
        )
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-(--color-text-muted)">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-(--color-bg-elevated)">
            <FileText size={25} className="text-(--color-accent)" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-(--color-text)">Ready for your next note</h2>
          <p className="mt-1 max-w-sm text-sm">Open an existing Markdown file, or start from one of the built-in templates.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => workspaceRoot && setTemplateDialog({ mode: 'create', dirPath: workspaceRoot })}
              className="flex items-center gap-2 rounded-md bg-(--color-accent) px-3.5 py-2 text-sm font-medium text-(--color-accent-fg) hover:opacity-90"
            >
              <FilePlus2 size={15} /> New document
            </button>
            <button
              type="button"
              onClick={() => setQuickOpenOpen(true)}
              className="flex items-center gap-2 rounded-md border border-(--color-border) bg-(--color-bg-elevated) px-3.5 py-2 text-sm text-(--color-text) hover:bg-(--color-bg-inset)"
            >
              <Search size={15} /> Open a file
            </button>
          </div>
          <p className="mt-4 text-xs">Tip: Ctrl+N creates a document · Ctrl+P quickly opens one</p>
        </div>
      )}
    </div>
  )
}
