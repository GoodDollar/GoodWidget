/**
 * playwright.config.ts — Playwright configuration for the GoodWidget demo lab.
 *
 * Targets the Vite dev server at http://localhost:3000.
 *
 * Usage:
 *   # Start the demo server first (or let Playwright start it automatically):
 *   pnpm --filter @goodwidget/example-react-web dev
 *
 *   # Run smoke tests:
 *   pnpm test:demo
 *
 * Screenshots, traces, and optional video artifacts are written to test-results/
 * (gitignored).  Screenshots are always captured; traces are captured on the
 * first retry of a failed test.
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  /** Directory that contains all Playwright spec files. */
  testDir: './tests',

  /**
   * Maximum time a single test can run before being marked as timed out.
   * 30 seconds is generous for a dev server rendering local static pages.
   */
  timeout: 30_000,

  /** Fail fast in CI but allow soft failures locally for faster iteration. */
  forbidOnly: !!process.env.CI,

  /**
   * Retry once on the first failure so flaky animations / mount timing
   * do not produce false negatives, but keep failures obvious.
   */
  retries: process.env.CI ? 2 : 1,

  /** Limit parallelism in CI; local runs can use all available workers. */
  workers: process.env.CI ? 1 : undefined,

  /**
   * Global reporter config.
   * - html: a browsable report at playwright-report/index.html
   * - list: concise per-test output on stdout
   */
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],

  /** Shared settings applied to every test. */
  use: {
    /** Base URL for all page.goto('/...') calls in tests. */
    baseURL: 'http://localhost:3000',

    /**
     * Always capture a screenshot at the end of each test.
     * Stored in test-results/<test-name>/screenshot.png.
     */
    screenshot: 'on',

    /**
     * Capture a Playwright trace on the first retry of a failing test.
     * Open a trace with:  npx playwright show-trace test-results/.../trace.zip
     */
    trace: 'on-first-retry',

    /**
     * Retain video for failing tests only to keep test-results/ from bloating
     * on large smoke suites.
     */
    video: 'retain-on-failure',
  },

  /** Browser projects — Chromium only for now. Add more as needed. */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /**
   * webServer block — Playwright will start the Vite dev server if it is not
   * already running.  `reuseExistingServer: true` lets cloud agents or developers
   * pre-start the server so Playwright does not restart it between runs.
   *
   * Command: pnpm --filter @goodwidget/example-react-web dev
   * URL:     http://localhost:3000
   */
  webServer: {
    command: 'pnpm --filter @goodwidget/example-react-web dev',
    url: 'http://localhost:3000',
    /**
     * Reuse a server that is already listening on :3000.
     * This is important for cloud agent environments where the server is
     * started manually before running tests.
     */
    reuseExistingServer: true,
    /** Allow up to 60 s for Vite to bundle on first start. */
    timeout: 60_000,
  },

  /** Output directory for test artifacts (screenshots, traces, video). */
  outputDir: 'test-results',
})
