/**
 * smoke.spec.ts — Playwright smoke tests for the GoodWidget Storybook.
 *
 * Tests navigate to Storybook story URLs and verify key elements render.
 * Storybook story URLs follow the pattern:
 *   http://localhost:6006/?path=/story/<story-id>
 *
 * Story IDs are derived from the story title and story name:
 *   title: 'Primitives/Card' + name: 'Default' → primitives-card--default
 *
 * Running:
 *   pnpm test:storybook   (uses @storybook/test-runner — interaction + play tests)
 *
 *   For Playwright screenshot/trace tests:
 *   pnpm test:demo        (if kept in root package.json)
 *
 * Artifact output:
 *   tests/design-system/test-results/  — local screenshots from this spec
 *   test-results/                      — Playwright traces/videos/attachments (gitignored)
 *
 * data-testid naming convention:
 *   ComponentName-variant   e.g. Card-default, GlowCard-default, ClaimWidget-default
 */
import { test, expect, Page } from '@playwright/test'

/** Navigate to a Storybook story URL and wait for the canvas to render. */
async function gotoStory(page: Page, storyId: string): Promise<void> {
  await page.goto(`/?path=/story/${storyId}`)
  // Wait for Storybook to finish loading the story (the canvas iframe appears)
  await page.waitForSelector('#storybook-preview-iframe', { timeout: 30_000 })
  await page.waitForLoadState('networkidle')
}

/** Get the content frame inside the Storybook canvas iframe. */
function getStoryFrame(page: Page) {
  return page.frameLocator('#storybook-preview-iframe')
}

test('Card/Default story renders', async ({ page }) => {
  await gotoStory(page, 'primitives-card--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('Card-default')).toBeVisible()
  await page.screenshot({
    path: 'tests/design-system/test-results/story-card-default.png',
    fullPage: true,
  })
})

test('GlowCard/Default story renders', async ({ page }) => {
  await gotoStory(page, 'primitives-glowcard--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('GlowCard-default')).toBeVisible()
  await page.screenshot({
    path: 'tests/design-system/test-results/story-glowcard-default.png',
    fullPage: true,
  })
})

test('Drawer/Default story renders trigger', async ({ page }) => {
  await gotoStory(page, 'primitives-drawer--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('Drawer-trigger')).toBeVisible()
  await page.screenshot({
    path: 'tests/design-system/test-results/story-drawer-default.png',
    fullPage: true,
  })
})

test('TokenAmount/Default story renders', async ({ page }) => {
  await gotoStory(page, 'primitives-tokenamount--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('TokenAmount-default')).toBeVisible()
  await page.screenshot({
    path: 'tests/design-system/test-results/story-tokenamount-default.png',
    fullPage: true,
  })
})

test('ClaimWidget/Default story renders in mock-connected state', async ({ page }) => {
  await gotoStory(page, 'theme-claimwidgetthemedemo-light--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('ClaimWidget-default')).toBeVisible()
  await page.screenshot({
    path: 'tests/design-system/test-results/story-claimwidget-default.png',
    fullPage: true,
  })
})

test('ThemePlayground/DefaultPreset story renders', async ({ page }) => {
  await gotoStory(page, 'theme-themeplayground--default-preset')
  const frame = getStoryFrame(page)
  await expect(frame.locator('text=Preset Baseline')).toBeVisible()
  await page.screenshot({
    path: 'tests/design-system/test-results/story-theme-default.png',
    fullPage: true,
  })
})
