import { useEffect } from 'react'
import { useAppStore } from './store/useAppStore'
import TitleBar from './components/TitleBar/TitleBar'
import Sidebar from './components/Sidebar/Sidebar'
import EditorPane from './components/Editor/EditorPane'
import StatusBar from './components/StatusBar/StatusBar'
import QuickOpen from './components/QuickOpen/QuickOpen'
import UnsavedChangesDialog from './components/Dialogs/UnsavedChangesDialog'
import HelpDialog from './components/Dialogs/HelpDialog'
import EmptyState from './components/EmptyState/EmptyState'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

export default function App(): React.JSX.Element {
  const bootstrap = useAppStore((s) => s.bootstrap)
  const bootstrapped = useAppStore((s) => s.bootstrapped)
  const workspaceRoot = useAppStore((s) => s.workspaceRoot)

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

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
        <Sidebar />
        {workspaceRoot ? (
          <div className="flex min-w-0 flex-1 flex-col">
            <EditorPane />
            <StatusBar />
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
      <QuickOpen />
      <UnsavedChangesDialog />
      <HelpDialog />
    </div>
  )
}
