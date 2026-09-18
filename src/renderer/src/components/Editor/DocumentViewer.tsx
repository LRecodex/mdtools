import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, LockKeyhole, Maximize2, Search, ZoomIn, ZoomOut } from 'lucide-react'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import type { SpreadsheetCell, SpreadsheetMerge } from '../../../../shared/types'
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

const FORMULA_COLORS = [
  { cell: 'border-rose-400 bg-rose-500/15 text-rose-100', token: 'bg-rose-500/25 text-rose-100', dot: 'bg-rose-400' },
  { cell: 'border-sky-400 bg-sky-500/15 text-sky-100', token: 'bg-sky-500/25 text-sky-100', dot: 'bg-sky-400' },
  { cell: 'border-emerald-400 bg-emerald-500/15 text-emerald-100', token: 'bg-emerald-500/25 text-emerald-100', dot: 'bg-emerald-400' },
  { cell: 'border-amber-400 bg-amber-500/15 text-amber-100', token: 'bg-amber-500/25 text-amber-100', dot: 'bg-amber-400' },
  { cell: 'border-violet-400 bg-violet-500/15 text-violet-100', token: 'bg-violet-500/25 text-violet-100', dot: 'bg-violet-400' },
  { cell: 'border-pink-400 bg-pink-500/15 text-pink-100', token: 'bg-pink-500/25 text-pink-100', dot: 'bg-pink-400' }
]

interface FormulaReference {
  text: string
  local: boolean
  color: number
}

const CELL_REFERENCE = /(?:(?:'[^']+'|[A-Za-z_][A-Za-z0-9_. ]*)!)?(?:\$?[A-Z]{1,3}\$?\d+)(?::(?:\$?[A-Z]{1,3}\$?\d+))?/g

function columnLabel(index: number): string {
  let label = ''
  let current = index + 1
  while (current > 0) {
    current -= 1
    label = String.fromCharCode(65 + (current % 26)) + label
    current = Math.floor(current / 26)
  }
  return label
}

function formulaReferences(formula: string): FormulaReference[] {
  const references: FormulaReference[] = []
  const colors = new Map<string, number>()
  for (const match of formula.matchAll(CELL_REFERENCE)) {
    const text = match[0]
    const key = text.toUpperCase()
    let color = colors.get(key)
    if (color == null) {
      color = colors.size % FORMULA_COLORS.length
      colors.set(key, color)
    }
    references.push({ text, local: !text.includes('!'), color })
  }
  return references
}

function addressesForReference(reference: string): string[] {
  const local = reference.includes('!') ? reference.slice(reference.lastIndexOf('!') + 1) : reference
  const [start, end = start] = local.replaceAll('$', '').split(':')
  const parse = (address: string) => {
    const match = /^([A-Z]+)(\d+)$/i.exec(address)
    if (!match) return undefined
    const column = [...match[1].toUpperCase()].reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0)
    return { column, row: Number(match[2]) }
  }
  const from = parse(start)
  const to = parse(end)
  if (!from || !to) return []
  const addresses: string[] = []
  for (let row = Math.min(from.row, to.row); row <= Math.max(from.row, to.row); row += 1) {
    for (let column = Math.min(from.column, to.column); column <= Math.max(from.column, to.column); column += 1) {
      if (addresses.length >= 500) return addresses
      addresses.push(`${columnLabel(column - 1)}${row}`)
    }
  }
  return addresses
}

function FormulaText({ formula, references }: { formula: string, references: FormulaReference[] }): React.JSX.Element {
  const parts: React.ReactNode[] = []
  let position = 0
  let referenceIndex = 0
  for (const match of formula.matchAll(CELL_REFERENCE)) {
    const start = match.index ?? 0
    if (start > position) parts.push(formula.slice(position, start))
    const reference = references[referenceIndex]
    parts.push(<span key={`${start}-${referenceIndex}`} className={`rounded px-0.5 font-semibold ${FORMULA_COLORS[reference.color].token}`}>{match[0]}</span>)
    position = start + match[0].length
    referenceIndex += 1
  }
  if (position < formula.length) parts.push(formula.slice(position))
  return <>{parts}</>
}

