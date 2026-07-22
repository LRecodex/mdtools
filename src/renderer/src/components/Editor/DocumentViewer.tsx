import { useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import type { Tab } from '../../store/useAppStore'

function parseCsv(source: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        value += '"'
        index += 1
      } else if (char === '"') quoted = false
      else value += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(value)
      value = ''
    } else if (char === '\n') {
      row.push(value.replace(/\r$/, ''))
      rows.push(row)
      row = []
      value = ''
    } else value += char
  }
  if (value || row.length) {
    row.push(value.replace(/\r$/, ''))
    rows.push(row)
  }
  return rows
}

function DataTable({ rows }: { rows: string[][] }): React.JSX.Element {
  if (!rows.length) return <p className="p-8 text-center text-sm text-(--color-text-muted)">This table is empty.</p>
  return (
    <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, columnIndex) => {
              const Cell = rowIndex === 0 ? 'th' : 'td'
              return (
                <Cell
                  key={columnIndex}
                  className={`max-w-96 border-b border-r border-(--color-border) px-3 py-2 align-top whitespace-pre-wrap ${rowIndex === 0 ? 'sticky top-0 bg-(--color-bg-elevated) font-semibold' : 'bg-(--color-bg)'}`}
                >
                  {cell}
                </Cell>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SpreadsheetViewer({ tab }: { tab: Tab }): React.JSX.Element {
  const sheets = tab.sheets ?? []
  const [selected, setSelected] = useState(0)
  const sheet = sheets[selected]
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-(--color-border) bg-(--color-bg-elevated) px-2">
        {sheets.map((item, index) => (
          <button key={item.name} type="button" onClick={() => setSelected(index)} className={`rounded px-2 py-1 text-xs ${index === selected ? 'bg-(--color-accent) text-(--color-accent-fg)' : 'text-(--color-text-muted) hover:bg-(--color-bg-inset)'}`}>
            {item.name}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {sheet ? <DataTable rows={sheet.rows} /> : <EmptyMessage text="This workbook has no worksheets." />}
      </div>
      {sheet?.truncated && <p className="shrink-0 border-t border-(--color-border) px-3 py-1 text-xs text-amber-600">Preview limited to 1,000 rows and 100 columns.</p>}
    </div>
  )
}

function EmptyMessage({ text }: { text: string }): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-(--color-text-muted)">
      <AlertCircle size={28} />
      <p className="max-w-md text-sm">{text}</p>
    </div>
  )
}

export default function DocumentViewer({ tab }: { tab: Tab }): React.JSX.Element {
  const csvRows = useMemo(() => tab.kind === 'csv' ? parseCsv(tab.content) : [], [tab.content, tab.kind])
  const highlightedCode = useMemo(() => {
    if (tab.kind !== 'code') return ''
    const extension = tab.name.split('.').pop()?.toLowerCase() ?? ''
    const aliases: Record<string, string> = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', rb: 'ruby', cs: 'csharp', sh: 'bash', yml: 'yaml', htm: 'html', vue: 'html', svelte: 'html' }
    const language = aliases[extension] ?? extension
    const result = hljs.getLanguage(language) ? hljs.highlight(tab.content, { language }) : hljs.highlightAuto(tab.content)
    return DOMPurify.sanitize(result.value)
  }, [tab.content, tab.kind, tab.name])

  if (tab.kind === 'image') {
    return <div className="flex h-full items-center justify-center overflow-auto bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-[length:16px_16px] p-8"><img src={tab.dataUrl} alt={tab.name} className="max-h-full max-w-full object-contain shadow-lg" /></div>
  }
  if (tab.kind === 'pdf') {
    return <iframe title={tab.name} src={tab.dataUrl} className="h-full w-full border-0 bg-white" />
  }
  if (tab.kind === 'docx') {
    const html = DOMPurify.sanitize(tab.html ?? '', { ADD_ATTR: ['target'] })
    return <div className="h-full overflow-auto bg-(--color-bg-inset) p-6"><article className="markdown-body mx-auto min-h-full max-w-4xl rounded bg-(--color-bg) px-12 py-10 shadow-sm" dangerouslySetInnerHTML={{ __html: html }} /></div>
  }
  if (tab.kind === 'xlsx') return <SpreadsheetViewer tab={tab} />
  if (tab.kind === 'csv') return <div className="h-full overflow-auto"><DataTable rows={csvRows} /></div>
  if (tab.kind === 'code') {
    return <div className="markdown-body h-full max-w-none overflow-auto bg-(--color-bg)"><pre className="m-0 min-h-full rounded-none p-5 font-mono text-[13px] leading-6"><code className="hljs" dangerouslySetInnerHTML={{ __html: highlightedCode }} /></pre></div>
  }
  return <EmptyMessage text="This file type is not supported. You can still rename, reveal, or delete it from the sidebar." />
}
