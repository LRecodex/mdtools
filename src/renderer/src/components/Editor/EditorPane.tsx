import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import EditorTabs from './EditorTabs'
import ModeSwitcher from './ModeSwitcher'
import MarkdownEditor from './MarkdownEditor'
import MarkdownPreview from './MarkdownPreview'

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

  const activeTab = tabs.find((t) => t.path === activeTabPath)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const splitContainerRef = useRef<HTMLDivElement>(null)
  const [splitRatio, setSplitRatio] = useState(0.5)
  const [isDragging, setIsDragging] = useState(false)

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
    if (!activeTab?.dirty) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveTab(activeTab.path)
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
        <>
          <div className="flex h-10 shrink-0 items-center justify-end border-b border-(--color-border) px-3">
            <ModeSwitcher />
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
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-(--color-text-muted)">
          <FileText size={28} />
          <p className="text-sm">Select a file from the sidebar to start editing</p>
        </div>
      )}
    </div>
  )
}
