/**
 * smoke.spec.ts — Playwright smoke tests for the GoodWidget demo lab.
 *
 * These tests verify that each demo route renders without JavaScript errors
 * and that at least one key element is visible by its data-testid.  They
 * are intentionally broad ("smoke") rather than exhaustive unit tests.
 *
 * Running:
 *   pnpm test:demo
 *
 * Prerequisites:
 *   - Demo server is running on http://localhost:3000  (or Playwright starts it).
 *   - Playwright Chromium browser is installed: pnpm exec playwright install chromium
 *
 * Artifact output:
 *   test-results/  — screenshots, traces, optional video (gitignored)
 *
 * data-testid naming convention:
 *   ComponentName-variant   e.g. Button-primary, Alert-error, ClaimWidget-default
 *   tab-<key>               e.g. tab-default, tab-tokens  (theme override tabs)
 *   nav-<Name>              e.g. nav-Button, nav-ClaimWidget  (index nav links)
 */
import { test, expect, Page } from '@playwright/test'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Navigate to a route, wait for the page to be network-idle, and take a
 * labelled screenshot.  Returns the page so callers can make further assertions.
 */
async function goto(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

// ─── Index page ───────────────────────────────────────────────────────────────

test('index page renders navigation links', async ({ page }) => {
  await goto(page, '/')

  // At least the Button nav link must be visible
  await expect(page.getByTestId('nav-Button')).toBeVisible()
  await expect(page.getByTestId('nav-ClaimWidget')).toBeVisible()

  await page.screenshot({ path: 'test-results/index.png' })
})

// ─── Theme overrides page (all 5 tabs) ────────────────────────────────────────

test('theme-overrides page cycles all 5 tabs', async ({ page }) => {
  await goto(page, '/theme-overrides')

  const tabs = ['default', 'tokens', 'component', 'host', 'inline'] as const

  for (const tab of tabs) {
    // Click the tab button
    await page.getByTestId(`tab-${tab}`).click()
    // Wait for content to settle
    await page.waitForTimeout(300)
    // Screenshot each tab state
    await page.screenshot({ path: `test-results/theme-overrides-${tab}.png` })
  }
})

// ─── Per-component routes ─────────────────────────────────────────────────────

/**
 * Map of route path → expected testid that must be visible.
 * Keep one representative testid per page — not an exhaustive list.
 */
const COMPONENT_SMOKE_CASES: { path: string; testId: string }[] = [
  { path: '/components/button', testId: 'Button-primary' },
  { path: '/components/input', testId: 'Input-default' },
  { path: '/components/alert', testId: 'Alert-error' },
  { path: '/components/badge', testId: 'Badge-info' },
  { path: '/components/spinner', testId: 'Spinner-md' },
  { path: '/components/select', testId: 'Select-default' },
  { path: '/components/checkbox', testId: 'Checkbox-default' },
  { path: '/components/switch', testId: 'Switch-default' },
  { path: '/components/separator', testId: 'Separator-horizontal' },
  { path: '/components/card', testId: 'Card-default' },
  { path: '/components/glowcard', testId: 'GlowCard-default' },
  { path: '/components/heading', testId: 'Heading-h1' },
  { path: '/components/text', testId: 'Text-body' },
  { path: '/components/walletinfo', testId: 'WalletInfo-connected' },
  { path: '/components/tokenamount', testId: 'TokenAmount-default' },
  { path: '/components/addressdisplay', testId: 'AddressDisplay-default' },
  { path: '/components/chainbadge', testId: 'ChainBadge-celo' },
  { path: '/components/toast', testId: 'Toast-success' },
  { path: '/components/actionsheet', testId: 'ActionSheet-trigger' },
  { path: '/components/drawer', testId: 'Drawer-trigger' },
]

for (const { path, testId } of COMPONENT_SMOKE_CASES) {
  // Derive a human-readable test name from the path segment
  const name = path.replace('/components/', '')

  test(`/components/${name} — ${testId} is visible`, async ({ page }) => {
    await goto(page, path)

    // The key element must be visible
    await expect(page.getByTestId(testId)).toBeVisible()

    // Screenshot for visual review
    await page.screenshot({ path: `test-results/component-${name}.png` })
  })
}

// ─── ClaimWidget route ────────────────────────────────────────────────────────

test('/widget/claim renders ClaimWidget in mock-connected state', async ({ page }) => {
  await goto(page, '/widget/claim')

  // The default ClaimWidget instance must be visible
  await expect(page.getByTestId('ClaimWidget-default')).toBeVisible()

  // The cobalt and teal override instances must also render
  await expect(page.getByTestId('ClaimWidget-cobalt')).toBeVisible()
  await expect(page.getByTestId('ClaimWidget-teal')).toBeVisible()

  await page.screenshot({ path: 'test-results/widget-claim.png' })
})
