/**
 * playwright.config.ts — Playwright configuration for the GoodWidget Storybook.
 *
 * Targets the Storybook dev server at http://localhost:6006.
 *
 * Usage:
 *   # Start Storybook first:
 *   pnpm storybook
 *
 *   # Run Playwright tests against Storybook story URLs:
 *   pnpm test:demo
 *
 *   # Run Storybook's built-in test runner (interaction + play function tests):
 *   pnpm test:storybook
 *
 * Screenshots, traces, and optional video artifacts are written to test-results/
 * (gitignored).
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:6006',
    screenshot: 'on',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm storybook',
    url: 'http://localhost:6006',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  outputDir: 'test-results',
})