function readableTextColor(background?: string, color?: string): string | undefined {
  if (!background || !/^#[\da-f]{6}$/i.test(background)) return color
  const channels = [background.slice(1, 3), background.slice(3, 5), background.slice(5, 7)].map((part) => Number.parseInt(part, 16) / 255)
  const luminance = channels.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0)
  const isLightBackground = luminance > 0.45
  if (isLightBackground && (!color || /^#(?:fff|ffffff)$/i.test(color))) return '#1f2937'
  if (!isLightBackground && color && /^#(?:000|000000)$/i.test(color)) return '#f8fafc'
  return color
}

function columnWidth(width?: number): number {
  // Excel's character widths can become impractically wide in a compact app pane.
  return Math.max(36, Math.min(280, Math.round((width ?? 14) * 6.5 + 8)))
}

function SpreadsheetViewer({ tab }: { tab: Tab }): React.JSX.Element {
  const sheets = tab.sheets ?? []
  const [selected, setSelected] = useState(() => Math.max(0, sheets.findIndex((sheet) => !sheet.hidden)))
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>()
  const [zoom, setZoom] = useState(() => sheets.find((sheet) => !sheet.hidden)?.zoom ?? 100)
  const [jumpAddress, setJumpAddress] = useState('')
  const [showHidden, setShowHidden] = useState(false)
  const viewportRef = useRef<HTMLDivElement>(null)
  const sheet = sheets[selected]
  const selectedCell = sheet?.rows.flat().find((cell) => cell.address === selectedAddress)
  const references = useMemo(() => selectedCell?.formula ? formulaReferences(selectedCell.formula) : [], [selectedCell?.formula])
  const highlightedCells = useMemo(() => {
    const colors = new Map<string, number>()
    for (const reference of references) {
      if (!reference.local) continue
      for (const address of addressesForReference(reference.text)) colors.set(address, reference.color)
    }
    return colors
  }, [references])

  useEffect(() => {
    setSelectedAddress(sheet?.activeCell)
    setJumpAddress('')
    setZoom(sheet?.zoom ?? 100)
  }, [selected])

  useEffect(() => {
    if (!selectedAddress) return
    document.getElementById(`spreadsheet-cell-${selectedAddress}`)?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
  }, [selectedAddress])

  const onViewportWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey) return
    event.preventDefault()
    setZoom((value) => Math.max(50, Math.min(200, value - event.deltaY * 0.08)))
  }

  const visibleSheets = sheets.map((item, index) => ({ item, index })).filter(({ item }) => showHidden || !item.hidden)
  const mergeAt = (row: number, column: number): SpreadsheetMerge | undefined => sheet?.merges.find((merge) => merge.top === row && merge.left === column)
  const insideMerge = (row: number, column: number): boolean => Boolean(sheet?.merges.some((merge) => row >= merge.top && row <= merge.bottom && column >= merge.left && column <= merge.right && (merge.top !== row || merge.left !== column)))
  const goToCell = () => {
    const address = jumpAddress.trim().replaceAll('$', '').toUpperCase()
    if (sheet?.rows.flat().some((cell) => cell.address === address)) setSelectedAddress(address)
  }
  const frozenLabel = sheet && (sheet.frozenRows || sheet.frozenColumns)
    ? `Frozen: ${sheet.frozenRows ? `${sheet.frozenRows} row${sheet.frozenRows === 1 ? '' : 's'}` : ''}${sheet.frozenRows && sheet.frozenColumns ? ' · ' : ''}${sheet.frozenColumns ? `${sheet.frozenColumns} column${sheet.frozenColumns === 1 ? '' : 's'}` : ''}`
    : 'No frozen panes'
  const frozenTop = (rowIndex: number): number => 37 + (sheet?.rowMeta.slice(0, rowIndex).reduce((total, row) => total + (row.hidden ? 0 : row.height ?? 36), 0) ?? 0)
  const frozenLeft = (columnIndex: number): number => 40 + (sheet?.columns.slice(0, columnIndex).reduce((total, column) => total + (column.hidden ? 0 : columnWidth(column.width)), 0) ?? 0)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-(--color-border) bg-(--color-bg-elevated) px-2">
        {visibleSheets.map(({ item, index }) => (
          <button key={item.name} type="button" onClick={() => setSelected(index)} className={`rounded px-2 py-1 text-xs ${index === selected ? 'bg-(--color-accent) text-(--color-accent-fg)' : 'text-(--color-text-muted) hover:bg-(--color-bg-inset)'}`}>
          {item.name}{item.hidden && ' (hidden)'}
          </button>
        ))}
        {sheets.some((item) => item.hidden) && <button type="button" onClick={() => setShowHidden((value) => !value)} className="ml-auto whitespace-nowrap rounded px-2 py-1 text-xs text-(--color-text-muted) hover:bg-(--color-bg-inset)">{showHidden ? 'Hide hidden sheets' : 'Show hidden sheets'}</button>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-(--color-border) bg-(--color-bg) px-3 py-1.5 text-xs text-(--color-text-muted)">
        <span title="Saved Excel freeze-pane settings"><LockKeyhole size={13} className="mr-1 inline" />{frozenLabel}</span>
        {sheet?.protected && <span title="This worksheet is protected"><LockKeyhole size={13} className="mr-1 inline" />Protected</span>}
        <form className="flex items-center gap-1" onSubmit={(event) => { event.preventDefault(); goToCell() }}>
          <label className="sr-only" htmlFor="spreadsheet-go-to">Go to cell</label>
          <Search size={13} />
          <input id="spreadsheet-go-to" aria-label="Go to spreadsheet cell" value={jumpAddress} onChange={(event) => setJumpAddress(event.target.value)} placeholder="Go to cell, e.g. H67" className="w-36 rounded border border-(--color-border) bg-(--color-bg-inset) px-2 py-1 font-mono text-(--color-text) outline-none focus:border-(--color-accent)" />
        </form>
        <div className="ml-auto flex items-center gap-1" aria-label="Spreadsheet zoom controls" title="Hold Ctrl and use the mouse wheel to zoom">
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(50, value - 5))} className="rounded p-1 hover:bg-(--color-bg-inset)"><ZoomOut size={15} /></button>
          <button type="button" aria-label="Reset spreadsheet zoom" onClick={() => setZoom(sheet?.zoom ?? 100)} className="min-w-12 rounded px-1 py-1 hover:bg-(--color-bg-inset)">{Math.round(zoom)}%</button>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(200, value + 5))} className="rounded p-1 hover:bg-(--color-bg-inset)"><ZoomIn size={15} /></button>
          <button type="button" aria-label="Fit spreadsheet width" onClick={() => setZoom(80)} className="rounded p-1 hover:bg-(--color-bg-inset)" title="Compact view"><Maximize2 size={15} /></button>
        </div>
      </div>
      <div className="shrink-0 border-b border-(--color-border) bg-(--color-bg-inset) px-3 py-2 text-xs">
        {selectedCell ? (
          <div className="flex min-w-0 items-start gap-3">
            <span className="rounded bg-(--color-bg-elevated) px-1.5 py-0.5 font-mono font-semibold text-(--color-text)">{selectedCell.address}</span>
            {selectedCell.formula ? (
              <div className="min-w-0 flex-1">
                <p className="break-all font-mono text-(--color-text)">=<FormulaText formula={selectedCell.formula} references={references} /></p>
                <p className="mt-1 text-(--color-text-muted)">Result: {selectedCell.value || '(blank)'}{references.length > 0 && ' · matching colors show the cells used by this formula'}</p>
              </div>
            ) : <p className="min-w-0 flex-1 break-all text-(--color-text-muted)">Value: {selectedCell.value || '(blank)'} · Select a formula cell to trace its inputs.</p>}
          </div>
        ) : <p className="text-(--color-text-muted)">Select a cell to inspect its value. Formula cells reveal their calculation and color-code referenced cells.</p>}
      </div>
      <div ref={viewportRef} onWheel={onViewportWheel} className="min-h-0 flex-1 overflow-auto" title="Hold Ctrl and use the mouse wheel to zoom">
        {sheet ? (
          <table className="border-separate border-spacing-0 text-left text-xs" style={{ zoom: `${zoom}%` }}>
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-30 min-w-10 border-b border-r border-(--color-border) bg-(--color-bg-elevated)" />
                {sheet.rows[0]?.map((_, columnIndex) => !sheet.columns[columnIndex]?.hidden && <th key={columnIndex} className={`sticky top-0 border-b border-r border-(--color-border) bg-(--color-bg-elevated) px-3 py-2 text-center font-mono font-medium text-(--color-text-muted) ${columnIndex < sheet.frozenColumns ? 'z-30' : 'z-20'}`} style={{ minWidth: `${columnWidth(sheet.columns[columnIndex]?.width)}px`, ...(columnIndex < sheet.frozenColumns ? { left: `${frozenLeft(columnIndex)}px` } : {}) }}>{columnLabel(columnIndex)}</th>)}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((row, rowIndex) => !sheet.rowMeta[rowIndex]?.hidden && (
                <tr key={rowIndex} style={{ height: sheet.rowMeta[rowIndex]?.height ? `${sheet.rowMeta[rowIndex].height}px` : undefined }}>
                  <th className={`sticky left-0 min-w-10 border-b border-r border-(--color-border) bg-(--color-bg-elevated) px-2 text-right font-mono font-medium text-(--color-text-muted) ${rowIndex < (sheet.frozenRows ?? 0) ? 'z-30' : 'z-10'}`} style={rowIndex < sheet.frozenRows ? { top: `${frozenTop(rowIndex)}px` } : undefined}>{rowIndex + 1}</th>
                  {row.map((cell: SpreadsheetCell, columnIndex) => {
                    const rowNumber = rowIndex + 1
                    const columnNumber = columnIndex + 1
                    if (sheet.columns[columnIndex]?.hidden || insideMerge(rowNumber, columnNumber)) return null
                    const merge = mergeAt(rowNumber, columnNumber)
                    const highlight = highlightedCells.get(cell.address)
                    const isSelected = cell.address === selectedAddress
                    const isFrozen = rowIndex < sheet.frozenRows
                    const style = { backgroundColor: cell.style?.background, color: readableTextColor(cell.style?.background, cell.style?.color), fontWeight: cell.style?.bold ? 700 : undefined, fontStyle: cell.style?.italic ? 'italic' : undefined, textAlign: cell.style?.horizontal, verticalAlign: cell.style?.vertical, whiteSpace: cell.style?.wrapText ? 'pre-wrap' : 'nowrap' } as React.CSSProperties
                    const isFrozenColumn = columnIndex < sheet.frozenColumns
                    const frozenStyle = { ...(isFrozen ? { top: `${frozenTop(rowIndex)}px` } : {}), ...(isFrozenColumn ? { left: `${frozenLeft(columnIndex)}px` } : {}) }
                    return <td key={cell.address} colSpan={merge ? merge.right - merge.left + 1 : undefined} rowSpan={merge ? merge.bottom - merge.top + 1 : undefined} className={`border-b border-r border-(--color-border) p-0 ${(isFrozen || isFrozenColumn) ? `sticky ${isFrozen && isFrozenColumn ? 'z-30' : 'z-20'}` : ''}`} style={(isFrozen || isFrozenColumn) ? frozenStyle : undefined}>
                      <button
                        id={`spreadsheet-cell-${cell.address}`}
                        type="button"
                        onClick={() => setSelectedAddress(cell.address)}
                        title={cell.formula ? `Formula: =${cell.formula}` : cell.value}
                        aria-label={`Spreadsheet cell ${cell.address}${cell.formula ? ', formula' : ''}`}
                        className={`block min-h-9 w-full border-2 px-3 py-2 text-left align-top focus:outline-none ${isSelected ? 'border-(--color-accent) bg-(--color-accent)/15 ring-1 ring-(--color-accent)' : highlight != null ? FORMULA_COLORS[highlight].cell : 'border-transparent bg-(--color-bg) hover:bg-(--color-bg-inset)'}`}
                        style={style}
                      >
                        <span>{cell.value}</span>{cell.formula && <span className="ml-1 text-[10px] text-(--color-text-muted)" aria-label="Contains formula">ƒ</span>}
                      </button>
                    </td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyMessage text="This workbook has no worksheets." />}
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
