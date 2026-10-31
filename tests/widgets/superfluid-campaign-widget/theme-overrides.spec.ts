import { expect, test, type Page } from '@playwright/test'

const STORY_URL =
  '/iframe.html?id=widgets-superfluidcampaignwidget-theme-overrides--playground&viewMode=story'

async function gotoStory(page: Page) {
  await page.goto(STORY_URL)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
}

test('SuperfluidCampaignWidget Theme Overrides playground applies custom outer card background', async ({ page }) => {
  await gotoStory(page)

  const themedWidget = page.getByTestId('SuperfluidCampaignWidget-themed')
  await expect(themedWidget).toBeVisible()

  // Outer card has backgroundDark override (#1E1B4B -> rgb(30, 27, 75))
  const card = themedWidget.locator('.is_Card').first()
  await expect(card).toBeVisible()
  await expect(card).toHaveCSS('background-color', 'rgb(30, 27, 75)')
})

