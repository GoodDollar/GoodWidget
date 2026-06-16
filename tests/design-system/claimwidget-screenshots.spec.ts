/**
 * claimwidget-screenshots.spec.ts — targeted screenshot captures for the
 * current ClaimWidget demo and the dark ThemePlayground baseline.
 *
 * This is intentionally separate from smoke.spec.ts so it only tracks the
 * two live stories we actually want screenshots for:
 *   - Theme/ClaimWidgetThemeDemo-Light
 *   - Theme/ThemePlayground (Default Preset)
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

test('ClaimWidget light demo renders and captures screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 1100 })
  await gotoStory(page, 'theme-claimwidgetthemedemo-light--default')
  const frame = getStoryFrame(page)
  await expect(frame.locator('[data-testid="ClaimWidget-default"]')).toBeVisible()
  await page.locator('#storybook-preview-iframe').screenshot({
    path: 'tests/design-system/test-results/claimwidget-light-gooddapp.png',
  })
})

test('ThemePlayground dark baseline renders and captures screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 1100 })
  await gotoStory(page, 'theme-themeplayground--default-preset')
  const frame = getStoryFrame(page)
  await expect(frame.locator('text=Preset Baseline')).toBeVisible()
  await page.locator('#storybook-preview-iframe').screenshot({
    path: 'tests/design-system/test-results/claimwidget-dark-gwv2.png',
  })
})
