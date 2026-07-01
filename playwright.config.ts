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
 * Playwright traces/videos/attachments are written to test-results/ (gitignored).
 * Spec-authored screenshots can also be written tests/ in a widgets localized folder..
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 15_000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:9009',
    screenshot: 'on',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Required for citizen-claim-widget tests: viem makes cross-origin POST
        // requests to forno.celo.org / rpc.fuse.io from a localhost Storybook page.
        // In sandboxed CI environments the browser's certificate store may not
        // include all CA certs used by RPC providers, hence both flags are needed.
        launchOptions: {
          args: ['--disable-web-security', '--ignore-certificate-errors'],
        },
      },
    },
  ],
  webServer: {
    command: 'pnpm storybook',
    url: 'http://localhost:9009',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  outputDir: 'test-results',
})
