/**
 * claimwidget-screenshots.spec.ts — targeted screenshot captures for the
 * current ClaimWidget theme demo and the dark ThemePlayground baseline.
 *
 * This is intentionally separate from smoke.spec.ts so it only tracks the
 * two live stories we actually want screenshots for:
 *   - Widgets/ClaimWidget Theme Demo/Showcase
 *   - Design System/Theming/Override Playground (Default Preset)
 */
import { test, expect, Page } from '@playwright/test'

async function gotoStory(page: Page, storyId: string): Promise<void> {
  await page.goto(`/?path=/story/${storyId}`)
  await page.waitForSelector('#storybook-preview-iframe', { timeout: 30_000 })
  await page.waitForLoadState('networkidle')
}

function getStoryFrame(page: Page) {
  return page.frameLocator('#storybook-preview-iframe')
}

test('ClaimWidget light preset demo renders and captures screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 1100 })
  await gotoStory(page, 'widgets-claimwidget-theme-demo-showcase--light-theme')
  const frame = getStoryFrame(page)
  await expect(frame.locator('[data-testid="ClaimWidget-light"]')).toBeVisible()
  await page.locator('#storybook-preview-iframe').screenshot({
    path: 'tests/design-system/test-results/claimwidget-light-gooddapp.png',
  })
})

test('ThemePlayground dark baseline renders and captures screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 1100 })
  await gotoStory(page, 'design-system-theming-override-playground--default-preset')
  const frame = getStoryFrame(page)
  await expect(frame.locator('text=Preset Baseline')).toBeVisible()
  await page.locator('#storybook-preview-iframe').screenshot({
    path: 'tests/design-system/test-results/claimwidget-dark-gwv2.png',
  })
})
