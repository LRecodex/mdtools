import { contextBridge, ipcRenderer } from 'electron'
import type { FileNode, OpenedDocument, Settings, WatchEvent } from '../shared/types'

const api = {
  fs: {
    readDir: (path: string): Promise<FileNode[]> => ipcRenderer.invoke('fs:readDir', path),
    openDocument: (path: string): Promise<OpenedDocument> => ipcRenderer.invoke('fs:openDocument', path),
    writeFile: (path: string, content: string): Promise<void> =>
      ipcRenderer.invoke('fs:writeFile', path, content),
    createFile: (dirPath: string, name: string, content = ''): Promise<string> =>
      ipcRenderer.invoke('fs:createFile', dirPath, name, content),
    createFolder: (dirPath: string, name: string): Promise<string> =>
      ipcRenderer.invoke('fs:createFolder', dirPath, name),
    rename: (oldPath: string, newName: string): Promise<string> =>
      ipcRenderer.invoke('fs:rename', oldPath, newName),
    delete: (path: string): Promise<void> => ipcRenderer.invoke('fs:delete', path),
    exists: (path: string): Promise<boolean> => ipcRenderer.invoke('fs:exists', path),
    searchFiles: (root: string, query: string): Promise<FileNode[]> =>
      ipcRenderer.invoke('fs:searchFiles', root, query)
  },
  dialog: {
    openFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),
    showItemInFolder: (path: string): Promise<void> =>
      ipcRenderer.invoke('dialog:showItemInFolder', path),
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('dialog:openExternal', url),
    exportMarkdownPdf: (html: string, title: string, suggestedName: string, theme: 'light' | 'dark'): Promise<string | null> =>
      ipcRenderer.invoke('dialog:exportMarkdownPdf', html, title, suggestedName, theme)
  },
  win: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    maximizeToggle: (): Promise<void> => ipcRenderer.invoke('window:maximizeToggle'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onStateChanged: (callback: (isMaximized: boolean) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, isMaximized: boolean): void =>
        callback(isMaximized)
      ipcRenderer.on('window:stateChanged', listener)
      return () => ipcRenderer.removeListener('window:stateChanged', listener)
    }
  },
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
    update: (partial: Partial<Settings>): Promise<Settings> =>
      ipcRenderer.invoke('settings:update', partial)
  },
  watcher: {
    start: (rootPath: string): Promise<void> => ipcRenderer.invoke('watcher:start', rootPath),
    stop: (): Promise<void> => ipcRenderer.invoke('watcher:stop'),
    onEvent: (callback: (event: WatchEvent) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: WatchEvent): void =>
        callback(payload)
      ipcRenderer.on('watcher:event', listener)
      return () => ipcRenderer.removeListener('watcher:event', listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
