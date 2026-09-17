import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium, expect } from '@playwright/test'

const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const temp = await mkdtemp(join(tmpdir(), 'mdtools-portable-'))
const profile = join(temp, 'profile')
const workspace = join(temp, 'workspace')
await mkdir(profile)
await mkdir(workspace)
await writeFile(join(workspace, 'portable-check.md'), '# Portable check\n\nAlpha alpha Alpha\n')
await writeFile(join(profile, 'settings.json'), JSON.stringify({ lastWorkspace: workspace, editorMode: 'preview', theme: 'dark' }))
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
const processHandle = spawn(resolve(`release/MD-Tools-Portable-${version}.exe`), [
  '--remote-debugging-port=0', `--user-data-dir=${profile}`
], { env, windowsHide: true, stdio: 'ignore' })
let browser
try {
  let port
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]
      break
    } catch { await delay(250) }
  }
  if (!port) throw new Error('Portable app did not expose its debugging endpoint')
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
  const context = browser.contexts()[0]
  const page = context.pages()[0] ?? await context.waitForEvent('page')
  await expect(page.getByText(`Current version: v${version}`)).toBeVisible()
  await page.keyboard.press('Control+p')
  await page.getByRole('textbox', { name: 'Search files and folders' }).fill('portable-check')
  await expect(page.getByRole('dialog').getByRole('button').filter({ hasText: /^portable-check/ })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.locator('.markdown-body')).toContainText('Portable check')
  await page.keyboard.press('Control+f')
  await page.getByRole('textbox', { name: 'Find in document', exact: true }).fill('alpha')
  await expect(page.getByRole('search').getByRole('status')).toHaveText('1 / 3')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('search').getByRole('status')).toHaveText('2 / 3')
  await page.screenshot({ path: 'release/portable-smoke.png' })
  await page.evaluate(() => { void window.api.win.close() })
  console.log(`Portable v${version}: startup, workspace search, document opening, Preview find and navigation passed.`)
} finally {
  await browser?.close()
  for (let attempt = 0; processHandle.exitCode === null && attempt < 40; attempt += 1) await delay(250)
  if (processHandle.exitCode === null) processHandle.kill()
  if (!resolve(temp).startsWith(resolve(tmpdir()) + '\\mdtools-portable-')) throw new Error('Unexpected temporary directory')
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await rm(temp, { recursive: true, force: true })
      break
    } catch (error) {
      if (attempt === 9) throw error
      await delay(500)
    }
  }
}
