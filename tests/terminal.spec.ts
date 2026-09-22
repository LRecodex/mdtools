import { test, expect, _electron as electron } from '@playwright/test'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

test('integrated terminal uses a real interactive PTY', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'mdtools-terminal-'))
  const profile = join(temp, 'profile')
  await mkdir(profile)
  const executablePath = process.env.MDTOOLS_TEST_EXECUTABLE
  const app = await electron.launch({
    executablePath,
    args: [...(executablePath ? [] : [resolve('out/main/index.js')]), `--user-data-dir=${profile}`],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }
  })
  try {
    const page = await app.firstWindow()
    await page.getByRole('button', { name: 'Show terminal' }).click()
    await expect(page.locator('.terminal-panel')).toBeVisible()
    const terminal = page.locator('.xterm')
    await expect(terminal).toBeVisible()
    await page.keyboard.type('echo MDTOOLS_PTY_OK')
    await page.keyboard.press('Enter')
    await expect.poll(() => terminal.locator('.xterm-rows').innerText()).toContain('MDTOOLS_PTY_OK')
  } finally {
    await app.close()
    await rm(temp, { recursive: true, force: true })
  }
})
