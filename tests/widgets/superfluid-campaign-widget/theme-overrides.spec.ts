import { expect, test, type Page } from '@playwright/test'

const STORY_URL =
  '/iframe.html?id=widgets-superfluidcampaignwidget-theme-overrides--playground&viewMode=story'

async function gotoStory(page: Page, extraArgs = '') {
  const url = extraArgs ? `${STORY_URL}&args=${extraArgs}` : STORY_URL
  await page.goto(url)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
}

test('SuperfluidCampaignWidget Theme Overrides playground renders in dark mode with custom overrides', async ({
  page,
}) => {
  await gotoStory(page, 'defaultTheme:dark')

  const themedWidget = page.getByTestId('SuperfluidCampaignWidget-themed')
  await expect(themedWidget).toBeVisible({ timeout: 15000 })

  // Outer card has backgroundDark override (#1E1B4B -> rgb(30, 27, 75))
  const card = themedWidget.locator('.is_Card').first()
  await expect(card).toBeVisible()
  await expect(card).toHaveCSS('background-color', 'rgb(30, 27, 75)')

  // Button has dark_Button override (#7C3AED -> rgb(124, 58, 237))
  const button = themedWidget.locator('.is_Button').first()
  await expect(button).toBeVisible()
  await expect(button).toHaveCSS('background-color', 'rgb(124, 58, 237)')

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-theme-overrides-dark.png',
  })
})

test('SuperfluidCampaignWidget Theme Overrides playground renders in light mode with custom overrides', async ({
  page,
}) => {
  await gotoStory(page, 'defaultTheme:light')

  const themedWidget = page.getByTestId('SuperfluidCampaignWidget-themed')
  await expect(themedWidget).toBeVisible({ timeout: 15000 })

  const card = themedWidget.locator('.is_Card').first()
  await expect(card).toBeVisible()
  await expect(card).toHaveCSS('background-color', 'rgb(30, 27, 75)')

  const button = themedWidget.locator('.is_Button').first()
  await expect(button).toBeVisible()
  await expect(button).toHaveCSS('background-color', 'rgb(124, 58, 237)')

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-theme-overrides-light.png',
  })
})
