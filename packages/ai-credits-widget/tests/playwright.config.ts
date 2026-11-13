import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

export default defineConfig({
  testDir: path.join(root, 'packages'),
  testMatch: '**/tests/hide-header.spec.ts',
  outputDir: path.join(root, 'test-results/widget-header-adaptations'),
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:6017',
    launchOptions: { args: ['--disable-web-security', '--ignore-certificate-errors'] },
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm --filter @goodwidget/storybook exec storybook dev -p 6017 --ci --no-open',
    cwd: root,
    url: 'http://localhost:6017',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
