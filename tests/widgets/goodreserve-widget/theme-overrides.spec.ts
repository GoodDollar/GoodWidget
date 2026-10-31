import { expect, test, type Page } from '@playwright/test'

const STORY_URL =
  '/iframe.html?id=widgets-goodreservewidget-theme-overrides--playground&viewMode=story'

async function gotoStory(page: Page) {
  await page.goto(STORY_URL)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
}

test('GoodReserveWidget Theme Overrides playground renders with custom theme overrides', async ({ page }) => {
  await gotoStory(page)

  const themedWidget = page.getByTestId('GoodReserveWidget-themed')
  await expect(themedWidget).toBeVisible()

  // Verify swap UI rendered inside the themed widget
  const shell = page.getByTestId('GoodReserveWidget-shell').first()
  await expect(shell).toBeVisible()

  // Check that swap shell backgroundSurface override (#1E1B4B -> rgb(30, 27, 75)) is applied
  await expect(shell).toHaveCSS('background-color', 'rgb(30, 27, 75)')
})

