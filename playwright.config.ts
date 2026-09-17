import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 90000,
  workers: 1,
  use: { trace: 'retain-on-failure' }
})
