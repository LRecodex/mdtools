import { test, expect, _electron as electron } from '@playwright/test'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import ExcelJS from 'exceljs'

test('search, folder navigation, document find and responsive status bar', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'mdtools-search-'))
  const profile = join(temp, 'profile')
  const workspace = join(temp, 'workspace')
  const nested = join(workspace, 'collection', 'calculation layer', 'notes')
  await mkdir(nested, { recursive: true })
  await mkdir(profile)
  const path = join(nested, 'rate-calculation-reference.md')
  const content = '# Rate reference\n\nAlpha alpha **Alpha**\n\n' + 'A long example paragraph for status bar layout.\n\n'.repeat(500) + '\nFinalNeedle\n'
  await writeFile(path, content)
  await writeFile(join(workspace, 'policies.md'), '# Reference\n\nThe HP Act applies to this example.\n')
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Formula demo')
  worksheet.getCell('A1').value = 6
  worksheet.getCell('B1').value = 7
  worksheet.getCell('C1').value = { formula: 'A1*B1', result: 42 }
  worksheet.getCell('D1').value = 'Merged title'
  worksheet.mergeCells('D1:E1')
  worksheet.getColumn(1).width = 20
  worksheet.views = [{ state: 'frozen', ySplit: 1, topLeftCell: 'A2', activeCell: 'C1', zoomScale: 115 }]
  worksheet.addRow([1, 2, 3, 4, 5]).hidden = true
  const hiddenSheet = workbook.addWorksheet('Hidden calculations')
  hiddenSheet.state = 'hidden'
  const spreadsheetPath = join(workspace, 'formula-demo.xlsx')
  await workbook.xlsx.writeFile(spreadsheetPath)
  await writeFile(join(profile, 'settings.json'), JSON.stringify({ lastWorkspace: workspace, editorMode: 'preview', theme: 'dark', sidebarWidth: 400, windowBounds: { width: 1280, height: 800 } }))
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  const executablePath = process.env.MDTOOLS_TEST_EXECUTABLE
  const app = await electron.launch({
    executablePath,
    args: [...(executablePath ? [] : [resolve('out/main/index.js')]), `--user-data-dir=${profile}`],
    env
  })
  try {
    const page = await app.firstWindow()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.getByRole('button', { name: 'Support LRecodex', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Support LRecodex' }).getByRole('img', { name: 'Maybank QR code for donating to LRecodex' })).toBeVisible()
    await page.getByRole('button', { name: 'Close donation', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Search files and folders (Ctrl+P)', exact: true })).toBeVisible()
    await page.keyboard.press('Control+p')
    const search = page.getByRole('textbox', { name: 'Search files and folders' })
    await search.fill('calculation notes')
    const dialog = page.getByRole('dialog', { name: 'Search files and folders' })
    await expect(dialog.getByRole('button').filter({ hasText: /^notes/ })).toBeVisible()
    await dialog.getByRole('button').filter({ hasText: /^notes/ }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('treeitem', { name: 'notes', exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('treeitem', { name: 'rate-calculation-reference.md', exact: true })).toBeVisible()
    await page.keyboard.press('Control+p')
    await search.fill('no-such-document-xyz')
    await expect(dialog.getByText('No matching files, folders, or file contents')).toBeVisible()
    await search.fill('HP act')
    const contentResult = dialog.getByRole('button').filter({ hasText: /^policies\.md/ })
    await expect(contentResult).toBeVisible()
    await expect(contentResult).toContainText('The HP Act applies to this example.')
    await search.fill('reference')
    await expect(dialog.getByRole('button').filter({ hasText: /^rate-calculation-reference/ })).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.locator('.markdown-body')).toContainText('Rate reference')
    await page.keyboard.press('Control+f')
    const find = page.getByRole('textbox', { name: 'Find in document', exact: true })
    await find.fill('alpha')
    const findBar = page.getByRole('search', { name: 'Find in document' })
    await expect(findBar.getByRole('status')).toHaveText('1 / 3')
    for (let theme = 0; theme < 3; theme += 1) {
      await page.keyboard.press('Control+,')
      await expect.poll(() => page.evaluate(() => {
        const ranges = [...(CSS as any).highlights.get('document-matches')]
        return ranges.length === 3 && ranges.every((range: Range) => range.startContainer.isConnected)
      })).toBe(true)
    }
    await page.screenshot({ path: 'test-results/preview-find.png' })
    await page.keyboard.press('Enter')
    await expect(findBar.getByRole('status')).toHaveText('2 / 3')
    await page.keyboard.press('Shift+Enter')
    await expect(findBar.getByRole('status')).toHaveText('1 / 3')
    await page.getByRole('button', { name: 'Match case', exact: true }).click()
    await expect(findBar.getByRole('status')).toHaveText('1 / 1')
    await find.fill('Alpha alpha Alpha')
    await expect(findBar.getByRole('status')).toHaveText('1 / 1')
    await find.fill('FinalNeedle')
    await expect(findBar.getByRole('status')).toHaveText('1 / 1')
    await expect.poll(() => page.locator('.markdown-body').evaluate((root) => root.parentElement!.scrollTop)).toBeGreaterThan(1000)
    await find.fill('not-present')
    await expect(findBar.getByRole('status')).toHaveText('0 / 0')
    await page.keyboard.press('Escape')
    await expect(findBar).toBeHidden()
    expect(await page.evaluate(() => (CSS as any).highlights.size)).toBe(0)

    for (const width of [1280, 960, 760]) {
      await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setSize(width, 800), width)
      await expect.poll(() => page.evaluate(() => innerWidth)).toBe(width)
      const layout = await page.locator('.status-bar').evaluate((bar) => {
        const box = bar.getBoundingClientRect()
        return [...bar.querySelectorAll('span, button')].filter((node) => getComputedStyle(node).display !== 'none').every((node) => {
          const rect = node.getBoundingClientRect()
          return rect.top >= box.top && rect.bottom <= box.bottom && rect.right <= box.right && rect.height <= 24
        })
      })
      expect(layout).toBe(true)
      for (const name of ['Find in document', 'PDF', 'Templates', 'Source', 'Split', 'Preview']) {
        const bounds = await page.getByRole('button', { name, exact: true }).boundingBox()
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
      }
      await page.screenshot({ path: `test-results/status-${width}.png` })
    }
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 800))
    await page.getByRole('button', { name: 'Source', exact: true }).click()
    await page.getByRole('button', { name: 'Find in document', exact: true }).click()
    const cmFind = page.locator('.cm-search input[name="search"]')
    await cmFind.pressSequentially('FinalNeedle')
    await page.keyboard.press('Enter')
    await expect(page.locator('.cm-selectionMatch, .cm-searchMatch-selected').first()).toContainText('FinalNeedle')
    await page.screenshot({ path: 'test-results/source-find.png' })
    await page.locator('.cm-search input[name="replace"]').pressSequentially('UpdatedNeedle')
    await page.locator('.cm-search button[name="replace"]').click()
    await page.keyboard.press('Control+s')
    await expect.poll(async () => (await readFile(path, 'utf8')).includes('UpdatedNeedle')).toBe(true)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Split', exact: true }).click()
    await page.keyboard.press('Control+f')
    await expect(cmFind).toBeVisible()
    await cmFind.fill('Alpha')
    await cmFind.dispatchEvent('change')
    await page.keyboard.press('Enter')
    await expect(page.locator('.cm-searchMatch-selected')).toContainText('Alpha')
    await page.keyboard.press('Escape')
    await page.getByRole('treeitem', { name: 'formula-demo.xlsx', exact: true }).dblclick()
    await page.getByRole('button', { name: 'Spreadsheet cell C1, formula', exact: true }).click()
    await expect(page.getByText('Result: 42')).toBeVisible()
    await expect(page.getByText('A1*B1')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Spreadsheet cell A1', exact: true })).toHaveClass(/border-rose-400/)
    await expect(page.getByRole('button', { name: 'Spreadsheet cell B1', exact: true })).toHaveClass(/border-sky-400/)
    await expect(page.getByText('Frozen: 1 row')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reset spreadsheet zoom', exact: true })).toHaveText('115%')
    await page.getByRole('textbox', { name: 'Go to spreadsheet cell', exact: true }).fill('A1')
    await page.getByRole('textbox', { name: 'Go to spreadsheet cell', exact: true }).press('Enter')
    await expect(page.getByText('A1', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Show hidden sheets', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Hidden calculations (hidden)', exact: true })).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app.close()
    await rm(temp, { recursive: true, force: true })
  }
})
