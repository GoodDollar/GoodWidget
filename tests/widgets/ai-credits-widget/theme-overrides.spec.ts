import { expect, test, type Page } from '@playwright/test'

const STORY_URL =
  '/iframe.html?id=widgets-aicreditswidget-theme-overrides--playground&viewMode=story'

async function gotoStory(page: Page) {
  await page.goto(STORY_URL)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
}

test('AiCreditsWidget Theme Overrides playground applies custom hero card background', async ({ page }) => {
  await gotoStory(page)

  const themedWidget = page.getByTestId('AiCreditsWidget-themed')
  await expect(themedWidget).toBeVisible()

  const heroCard = themedWidget.locator('.is_Card').filter({ has: page.getByText('Your G$ Balance') }).first()
  await expect(heroCard).toBeVisible()

  // Check that the overridden backgroundSurface (#1E1B4B -> rgb(30, 27, 75)) is applied
  await expect(heroCard).toHaveCSS('background-color', 'rgb(30, 27, 75)')
})

