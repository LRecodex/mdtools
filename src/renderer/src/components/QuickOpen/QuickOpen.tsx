import { useEffect, useRef, useState } from 'react'
import { Search, FileText, File as FileIcon } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { FileNode } from '../../../../shared/types'

export default function QuickOpen(): React.JSX.Element | null {
  const quickOpenOpen = useAppStore((s) => s.quickOpenOpen)
  const setQuickOpenOpen = useAppStore((s) => s.setQuickOpenOpen)
  const workspaceRoot = useAppStore((s) => s.workspaceRoot)
  const openFile = useAppStore((s) => s.openFile)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FileNode[]>([])
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

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
    const handle = setTimeout(async () => {
      const files = await window.api.fs.searchFiles(workspaceRoot, query)
      const sorted = [...files]
        .sort((a, b) => {
          const aStarts = a.name.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1
          const bStarts = b.name.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1
          if (aStarts !== bStarts) return aStarts - bStarts
          return a.name.length - b.name.length
        })
        .slice(0, 50)
      setResults(sorted)
      setSelected(0)
    }, 120)
    return () => clearTimeout(handle)
  }, [query, quickOpenOpen, workspaceRoot])

  if (!quickOpenOpen) return null

  const choose = (path: string): void => {
    openFile(path)
    setQuickOpenOpen(false)
  }

  return (
    <div
      className="text-select fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setQuickOpenOpen(false)
      }}
    >
      <div className="w-[520px] overflow-hidden rounded-xl border border-(--color-border) bg-(--color-bg-elevated) shadow-2xl">
        <div className="flex items-center gap-2 border-b border-(--color-border) px-3">
          <Search size={15} className="text-(--color-text-muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Go to file..."
            className="h-11 w-full bg-transparent text-sm outline-none"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelected((s) => Math.min(s + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelected((s) => Math.max(s - 1, 0))
              } else if (e.key === 'Enter' && results[selected]) {
                e.preventDefault()
                choose(results[selected].path)
              } else if (e.key === 'Escape') {
                setQuickOpenOpen(false)
              }
            }}
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-(--color-text-muted)">
              {query ? 'No matching files' : 'Start typing to search files'}
            </p>
          )}
          {results.map((file, idx) => (
            <button
              key={file.path}
              type="button"
              onMouseEnter={() => setSelected(idx)}
              onClick={() => choose(file.path)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                idx === selected
                  ? 'bg-(--color-accent) text-(--color-accent-fg)'
                  : 'text-(--color-text)'
              }`}
            >
              {file.isMarkdown ? (
                <FileText size={14} className="shrink-0 opacity-80" />
              ) : (
                <FileIcon size={14} className="shrink-0 opacity-80" />
              )}
              <span className="truncate">{file.name}</span>
              <span className="ml-auto truncate text-xs opacity-60">{file.path}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
