import { useEffect, useRef, useState } from 'react'
import { Search, Folder, X, FileText, File as FileIcon, TextQuote } from 'lucide-react'
import { dirname } from '../../lib/path'
import { useAppStore } from '../../store/useAppStore'
import type { SearchResult } from '../../../../shared/types'

export default function QuickOpen(): React.JSX.Element | null {
  const quickOpenOpen = useAppStore((s) => s.quickOpenOpen)
  const setQuickOpenOpen = useAppStore((s) => s.setQuickOpenOpen)
  const workspaceRoot = useAppStore((s) => s.workspaceRoot)
  const openFile = useAppStore((s) => s.openFile)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (quickOpenOpen) {
      setQuery('')
      setResults([])
      setSelected(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [quickOpenOpen])

  useEffect(() => {
    if (!quickOpenOpen || !workspaceRoot) return
    let cancelled = false
    setLoading(true)
    setResults([])
    setError(null)
    const handle = setTimeout(async () => {
      try {
        const files = await window.api.fs.searchFiles(workspaceRoot, query)
        if (cancelled) return
        const sorted = [...files].sort((a, b) => {
            if (a.matchedInContent !== b.matchedInContent) return a.matchedInContent ? 1 : -1
            const aStarts = a.name.toLowerCase().startsWith(query.trim().toLowerCase()) ? 0 : 1
            const bStarts = b.name.toLowerCase().startsWith(query.trim().toLowerCase()) ? 0 : 1
            if (aStarts !== bStarts) return aStarts - bStarts
            return a.name.length - b.name.length || a.path.localeCompare(b.path)
          })
        setResults(sorted)
        setSelected(0)
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Search failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [query, quickOpenOpen, workspaceRoot])

  useEffect(() => {
    listRef.current?.children[selected]?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  if (!quickOpenOpen) return null

  const choose = async (node: SearchResult): Promise<void> => {
    try {
      if (node.isDirectory) {
        const state = useAppStore.getState()
        if (!state.sidebarVisible) state.toggleSidebar()
        const ancestors: string[] = []
        let current = node.path
        while (current !== workspaceRoot) {
          ancestors.unshift(current)
          const parent = dirname(current)
          if (parent === current) break
          current = parent
        }
        ancestors.forEach(state.revealFolder)
      } else await openFile(node.path)
      setQuickOpenOpen(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open this item')
    }
  }

  return (
    <div
      className="text-select fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setQuickOpenOpen(false)
      }}
    >
      <div role="dialog" aria-label="Search files and folders" className="w-[680px] max-w-[calc(100vw-32px)] overflow-hidden rounded-lg border border-(--color-border) bg-(--color-bg-elevated) shadow-2xl">
        <div className="flex items-center gap-2 border-b border-(--color-border) px-3">
          <Search size={15} className="text-(--color-text-muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files, folders, and file contents..."
            aria-label="Search files and folders"
            className="h-11 w-full bg-transparent text-sm outline-none"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelected((s) => Math.max(0, Math.min(s + 1, results.length - 1)))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelected((s) => Math.max(s - 1, 0))
              } else if (e.key === 'Enter' && results[selected]) {
                e.preventDefault()
                void choose(results[selected])
              } else if (e.key === 'Escape') {
                setQuickOpenOpen(false)
              }
            }}
          />
          <button type="button" aria-label="Close search" title="Close search (Esc)" onClick={() => setQuickOpenOpen(false)}><X size={16} /></button>
        </div>
        {error && <p role="alert" className="px-3 py-2 text-sm text-red-500">{error}</p>}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-1">
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-(--color-text-muted)">
              {loading ? 'Searching...' : query ? 'No matching files, folders, or file contents' : 'No files or folders'}
            </p>
          )}
          {results.map((file, idx) => (
            <button
              key={file.path}
              type="button"
              onMouseEnter={() => setSelected(idx)}
              onClick={() => void choose(file)}
              title={file.path}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                idx === selected
                  ? 'bg-(--color-accent) text-(--color-accent-fg)'
                  : 'text-(--color-text)'
              }`}
            >
              {file.isDirectory ? <Folder size={14} className="shrink-0" /> : file.isMarkdown ? (
                <FileText size={14} className="shrink-0 opacity-80" />
              ) : (
                <FileIcon size={14} className="shrink-0 opacity-80" />
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 truncate">
                  {file.name}
                  {file.matchedInContent && <TextQuote size={12} className="shrink-0 opacity-65" aria-label="Content match" />}
                </span>
                {file.matchContext ? <span className="mt-0.5 block truncate text-xs opacity-65">{file.matchContext}</span> : null}
              </span>
              <span className="max-w-[40%] truncate text-xs opacity-60">{file.path.slice((workspaceRoot?.length ?? 0) + 1)}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-(--color-border) px-3 py-2 text-xs text-(--color-text-muted)" role="status">
          {results.length >= 200 ? 'First 200 results — refine your search' : `${results.length} results · names, paths, and text contents`}
        </div>
      </div>
    </div>
  )
}
