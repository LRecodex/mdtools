import { useEffect, useMemo, useRef } from 'react'
import mermaid from 'mermaid'
import { renderMarkdown } from '../../lib/markdown'
import { useAppStore } from '../../store/useAppStore'

interface MarkdownPreviewProps {
  content: string
}

let mermaidInitializedTheme: 'light' | 'dark' | null = null

export default function MarkdownPreview({ content }: MarkdownPreviewProps): React.JSX.Element {
  const html = useMemo(() => renderMarkdown(content), [content])
  const resolvedTheme = useAppStore((s) => s.resolvedTheme)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const nodes = container.querySelectorAll<HTMLElement>('pre.mermaid')
    if (nodes.length === 0) return

    if (mermaidInitializedTheme !== resolvedTheme) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        theme: resolvedTheme === 'dark' ? 'dark' : 'default'
      })
      mermaidInitializedTheme = resolvedTheme
    }

    let cancelled = false
    const renderDiagrams = async (): Promise<void> => {
      const validNodes: HTMLElement[] = []
      for (const node of Array.from(nodes)) {
        const valid = await mermaid.parse(node.textContent ?? '', { suppressErrors: true })
        if (cancelled) return
        if (valid) {
          validNodes.push(node)
        } else {
          node.classList.add('mermaid-error')
          node.setAttribute('title', 'This Mermaid diagram contains invalid syntax')
        }
      }
      if (validNodes.length > 0 && !cancelled) {
        await mermaid.run({ nodes: validNodes })
      }
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
