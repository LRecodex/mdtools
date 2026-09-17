import { useEffect, useState } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { UpdateStatus } from '../../../../shared/types'

export default function UpdateDialog(): React.JSX.Element | null {
  const open = useAppStore((s) => s.updateDialogOpen)
  const setOpen = useAppStore((s) => s.setUpdateDialogOpen)
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    if (!open) return
    void window.api.update.getStatus().then(setStatus)
    const unsubscribe = window.api.update.onStatus(setStatus)
    void fetch('https://api.github.com/repos/LRecodex/mdtools-releases/releases/latest')
      .then((response) => response.ok ? response.json() : null)
      .then((release: { body?: string } | null) => setNotes(release?.body ?? ''))
      .catch(() => setNotes(''))
    return unsubscribe
  }, [open])

  if (!open) return null

  const available = status?.status === 'available'
  const downloaded = status?.status === 'downloaded'
  const downloading = status?.status === 'downloading'
  const checking = status?.status === 'checking'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <div role="dialog" aria-label="Update MD Tools" className="flex max-h-[82vh] w-[560px] max-w-[calc(100vw-32px)] flex-col rounded-lg border border-(--color-border) bg-(--color-bg-elevated) shadow-2xl">
        <div className="flex h-12 items-center justify-between border-b border-(--color-border) px-4">
          <div className="flex items-center gap-2">
            <Download size={17} className="text-(--color-accent)" />
            <h2 className="text-sm font-semibold">MD Tools Updates</h2>
          </div>
          <button type="button" aria-label="Close update dialog" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-(--color-text-muted) hover:bg-(--color-bg-inset) hover:text-(--color-text)">
            <X size={15} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="text-sm text-(--color-text)">
            Current version: v{status?.currentVersion ?? 'unknown'}
          </p>
          <p className="mt-1 text-sm text-(--color-text-muted)">
            {available && `v${status.availableVersion} is available.`}
            {downloaded && `v${status.availableVersion} is ready to install.`}
            {downloading && `Downloading update ${status.percent ?? 0}%...`}
            {checking && 'Checking for updates...'}
            {status?.status === 'not-available' && 'You are on the latest version.'}
            {status?.status === 'unsupported' && status.message}
            {status?.status === 'error' && (status.message ?? 'Update check failed.')}
            {status?.status === 'idle' && 'Update status is idle.'}
          </p>
          {notes && (
            <>
              <h3 className="mt-5 text-xs font-semibold uppercase text-(--color-text-muted)">Latest release notes</h3>
              <pre className="text-select mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-(--color-border) bg-(--color-bg) p-3 text-xs leading-relaxed text-(--color-text-muted)">{notes}</pre>
            </>
          )}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-(--color-border) p-3">
          <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-(--color-border) px-3 py-1.5 text-sm hover:bg-(--color-bg-inset)">
            Later
          </button>
          <button type="button" onClick={() => void window.api.update.check()} disabled={checking || downloading} className="flex items-center gap-2 rounded-md border border-(--color-border) px-3 py-1.5 text-sm hover:bg-(--color-bg-inset) disabled:opacity-50">
            <RefreshCw size={14} /> Check
          </button>
          {available && (
            <button type="button" onClick={() => void window.api.update.download()} className="rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-(--color-accent-fg) hover:opacity-90">
              Download
            </button>
          )}
          {downloaded && (
            <button type="button" onClick={() => void window.api.update.install()} className="rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-(--color-accent-fg) hover:opacity-90">
              Restart to update
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
