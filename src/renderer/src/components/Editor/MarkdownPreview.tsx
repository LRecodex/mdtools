import { useEffect, useMemo, useRef } from 'react'
import mermaid from 'mermaid'
import { renderMarkdown } from '../../lib/markdown'
import { useAppStore } from '../../store/useAppStore'
import { basename, dirname, join } from '../../lib/path'

interface MarkdownPreviewProps {
  content: string
}

let mermaidInitializedTheme: 'light' | 'dark' | null = null

function initializeMermaid(theme: 'light' | 'dark'): void {
  if (mermaidInitializedTheme === theme) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
    theme: theme === 'dark' ? 'dark' : 'default'
  })
  mermaidInitializedTheme = theme
}

async function renderMermaidNodes(container: HTMLElement, theme: 'light' | 'dark'): Promise<void> {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>('pre.mermaid'))
  if (nodes.length === 0) return
  initializeMermaid(theme)
  const validNodes: HTMLElement[] = []
  for (const node of nodes) {
    const valid = await mermaid.parse(node.textContent ?? '', { suppressErrors: true })
    if (valid) validNodes.push(node)
    else {
      node.classList.add('mermaid-error')
      node.setAttribute('title', 'This Mermaid diagram contains invalid syntax')
    }
  }
  if (validNodes.length > 0) await mermaid.run({ nodes: validNodes })
}

export async function renderMarkdownForExport(content: string, theme: 'light' | 'dark'): Promise<string> {
  const container = document.createElement('article')
  container.innerHTML = renderMarkdown(content)
  container.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;visibility:hidden'
  document.body.appendChild(container)
  try {
    await renderMermaidNodes(container, theme)
    return container.innerHTML
  } finally {
    container.remove()
  }
}

import PreviewSearch from './PreviewSearch'

export default function MarkdownPreview({ content }: MarkdownPreviewProps): React.JSX.Element {
  const html = useMemo(() => renderMarkdown(content), [content])
  const resolvedTheme = useAppStore((s) => s.resolvedTheme)
  const containerRef = useRef<HTMLDivElement>(null)
  const editorMode = useAppStore((s) => s.editorMode)
  const activeTabPath = useAppStore((s) => s.activeTabPath)
  const openFile = useAppStore((s) => s.openFile)
  const createFile = useAppStore((s) => s.createFile)

  useEffect(() => {
    const handleGotoLine = (event: Event): void => {
      const line = (event as CustomEvent<number>).detail
      if (typeof line !== 'number') return
      const lines = content.split(/\r?\n/)
      const headingIndex = lines.slice(0, Math.max(0, line - 1)).filter((item) => /^#{1,6}\s+/.test(item)).length
      const heading = containerRef.current?.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')[headingIndex]
      heading?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    window.addEventListener('mdtools:goto-line', handleGotoLine)
    return () => window.removeEventListener('mdtools:goto-line', handleGotoLine)
  }, [content])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    const renderDiagrams = async (): Promise<void> => {
      if (!cancelled) await renderMermaidNodes(container, resolvedTheme)
    }

    renderDiagrams().catch((err) => console.error('Failed to render Mermaid diagram', err))
    return () => {
      cancelled = true
    }
  }, [html, resolvedTheme])

  const handleClick = async (event: React.MouseEvent): Promise<void> => {
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#wiki:"]')
    if (!anchor || !activeTabPath) return
    event.preventDefault()
    const name = decodeURIComponent(anchor.getAttribute('href')!.slice('#wiki:'.length))
    const dir = dirname(activeTabPath)
    const targetName = `${name.replace(/[<>:"/\\|?*]+/g, '-').trim()}.md`
    const target = join(dir, targetName)
    if (await window.api.fs.exists(target)) await openFile(target)
    else await createFile(dir, basename(target), `# ${name}\n\n`)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
    <PreviewSearch container={containerRef} enabled={editorMode === 'preview'} theme={resolvedTheme} />
    <div className="text-select min-h-0 flex-1 overflow-y-auto">
      <div
        key={resolvedTheme}
        ref={containerRef}
        className="markdown-body mx-auto max-w-3xl px-10 py-8"
        onClick={(event) => void handleClick(event)}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
    </div>
  )
}
