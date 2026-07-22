import { useEffect, useMemo, useRef } from 'react'
import mermaid from 'mermaid'
import { renderMarkdown } from '../../lib/markdown'
import { useAppStore } from '../../store/useAppStore'

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

export default function MarkdownPreview({ content }: MarkdownPreviewProps): React.JSX.Element {
  const html = useMemo(() => renderMarkdown(content), [content])
  const resolvedTheme = useAppStore((s) => s.resolvedTheme)
  const containerRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="text-select h-full min-h-0 flex-1 overflow-y-auto">
      <div
        key={resolvedTheme}
        ref={containerRef}
        className="markdown-body mx-auto max-w-3xl px-10 py-8"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
