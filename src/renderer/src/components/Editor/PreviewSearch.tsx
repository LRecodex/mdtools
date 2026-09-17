import { useEffect, useRef, useState, type RefObject } from 'react'
import { ArrowDown, ArrowUp, CaseSensitive, Search, X } from 'lucide-react'
import IconButton from '../common/IconButton'

// CSS highlights leave React's rendered document untouched.
const highlights = (CSS as unknown as { highlights: Map<string, unknown> }).highlights
const HighlightSet = (window as unknown as { Highlight: new (...ranges: Range[]) => unknown }).Highlight

export default function PreviewSearch({ container, enabled, theme }: {
  container: RefObject<HTMLDivElement>
  enabled: boolean
  theme: string
}): React.JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [ranges, setRanges] = useState<Range[]>([])
  const [selected, setSelected] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!enabled) { setOpen(false); return }
    const find = (): void => {
      setOpen(true)
      requestAnimationFrame(() => { input.current?.focus(); input.current?.select() })
    }
    window.addEventListener('mdtools:find', find)
    return () => window.removeEventListener('mdtools:find', find)
  }, [enabled])

  useEffect(() => {
    const root = container.current
    if (!root || !open) return
    const update = (): void => {
      const matches: Range[] = []
      if (query) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode: (node) => node.parentElement?.closest('script, style, svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        })
        const nodes: { node: Node; start: number; end: number }[] = []
        let text = ''
        while (walker.nextNode()) {
          const node = walker.currentNode
          const start = text.length
          text += node.textContent ?? ''
          nodes.push({ node, start, end: text.length })
        }
        const needle = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const pattern = new RegExp(needle, matchCase ? 'g' : 'gi')
        for (const match of text.matchAll(pattern)) {
          const start = match.index!
          const end = start + match[0].length
          const first = nodes.find((part) => part.end > start)
          const last = nodes.find((part) => part.end >= end)
          if (!first || !last) continue
          const range = document.createRange()
          range.setStart(first.node, start - first.start)
          range.setEnd(last.node, end - last.start)
          matches.push(range)
        }
      }
      highlights.set('document-matches', new HighlightSet(...matches))
      setRanges(matches)
      setSelected(0)
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { childList: true, subtree: true, characterData: true })
    return () => {
      observer.disconnect()
      highlights.delete('document-matches')
      highlights.delete('document-current')
    }
  }, [container, query, matchCase, open, theme])

  useEffect(() => {
    const range = ranges[selected]
    if (!open || !range) { highlights.delete('document-current'); return }
    highlights.set('document-current', new HighlightSet(range))
    const scroller = container.current?.parentElement
    if (scroller) {
      const rect = range.getBoundingClientRect()
      const bounds = scroller.getBoundingClientRect()
      scroller.scrollBy({ top: rect.top - bounds.top - bounds.height / 2 })
      const element = range.startContainer.parentElement
      if (element?.closest('pre')) element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [container, ranges, selected, open])

  const move = (delta: number): void => setSelected((current) => ranges.length ? (current + delta + ranges.length) % ranges.length : 0)
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent): void => {
      if ((event.target as HTMLElement)?.closest('[role="dialog"]')) return
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
      if (event.key === 'F3') { event.preventDefault(); move(event.shiftKey ? -1 : 1) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, ranges.length])

  if (!open || !enabled) return null
  return (
    <div role="search" aria-label="Find in document" className="flex shrink-0 flex-wrap items-center gap-1 border-b border-(--color-border) bg-(--color-bg-elevated) px-2 py-1">
      <Search size={14} className="shrink-0 text-(--color-text-muted)" />
      <input ref={input} aria-label="Find in document" placeholder="Find in document..." value={query} onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); move(e.shiftKey ? -1 : 1) } }}
        className="h-7 min-w-20 flex-1 rounded border border-(--color-border) bg-(--color-bg) px-2 text-sm outline-none focus:border-(--color-accent)" />
      <span role="status" className="min-w-16 text-center text-xs tabular-nums text-(--color-text-muted)">{query ? `${ranges.length ? selected + 1 : 0} / ${ranges.length}` : '0 / 0'}</span>
      <button type="button" title="Match case" aria-label="Match case" aria-pressed={matchCase} onClick={() => setMatchCase(!matchCase)} className={`rounded p-1 ${matchCase ? 'bg-(--color-accent) text-(--color-accent-fg)' : 'text-(--color-text-muted)'}`}><CaseSensitive size={17} /></button>
      <IconButton label="Previous match (Shift+Enter)" disabled={!ranges.length} onClick={() => move(-1)}><ArrowUp size={15} /></IconButton>
      <IconButton label="Next match (Enter)" disabled={!ranges.length} onClick={() => move(1)}><ArrowDown size={15} /></IconButton>
      <IconButton label="Close find (Esc)" onClick={() => setOpen(false)}><X size={15} /></IconButton>
    </div>
  )
}
