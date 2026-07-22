import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

function pdfDocument(html: string, title: string, theme: 'light' | 'dark'): string {
  const dark = theme === 'dark'
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page { size: A4; margin: 18mm 17mm 20mm; }
    * { box-sizing: border-box; }
    html { color-scheme: ${dark ? 'dark' : 'light'}; }
    body { margin: 0; color: ${dark ? '#e5e7eb' : '#24292f'}; background: ${dark ? '#1e1f22' : '#ffffff'}; font: 14px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    article { max-width: 100%; overflow-wrap: anywhere; }
    h1, h2, h3, h4, h5, h6 { color: ${dark ? '#f3f4f6' : '#1f2328'}; line-height: 1.25; page-break-after: avoid; }
    h1 { font-size: 2em; border-bottom: 1px solid ${dark ? '#44474d' : '#d8dee4'}; padding-bottom: .3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid ${dark ? '#44474d' : '#d8dee4'}; padding-bottom: .25em; }
    h3 { font-size: 1.25em; }
    a { color: ${dark ? '#60a5fa' : '#0969da'}; }
    img, svg { max-width: 100%; height: auto; }
    blockquote { margin: 1em 0; padding: .2em 1em; color: ${dark ? '#aeb4bd' : '#57606a'}; border-left: 4px solid ${dark ? '#555b65' : '#d0d7de'}; }
    code { border-radius: 4px; padding: .15em .35em; background: ${dark ? '#2b2d31' : '#eff1f3'}; font: .88em Consolas, "Courier New", monospace; }
    pre { overflow: hidden; white-space: pre-wrap; page-break-inside: avoid; border-radius: 7px; padding: 14px; background: ${dark ? '#17181a' : '#f6f8fa'}; }
    pre code { padding: 0; background: transparent; }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: .92em; }
    th, td { border: 1px solid ${dark ? '#44474d' : '#d0d7de'}; padding: 6px 9px; text-align: left; }
    th { background: ${dark ? '#292b30' : '#f6f8fa'}; }
    tr { page-break-inside: avoid; }
    hr { height: 1px; border: 0; background: ${dark ? '#44474d' : '#d0d7de'}; }
    ul, ol { padding-left: 2em; }
    .mermaid { text-align: center; page-break-inside: avoid; }
    .mermaid-error { color: #dc2626; }
  </style></head><body><article>${html}</article></body></html>`
}

export function registerDialogHandlers(): void {
  ipcMain.handle('dialog:openFolder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('dialog:showItemInFolder', async (_event, path: string) => {
    shell.showItemInFolder(path)
  })

  ipcMain.handle('dialog:openExternal', async (_event, url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      await shell.openExternal(url)
    }
  })

  ipcMain.handle('dialog:exportMarkdownPdf', async (event, html: string, title: string, suggestedName: string, theme: 'light' | 'dark') => {
    const parent = BrowserWindow.fromWebContents(event.sender)
    if (!parent) return null
    const defaultName = suggestedName.replace(/\.(md|markdown|mdx)$/i, '') + '.pdf'
    const result = await dialog.showSaveDialog(parent, {
      title: 'Export Markdown preview as PDF',
      defaultPath: defaultName,
      filters: [{ name: 'PDF document', extensions: ['pdf'] }]
    })
    if (result.canceled || !result.filePath) return null

    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: false }
    })
    try {
      const document = pdfDocument(html, title, theme)
      await printWindow.loadURL(`data:text/html;charset=utf-8;base64,${Buffer.from(document).toString('base64')}`)
      const pdf = await printWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        generateTaggedPDF: true,
        generateDocumentOutline: true
      })
      await fs.writeFile(result.filePath, pdf)
      return result.filePath
    } finally {
      if (!printWindow.isDestroyed()) printWindow.destroy()
    }
  })
}
