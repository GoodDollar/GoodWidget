/**
 * smoke.spec.ts — Playwright smoke tests for the GoodWidget Storybook.
 *
 * Tests navigate to Storybook story URLs and verify key elements render.
 * Storybook story URLs follow the pattern:
 *   http://localhost:6006/?path=/story/<story-id>
 *
 * Story IDs are derived from the story title and story name:
 *   title: 'Design System/Primitives/Card' + name: 'Default'
 *   → design-system-primitives-card--default
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

/** Capture only the rendered story canvas, excluding Storybook chrome. */
async function screenshotStory(page: Page, path: string): Promise<void> {
  await page.locator('#storybook-preview-iframe').screenshot({ path })
}

test('Card/Default story renders', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-card--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('Card-default')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-card-default.png')
})

test('GlowCard/Default story renders', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-glowcard--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('GlowCard-default')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-glowcard-default.png')
})

test('Drawer/Default story renders trigger', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-drawer--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('Drawer-trigger')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-drawer-default.png')
})

test('TokenAmount/Default story renders', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-tokenamount--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('TokenAmount-default')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-tokenamount-default.png')
})

test('ClaimWidget/Default story renders in mock-connected state', async ({ page }) => {
  await gotoStory(page, 'widgets-claimwidget-theme-demo-showcase--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('ClaimWidget-default')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-claimwidget-default.png')
})

test('ClaimWidget/LightTheme story renders', async ({ page }) => {
  await gotoStory(page, 'widgets-claimwidget-theme-demo-showcase--light-theme')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('ClaimWidget-light')).toBeVisible()
})

test('ClaimWidget/CobaltBrand story renders', async ({ page }) => {
  await gotoStory(page, 'widgets-claimwidget-theme-demo-showcase--cobalt-brand')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('ClaimWidget-cobalt')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-claimwidget-cobalt.png')
})

test('ClaimWidget/TealBrand story renders', async ({ page }) => {
  await gotoStory(page, 'widgets-claimwidget-theme-demo-showcase--teal-brand')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('ClaimWidget-teal')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-claimwidget-teal.png')
})

test('ThemePlayground/DefaultPreset story renders', async ({ page }) => {
  await gotoStory(page, 'design-system-theming-override-playground--default-preset')
  const frame = getStoryFrame(page)
  await expect(frame.locator('text=Preset Baseline')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-theme-default.png')
})
