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
      mermaid.initialize({ startOnLoad: false, theme: resolvedTheme === 'dark' ? 'dark' : 'default' })
      mermaidInitializedTheme = resolvedTheme
    }

    mermaid.run({ nodes: Array.from(nodes) }).catch((err) => {
      console.error('Failed to render Mermaid diagram', err)
    })
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
