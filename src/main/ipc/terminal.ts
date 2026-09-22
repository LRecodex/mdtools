import { ipcMain, BrowserWindow } from 'electron'
import { spawn, type ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

const processes = new Map<number, ChildProcess>()
let nextId = 1

export function registerTerminalHandlers(): void {
  ipcMain.handle('terminal:create', (event, cwd: string | null) => {
    const id = nextId++
    const win = BrowserWindow.fromWebContents(event.sender)
    const workingDirectory = cwd && existsSync(cwd) ? cwd : process.cwd()
    const shell = getWindowsShell()
    const child = spawn(shell.file, shell.args, {
      cwd: workingDirectory,
      windowsHide: true,
      stdio: 'pipe'
    })
    processes.set(id, child)
    const send = (data: string): void => {
      if (!win || win.isDestroyed()) return
      win.webContents.send('terminal:output', { id, data })
    }
    child.stdout?.on('data', (data: Buffer) => send(data.toString()))
    child.stderr?.on('data', (data: Buffer) => send(data.toString()))
    child.on('error', (error) => send(`\r\n\x1b[31m${error.message}\x1b[0m\r\n`))
    child.on('close', (code) => {
      if (win && !win.isDestroyed()) win.webContents.send('terminal:exit', { id, exitCode: code ?? 1 })
      processes.delete(id)
    })
    return { id }
  })

  ipcMain.handle('terminal:resize', () => undefined)

  ipcMain.handle('terminal:stop', (_event, id: number) => {
    const child = processes.get(id)
    if (child && !child.killed) child.kill()
    processes.delete(id)
  })

  ipcMain.handle('terminal:input', (_event, id: number, input: string) => {
    const child = processes.get(id)
    if (child?.stdin?.writable) child.stdin.write(input)
  })
}

function getWindowsShell(): { file: string; args: string[] } {
  const systemRoot = process.env['SystemRoot'] ?? 'C:\\Windows'
  const powershell = join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  if (existsSync(powershell)) return { file: powershell, args: ['-NoLogo', '-NoExit'] }
  return { file: process.env['ComSpec'] ?? 'cmd.exe', args: ['/d', '/k'] }
}
