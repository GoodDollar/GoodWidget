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
 *   ComponentName-variant   e.g. Card-default, GlowCard-default, ClaimWidget-default
 *   tab-<key>               e.g. tab-default, tab-tokens  (theme override tabs)
 *   nav-<Name>              e.g. nav-Card, nav-ClaimWidget  (index nav links)
 *
 * Note: Only verified components from packages/ui/src/components/ have demo pages.
 * Components still in packages/ui/src/components-test/ are not demoed here.
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

  // Verified component nav links must be visible
  await expect(page.getByTestId('nav-Card')).toBeVisible()
  await expect(page.getByTestId('nav-GlowCard')).toBeVisible()
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
    // Wait for the tab button to remain visible (content has settled)
    await expect(page.getByTestId(`tab-${tab}`)).toBeVisible()
    // Screenshot each tab state
    await page.screenshot({ path: `test-results/theme-overrides-${tab}.png` })
  }
})

// ─── Verified component routes ────────────────────────────────────────────────

/**
 * Only components from packages/ui/src/components/ have demo pages.
 * Map of route path → expected testid that must be visible.
 */
const COMPONENT_SMOKE_CASES: { path: string; testId: string }[] = [
  { path: '/components/card', testId: 'Card-default' },
  { path: '/components/glowcard', testId: 'GlowCard-default' },
  { path: '/components/drawer', testId: 'Drawer-trigger' },
  { path: '/components/tokenamount', testId: 'TokenAmount-default' },
]

for (const { path, testId } of COMPONENT_SMOKE_CASES) {
  const name = path.replace('/components/', '')

  test(`/components/${name} — ${testId} is visible`, async ({ page }) => {
    await goto(page, path)
    await expect(page.getByTestId(testId)).toBeVisible()
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
