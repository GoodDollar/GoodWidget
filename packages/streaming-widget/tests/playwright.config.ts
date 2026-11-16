import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import base from '../../../playwright.config'

export default defineConfig(base, {
  testDir: '.',
  testMatch: 'embedding.spec.ts',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR,
  use: { baseURL: 'http://localhost:6006' },
  webServer: {
    command: 'pnpm storybook',
    cwd: fileURLToPath(new URL('../../../', import.meta.url)),
    url: 'http://localhost:6006',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
