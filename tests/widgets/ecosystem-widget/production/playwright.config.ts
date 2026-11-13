import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../../..')
const config = JSON.stringify(resolve(__dirname, 'vite.config.ts'))

export default defineConfig({
  testDir: __dirname,
  testMatch: '*.production.ts',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  outputDir: resolve(root, 'test-results/ecosystem-production'),
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4178',
    trace: 'retain-on-failure',
  },
  webServer: {
    cwd: root,
    command: `pnpm --filter @goodwidget/example-react-web exec vite build --config ${config} && pnpm --filter @goodwidget/example-react-web exec vite preview --config ${config} --host 127.0.0.1 --port 4178 --strictPort`,
    url: 'http://127.0.0.1:4178/widget-chunks.json',
    reuseExistingServer: false,
    timeout: 300_000,
  },
})
