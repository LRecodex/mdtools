import { useEffect, useMemo, useState } from 'react'
import { Link2, ListTree } from 'lucide-react'
import type { SearchResult } from '../../../../shared/types'
import { basename, dirname, join } from '../../lib/path'
import type { Tab } from '../../store/useAppStore'
import { useAppStore } from '../../store/useAppStore'

interface Heading {
  level: number
  text: string
  index: number
}

function markdownTitle(path: string): string {
  return basename(path).replace(/\.(md|markdown|mdx)$/i, '')
}

function headings(content: string): Heading[] {
  return content.split(/\r?\n/).flatMap((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line)
    return match ? [{ level: match[1].length, text: match[2].trim(), index }] : []
  })
}

export default function DocumentInsights({ tab }: { tab: Tab }): React.JSX.Element {
  const workspaceRoot = useAppStore((s) => s.workspaceRoot)
  const openFile = useAppStore((s) => s.openFile)
  const createFile = useAppStore((s) => s.createFile)
  const items = useMemo(() => headings(tab.content), [tab.content])
  const [backlinks, setBacklinks] = useState<SearchResult[]>([])

  useEffect(() => {
    if (!workspaceRoot || tab.kind !== 'markdown') {
      setBacklinks([])
      return
    }
    let cancelled = false
    window.api.fs.searchFiles(workspaceRoot, markdownTitle(tab.path)).then((results) => {
      if (!cancelled) setBacklinks(results.filter((result) => result.path !== tab.path && result.matchedInContent).slice(0, 8))
    }).catch(() => {
      if (!cancelled) setBacklinks([])
    })
    return () => {
      cancelled = true
    }
  }, [tab.kind, tab.path, workspaceRoot])

  const openWikiPage = async (name: string): Promise<void> => {
    const dir = dirname(tab.path)
    const targetName = `${name.replace(/[<>:"/\\|?*]+/g, '-').trim()}.md`
    const target = join(dir, targetName)
    if (await window.api.fs.exists(target)) await openFile(target)
    else await createFile(dir, targetName, `# ${name}\n\n`)
  }

  const wikiLinks = [...new Set([...tab.content.matchAll(/\[\[([^\]\n]+)\]\]/g)].map((match) => match[1].trim()).filter(Boolean))]

  return (
    <aside className="hidden w-64 shrink-0 border-l border-(--color-border) bg-(--color-bg-elevated) text-xs text-(--color-text-muted) xl:flex xl:flex-col">
      <section className="min-h-0 border-b border-(--color-border) p-3">
        <h3 className="mb-2 flex items-center gap-2 font-semibold uppercase tracking-wide"><ListTree size={13} /> Outline</h3>
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {items.length > 0 ? items.map((item) => (
            <button key={`${item.index}-${item.text}`} type="button" onClick={() => window.dispatchEvent(new CustomEvent('mdtools:goto-line', { detail: item.index + 1 }))} className="block w-full truncate rounded px-2 py-1 text-left hover:bg-(--color-bg-inset) hover:text-(--color-text)" style={{ paddingLeft: `${(item.level - 1) * 10 + 8}px` }}>
              {item.text}
            </button>
          )) : <p className="px-2 py-2">No headings</p>}
        </div>
      </section>
      <section className="min-h-0 flex-1 overflow-y-auto p-3">
        <h3 className="mb-2 flex items-center gap-2 font-semibold uppercase tracking-wide"><Link2 size={13} /> Wiki links</h3>
        <div className="space-y-1">
          {wikiLinks.length > 0 ? wikiLinks.map((name) => (
            <button key={name} type="button" onClick={() => void openWikiPage(name)} className="block w-full truncate rounded px-2 py-1 text-left hover:bg-(--color-bg-inset) hover:text-(--color-text)">
              [[{name}]]
            </button>
          )) : <p className="px-2 py-2">No wiki links</p>}
        </div>
        <h3 className="mb-2 mt-4 font-semibold uppercase tracking-wide">Backlinks</h3>
        <div className="space-y-1">
          {backlinks.length > 0 ? backlinks.map((result) => (
            <button key={result.path} type="button" onClick={() => openFile(result.path)} className="block w-full rounded px-2 py-1 text-left hover:bg-(--color-bg-inset) hover:text-(--color-text)">
              <span className="block truncate text-(--color-text)">{result.name}</span>
              {result.matchContext && <span className="block truncate">{result.matchContext}</span>}
            </button>
          )) : <p className="px-2 py-2">No backlinks</p>}
        </div>
      </section>
    </aside>
  )
}
