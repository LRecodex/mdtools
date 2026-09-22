import { useEffect, useRef, useState } from 'react'
import { ChevronDown, MoreHorizontal, Play, Plus, Square, Split, Trash2, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { basename } from '../../lib/path'

export default function TerminalPanel(): React.JSX.Element {
  const workspaceRoot = useAppStore((s) => s.workspaceRoot)
  const toggleTerminal = useAppStore((s) => s.toggleTerminal)
  const [command, setCommand] = useState('')
  const [output, setOutput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [processId, setProcessId] = useState<number | null>(null)
  const outputRef = useRef<HTMLPreElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
    if (!value) return
    setHistory((current) => [...current.filter((item) => item !== value), value])
    setHistoryIndex(-1)
    if (processId !== null) {
      setOutput((current) => `${current}${value}\n`)
      setCommand('')
      await window.api.terminal.input(processId, `${value}\n`)
      return
    }
    if (/^clear$/i.test(value) && navigator.platform.toLowerCase().includes('win')) {
      setOutput('')
      setCommand('')
      return
    }
    setOutput((current) => `${current}${current ? '\n' : ''}$ ${value}\n`)
    setCommand('')
    const result = await window.api.terminal.run(value, workspaceRoot)
    setProcessId(result.id)
  }

  const startFreshTerminal = (): void => {
    if (processId !== null) void window.api.terminal.stop(processId)
    setProcessId(null)
    setOutput('')
    setCommand('')
    inputRef.current?.focus()
  }

  const navigateHistory = (direction: 'up' | 'down'): void => {
    if (history.length === 0) return
    const nextIndex = direction === 'up'
      ? Math.min(history.length - 1, historyIndex + 1)
      : Math.max(-1, historyIndex - 1)
    setHistoryIndex(nextIndex)
    setCommand(nextIndex < 0 ? '' : history[history.length - 1 - nextIndex] ?? '')
  }

  return (
    <section className="terminal-panel flex min-h-56 h-64 shrink-0 flex-col border-t border-(--color-terminal-border) bg-(--color-terminal-bg) text-(--color-terminal-text)">
      <div className="terminal-header flex h-9 shrink-0 items-center border-b border-(--color-terminal-border) px-3 text-xs">
        <span className="font-semibold uppercase tracking-wide text-(--color-text-muted)">Terminal</span>
        <div className="ml-4 flex h-full min-w-0 items-end gap-0.5">
          <button type="button" className="terminal-tab flex h-8 items-center gap-2 border-b-2 border-(--color-accent) px-3 text-(--color-terminal-text)" aria-label="PowerShell terminal">
            <span className="terminal-prompt-mark">›_</span>
            <span className="truncate">PowerShell</span>
            {workspaceRoot && <span className="hidden text-(--color-text-muted) xl:inline">({basename(workspaceRoot)})</span>}
          </button>
        </div>
        <div className="ml-auto flex items-center gap-0.5 text-(--color-text-muted)">
          <button type="button" title="New terminal" aria-label="New terminal" onClick={startFreshTerminal} className="terminal-action"><Plus size={15} /></button>
          <button type="button" title="Split terminal" aria-label="Split terminal" className="terminal-action"><Split size={14} /></button>
          <button type="button" title="Terminal profiles" aria-label="Terminal profiles" className="terminal-action"><ChevronDown size={14} /></button>
          <button type="button" title="More actions" aria-label="More actions" className="terminal-action"><MoreHorizontal size={15} /></button>
          <button type="button" title="Clear terminal" aria-label="Clear terminal" onClick={() => setOutput('')} className="terminal-action"><Trash2 size={14} /></button>
          {processId !== null && <button type="button" title="Kill terminal process" aria-label="Kill terminal process" onClick={() => void window.api.terminal.stop(processId)} className="terminal-action text-red-400"><Square size={13} /></button>}
          <button type="button" title="Hide terminal" aria-label="Hide terminal" onClick={toggleTerminal} className="terminal-action"><X size={15} /></button>
        </div>
      </div>
      <div className="terminal-viewport min-h-0 flex-1 overflow-hidden">
        <pre ref={outputRef} className="text-select h-full overflow-auto whitespace-pre-wrap px-4 py-3 font-mono text-[13px] leading-5">{output || <span className="text-(--color-text-muted)">Type a command to start in {workspaceRoot ? basename(workspaceRoot) : 'the workspace'}.</span>}</pre>
      </div>
      <form className="terminal-input-row flex h-9 shrink-0 items-center border-t border-(--color-terminal-border) px-3" onSubmit={(event) => { event.preventDefault(); void run() }}>
        <span className="mr-2 font-mono text-sm text-(--color-accent)">›</span>
        <input ref={inputRef} value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === 'ArrowUp') { event.preventDefault(); navigateHistory('up') } else if (event.key === 'ArrowDown') { event.preventDefault(); navigateHistory('down') } }} placeholder={processId !== null ? 'Send input to process…' : 'Type a command…'} className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-(--color-terminal-text) outline-none placeholder:text-(--color-text-muted)" aria-label="Terminal command" />
        <button type="submit" disabled={!command.trim()} title={processId !== null ? 'Send input' : 'Run command'} aria-label={processId !== null ? 'Send input' : 'Run command'} className="terminal-submit"><Play size={13} /></button>
      </form>
    </section>
  )
}
