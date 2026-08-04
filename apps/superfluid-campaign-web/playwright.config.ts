import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3002',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'pnpm --filter @goodwidget/superfluid-campaign-web dev --host 127.0.0.1',
    url: 'http://127.0.0.1:3002',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  outputDir: '../../test-results/superfluid-campaign-web',
})
