import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { ChevronDown, MoreHorizontal, Plus, Square, Split, Trash2, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { basename } from '../../lib/path'

export default function TerminalPanel(): React.JSX.Element {
  const workspaceRoot = useAppStore((s) => s.workspaceRoot)
  const resolvedTheme = useAppStore((s) => s.resolvedTheme)
  const toggleTerminal = useAppStore((s) => s.toggleTerminal)
  const viewportRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const processIdRef = useRef<number | null>(null)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      scrollback: 10_000,
      fontFamily: "'Cascadia Code', Consolas, monospace",
      fontSize: 13,
      lineHeight: 1.35,
      theme: resolvedTheme === 'dark'
        ? { background: '#181818', foreground: '#d4d4d4', cursor: '#aeafad', selectionBackground: '#264f78' }
        : { background: '#ffffff', foreground: '#24292f', cursor: '#6366f1', selectionBackground: '#b6d7ff' }
    })
    terminal.open(viewport)
    terminalRef.current = terminal

    const fitAndResize = (): void => {
      const rect = viewport.getBoundingClientRect()
      const cellWidth = 8.2
      const cellHeight = 18
      const cols = Math.max(20, Math.floor(rect.width / cellWidth))
      const rows = Math.max(4, Math.floor(rect.height / cellHeight))
      if (terminal.cols !== cols || terminal.rows !== rows) terminal.resize(cols, rows)
      if (processIdRef.current !== null) void window.api.terminal.resize(processIdRef.current, cols, rows)
    }

    const dataDisposable = terminal.onData((data) => {
      if (processIdRef.current !== null) void window.api.terminal.input(processIdRef.current, data)
    })
    const outputCleanup = window.api.terminal.onOutput((payload) => {
      if (payload.id === processIdRef.current) terminal.write(payload.data)
    })
    const exitCleanup = window.api.terminal.onExit((payload) => {
      if (payload.id !== processIdRef.current) return
      processIdRef.current = null
      terminal.write(`\r\n\x1b[90m[process exited with code ${payload.exitCode}]\x1b[0m\r\n`)
    })
    const observer = new ResizeObserver(fitAndResize)
    observer.observe(viewport)

    const create = async (): Promise<void> => {
      fitAndResize()
      const result = await window.api.terminal.create(workspaceRoot)
      processIdRef.current = result.id
      terminal.focus()
      await window.api.terminal.resize(result.id, terminal.cols, terminal.rows)
    }
    void create()

    return () => {
      observer.disconnect()
      dataDisposable.dispose()
      outputCleanup()
      exitCleanup()
      if (processIdRef.current !== null) void window.api.terminal.stop(processIdRef.current)
      processIdRef.current = null
      terminal.dispose()
      terminalRef.current = null
    }
  }, [workspaceRoot, resolvedTheme])

  const newTerminal = (): void => {
    terminalRef.current?.clear()
    terminalRef.current?.focus()
  }

  const clearTerminal = (): void => {
    terminalRef.current?.clear()
    terminalRef.current?.scrollToBottom()
    terminalRef.current?.focus()
  }

  const stopTerminal = (): void => {
    if (processIdRef.current !== null) void window.api.terminal.stop(processIdRef.current)
    terminalRef.current?.focus()
  }

  return (
    <section className="terminal-panel flex min-h-56 h-64 shrink-0 flex-col border-t border-(--color-terminal-border) bg-(--color-terminal-bg) text-(--color-terminal-text)">
      <div className="terminal-header flex h-9 shrink-0 items-center border-b border-(--color-terminal-border) px-3 text-xs">
        <span className="font-semibold uppercase tracking-wide text-(--color-text-muted)">Terminal</span>
        <div className="ml-4 flex h-full min-w-0 items-end gap-0.5">
          <button type="button" className="terminal-tab flex h-8 items-center gap-2 border-b-2 border-(--color-accent) px-3 text-(--color-terminal-text)" onClick={() => terminalRef.current?.focus()} aria-label="PowerShell terminal">
            <span className="terminal-prompt-mark">›_</span>
            <span className="truncate">PowerShell</span>
            {workspaceRoot && <span className="hidden text-(--color-text-muted) xl:inline">({basename(workspaceRoot)})</span>}
          </button>
        </div>
        <div className="ml-auto flex items-center gap-0.5 text-(--color-text-muted)">
          <button type="button" title="New terminal" aria-label="New terminal" onClick={newTerminal} className="terminal-action"><Plus size={15} /></button>
          <button type="button" title="Split terminal" aria-label="Split terminal" className="terminal-action"><Split size={14} /></button>
          <button type="button" title="Terminal profiles" aria-label="Terminal profiles" className="terminal-action"><ChevronDown size={14} /></button>
          <button type="button" title="More actions" aria-label="More actions" className="terminal-action"><MoreHorizontal size={15} /></button>
          <button type="button" title="Clear terminal" aria-label="Clear terminal" onClick={clearTerminal} className="terminal-action"><Trash2 size={14} /></button>
          <button type="button" title="Kill terminal process" aria-label="Kill terminal process" onClick={stopTerminal} className="terminal-action text-red-400"><Square size={13} /></button>
          <button type="button" title="Hide terminal" aria-label="Hide terminal" onClick={toggleTerminal} className="terminal-action"><X size={15} /></button>
        </div>
      </div>
      <div ref={viewportRef} className="terminal-viewport min-h-0 flex-1 overflow-hidden" aria-label="Integrated terminal" />
    </section>
  )
}
