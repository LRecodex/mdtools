import { useAppStore } from '../../store/useAppStore'
import { basename } from '../../lib/path'

export default function UnsavedChangesDialog(): React.JSX.Element | null {
  const pendingCloseTab = useAppStore((s) => s.pendingCloseTab)
  const cancelCloseTab = useAppStore((s) => s.cancelCloseTab)
  const confirmCloseTab = useAppStore((s) => s.confirmCloseTab)
  const saveTab = useAppStore((s) => s.saveTab)
  const saveError = useAppStore((s) => s.tabs.find((tab) => tab.path === pendingCloseTab)?.saveError)

  if (!pendingCloseTab) return null

  return (
    <div
      className="text-select fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancelCloseTab()
      }}
    >
      <div className="w-[400px] rounded-xl border border-(--color-border) bg-(--color-bg-elevated) p-5 shadow-2xl">
        <h2 className="text-base font-semibold">Unsaved changes</h2>
        <p className="mt-2 text-sm text-(--color-text-muted)">
          "{basename(pendingCloseTab)}" has unsaved changes. Do you want to save before closing?
        </p>
        {saveError && <p role="alert" className="mt-2 text-sm text-red-500">The file could not be saved. Check that it is still available and try again.</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-sm text-(--color-text-muted) hover:bg-(--color-bg-inset) hover:text-(--color-text)"
            onClick={cancelCloseTab}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-600 hover:text-white"
            onClick={() => confirmCloseTab(pendingCloseTab)}
          >
            Discard
          </button>
          <button
            type="button"
            className="rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-(--color-accent-fg) hover:opacity-90"
            onClick={async () => {
              try {
                await saveTab(pendingCloseTab)
                confirmCloseTab(pendingCloseTab)
              } catch {
                // Keep the dialog open so the user can retry or choose another action.
              }
            }}
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  )
}
