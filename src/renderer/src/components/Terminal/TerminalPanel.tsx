import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Play, Square, Trash2, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export default function TerminalPanel(): React.JSX.Element {
  const workspaceRoot = useAppStore((s) => s.workspaceRoot)
  const toggleTerminal = useAppStore((s) => s.toggleTerminal)
  const [command, setCommand] = useState('')
  const [output, setOutput] = useState('')
  const [processId, setProcessId] = useState<number | null>(null)
  const outputRef = useRef<HTMLPreElement>(null)

  useEffect(() => window.api.terminal.onOutput((payload) => {
    if (payload.id !== processId && payload.stream !== 'exit') return
    setOutput((current) => current + payload.data)
    if (payload.stream === 'exit') setProcessId(null)
  }), [processId])

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight })
  }, [output])

  const run = async (): Promise<void> => {
    const value = command.trim()
    if (!value || processId !== null) return
    setOutput((current) => `${current}${current ? '\n' : ''}$ ${value}\n`)
    setCommand('')
    const result = await window.api.terminal.run(value, workspaceRoot)
    setProcessId(result.id)
  }

  return <section className="flex h-56 shrink-0 flex-col border-t border-(--color-border) bg-(--color-bg-inset)">
    <div className="flex h-8 shrink-0 items-center justify-between border-b border-(--color-border) px-2 text-xs">
      <span className="font-semibold uppercase tracking-wide text-(--color-text-muted)">Terminal</span>
      <div className="flex items-center gap-1">
        <button type="button" title="Clear terminal" aria-label="Clear terminal" onClick={() => setOutput('')} className="rounded p-1 hover:bg-(--color-bg-elevated)"><Trash2 size={13} /></button>
        {processId !== null && <button type="button" title="Stop process" aria-label="Stop process" onClick={() => void window.api.terminal.stop(processId)} className="rounded p-1 text-red-500 hover:bg-(--color-bg-elevated)"><Square size={13} /></button>}
        <button type="button" title="Hide terminal" aria-label="Hide terminal" onClick={toggleTerminal} className="rounded p-1 hover:bg-(--color-bg-elevated)"><X size={14} /></button>
      </div>
    </div>
    <pre ref={outputRef} className="text-select min-h-0 flex-1 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-xs leading-5 text-(--color-text)">{output || 'Run a command in the workspace. Try claude, codex, npm test, or git status.'}</pre>
    <form className="flex items-center gap-2 border-t border-(--color-border) px-2 py-1.5" onSubmit={(event) => { event.preventDefault(); void run() }}>
      <ChevronDown size={14} className="text-(--color-accent)" />
      <input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Enter a command…" className="min-w-0 flex-1 bg-transparent font-mono text-xs outline-none" aria-label="Terminal command" />
      <button type="submit" disabled={!command.trim() || processId !== null} title="Run command" aria-label="Run command" className="rounded p-1 text-(--color-accent) hover:bg-(--color-bg-elevated) disabled:opacity-40"><Play size={14} /></button>
    </form>
  </section>
}
