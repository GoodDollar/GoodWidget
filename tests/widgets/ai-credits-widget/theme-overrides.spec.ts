import { expect, test, type Page } from '@playwright/test'

const STORY_URL =
  '/iframe.html?id=widgets-aicreditswidget-theme-overrides--playground&viewMode=story'

async function gotoStory(page: Page, extraArgs = '') {
  const url = extraArgs ? `${STORY_URL}&args=${extraArgs}` : STORY_URL
  await page.goto(url)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
}

test('AiCreditsWidget Theme Overrides playground renders in dark mode with custom hero card background', async ({
  page,
}) => {
  await gotoStory(page, 'defaultTheme:dark')

  const themedWidget = page.getByTestId('AiCreditsWidget-themed')
  await expect(themedWidget).toBeVisible({ timeout: 15000 })

  const heroCard = themedWidget.locator('.is_Card').filter({ has: page.getByText('Your G$ Balance') }).first()
  await expect(heroCard).toBeVisible()

  // Check that the overridden backgroundSurface (#1E1B4B -> rgb(30, 27, 75)) is applied
  await expect(heroCard).toHaveCSS('background-color', 'rgb(30, 27, 75)')

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-theme-overrides-dark.png',
  })
})

test('AiCreditsWidget Theme Overrides playground renders in light mode with custom hero card background', async ({
  page,
}) => {
  await gotoStory(page, 'defaultTheme:light')

  const themedWidget = page.getByTestId('AiCreditsWidget-themed')
  await expect(themedWidget).toBeVisible({ timeout: 15000 })

  const heroCard = themedWidget.locator('.is_Card').filter({ has: page.getByText('Your G$ Balance') }).first()
  await expect(heroCard).toBeVisible()

  await expect(heroCard).toHaveCSS('background-color', 'rgb(30, 27, 75)')

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-theme-overrides-light.png',
  })
})
