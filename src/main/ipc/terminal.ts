import { ipcMain, BrowserWindow } from 'electron'
import { spawn, type ChildProcess } from 'child_process'
import { existsSync } from 'fs'

const processes = new Map<number, ChildProcess>()
let nextId = 1

export function registerTerminalHandlers(): void {
  ipcMain.handle('terminal:run', (event, command: string, cwd: string | null) => {
    const id = nextId++
    const win = BrowserWindow.fromWebContents(event.sender)
    const workingDirectory = cwd && existsSync(cwd) ? cwd : process.cwd()
    const child = spawn(command, { cwd: workingDirectory, shell: true, windowsHide: true })
    processes.set(id, child)
    const send = (stream: 'stdout' | 'stderr' | 'exit', data: string): void => {
      if (!win || win.isDestroyed()) return
      win.webContents.send('terminal:output', { id, stream, data })
    }
    child.stdout?.on('data', (data: Buffer) => send('stdout', data.toString()))
    child.stderr?.on('data', (data: Buffer) => send('stderr', data.toString()))
    child.on('error', (error) => send('stderr', `${error.message}\n`))
    child.on('close', (code, signal) => {
      send('exit', `\n[process exited${code == null ? ` (${signal ?? 'unknown'})` : ` with code ${code}`}]\n`)
      processes.delete(id)
    })
    return { id }
  })

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
