import { useEffect, useRef, useState } from 'react'
import { FileDown, X } from 'lucide-react'
import { useAppStore } from './store/useAppStore'
import TitleBar from './components/TitleBar/TitleBar'
import Sidebar from './components/Sidebar/Sidebar'
import EditorPane from './components/Editor/EditorPane'
import StatusBar from './components/StatusBar/StatusBar'
import QuickOpen from './components/QuickOpen/QuickOpen'
import UnsavedChangesDialog from './components/Dialogs/UnsavedChangesDialog'
import HelpDialog from './components/Dialogs/HelpDialog'
import TemplateDialog from './components/Dialogs/TemplateDialog'
import SettingsDialog from './components/Dialogs/SettingsDialog'
import UpdateDialog from './components/Dialogs/UpdateDialog'
import CommandPalette from './components/CommandPalette/CommandPalette'
import EmptyState from './components/EmptyState/EmptyState'
import TerminalPanel from './components/Terminal/TerminalPanel'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { documentKind } from '../../shared/types'

export default function App(): React.JSX.Element {
  const bootstrap = useAppStore((s) => s.bootstrap)
  const bootstrapped = useAppStore((s) => s.bootstrapped)
  const workspaceRoot = useAppStore((s) => s.workspaceRoot)
  const sidebarVisible = useAppStore((s) => s.sidebarVisible)
  const tabs = useAppStore((s) => s.tabs)
  const terminalVisible = useAppStore((s) => s.terminalVisible)
  const openFile = useAppStore((s) => s.openFile)
  const dragDepth = useRef(0)
  const [isFileDragActive, setIsFileDragActive] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  useEffect(() => {
    const containsFiles = (event: DragEvent): boolean =>
      Array.from(event.dataTransfer?.types ?? []).includes('Files')

    const handleDragEnter = (event: DragEvent): void => {
      if (!containsFiles(event)) return
      event.preventDefault()
      dragDepth.current += 1
      setIsFileDragActive(true)
    }

    const handleDragOver = (event: DragEvent): void => {
      if (!containsFiles(event)) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    }

    const handleDragLeave = (event: DragEvent): void => {
      if (!containsFiles(event)) return
      event.preventDefault()
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setIsFileDragActive(false)
    }

    const handleDrop = async (event: DragEvent): Promise<void> => {
      if (!containsFiles(event)) return
      event.preventDefault()
      dragDepth.current = 0
      setIsFileDragActive(false)

      const droppedPaths = Array.from(event.dataTransfer?.files ?? [])
        .map((file) => window.api.fs.getPathForFile(file))
        .filter((path) => path && documentKind(path) === 'markdown')

      if (droppedPaths.length === 0) {
        setDropError('Drop a Markdown file (.md, .markdown, or .mdx).')
        return
      }

      setDropError(null)
      try {
        for (const path of droppedPaths) await openFile(path)
      } catch (caught) {
        setDropError(caught instanceof Error ? caught.message : 'The dropped file could not be opened.')
      }
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [openFile])

  useKeyboardShortcuts()

  if (!bootstrapped) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-(--color-bg)">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--color-border) border-t-(--color-accent)" />
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-(--color-bg) text-(--color-text)">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        {sidebarVisible && <Sidebar />}
        {workspaceRoot || tabs.length > 0 ? (
          <div className="flex min-w-0 flex-1 flex-col">
            <EditorPane />
            {terminalVisible && <TerminalPanel />}
            <StatusBar />
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
      <QuickOpen />
      <CommandPalette />
      <UnsavedChangesDialog />
      <HelpDialog />
      <TemplateDialog />
      <SettingsDialog />
      <UpdateDialog />
      {isFileDragActive && (
        <div className="pointer-events-none fixed inset-3 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-(--color-accent) bg-(--color-bg)/90">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-(--color-bg-elevated) px-8 py-6 text-center shadow-xl">
            <FileDown size={34} className="text-(--color-accent)" />
            <div>
              <p className="font-semibold text-(--color-text)">Drop Markdown to open</p>
              <p className="mt-1 text-xs text-(--color-text-muted)">The file opens directly without changing your workspace.</p>
            </div>
          </div>
        </div>
      )}
      {dropError && (
        <div role="alert" className="fixed bottom-8 right-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border border-red-500/40 bg-(--color-bg-elevated) px-4 py-3 text-sm text-(--color-text) shadow-xl">
          <span>{dropError}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDropError(null)}
            className="rounded p-0.5 text-(--color-text-muted) hover:bg-(--color-bg-inset) hover:text-(--color-text)"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
