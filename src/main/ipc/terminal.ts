import { app, ipcMain, BrowserWindow } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { spawn, type IPty } from 'node-pty'

const terminals = new Map<number, IPty>()
let nextId = 1

export function registerTerminalHandlers(): void {
  app.on('will-quit', () => {
    for (const pty of terminals.values()) pty.kill()
    terminals.clear()
  })
  ipcMain.handle('terminal:create', (event, cwd: string | null) => {
    const id = nextId++
    const win = BrowserWindow.fromWebContents(event.sender)
    const workingDirectory = cwd && existsSync(cwd) ? cwd : process.cwd()
    const shell = getWindowsShell()
    const pty = spawn(shell.file, shell.args, {
      name: 'xterm-256color', cwd: workingDirectory, cols: 80, rows: 24,
      useConpty: process.platform === 'win32',
      env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' } as Record<string, string>
    })
    terminals.set(id, pty)
    const send = (channel: 'terminal:output' | 'terminal:exit', payload: unknown): void => {
      if (win && !win.isDestroyed()) win.webContents.send(channel, payload)
    }
    pty.onData((data) => send('terminal:output', { id, data }))
    pty.onExit(({ exitCode, signal }) => {
      terminals.delete(id)
      send('terminal:exit', { id, exitCode, signal })
    })
    return { id }
  })

  ipcMain.handle('terminal:resize', (_event, id: number, cols: number, rows: number) => {
    const pty = terminals.get(id)
    if (!pty) return
    const nextCols = Number.isFinite(cols) ? Math.max(2, Math.floor(cols)) : pty.cols
    const nextRows = Number.isFinite(rows) ? Math.max(2, Math.floor(rows)) : pty.rows
    if (pty.cols !== nextCols || pty.rows !== nextRows) pty.resize(nextCols, nextRows)
  })

  ipcMain.handle('terminal:stop', (_event, id: number) => {
    const pty = terminals.get(id)
    if (!pty) return
    terminals.delete(id)
    pty.kill()
  })

  ipcMain.handle('terminal:input', (_event, id: number, input: string) => {
    const pty = terminals.get(id)
    if (pty && typeof input === 'string') pty.write(input)
  })
}

function getWindowsShell(): { file: string; args: string[] } {
  const requested = process.env['MDTOOLS_TERMINAL_SHELL']?.trim()
  const systemRoot = process.env['SystemRoot'] ?? 'C:\\Windows'
  const pwsh = process.env['ProgramFiles'] ? join(process.env['ProgramFiles'], 'PowerShell', '7', 'pwsh.exe') : ''
  const powershell = join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  if (requested) {
    if (requested.toLowerCase() === 'cmd') return { file: process.env['ComSpec'] ?? 'cmd.exe', args: ['/d'] }
    if (requested.toLowerCase() === 'pwsh' && existsSync(pwsh)) return { file: pwsh, args: ['-NoLogo'] }
    if (requested.toLowerCase() === 'powershell' && existsSync(powershell)) return { file: powershell, args: ['-NoLogo'] }
    if (existsSync(requested)) return { file: requested, args: [] }
  }
  if (existsSync(pwsh)) return { file: pwsh, args: ['-NoLogo'] }
  if (existsSync(powershell)) return { file: powershell, args: ['-NoLogo'] }
  return { file: process.env['ComSpec'] ?? 'cmd.exe', args: ['/d'] }
}
