import { expect, test, type Page } from '@playwright/test'

const STORY_URL =
  '/iframe.html?id=widgets-aicreditswidget-theme-overrides--playground&viewMode=story'

async function gotoStory(page: Page, extraArgs = '') {
  const url = extraArgs ? `${STORY_URL}&args=${extraArgs}` : STORY_URL
  await page.goto(url)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
}

test('AiCreditsWidget Theme Overrides playground renders in dark mode and updates dynamically in-place', async ({
  page,
}) => {
  await gotoStory(page, 'defaultTheme:dark')

  const themedWidget = page.getByTestId('AiCreditsWidget-themed')
  await expect(themedWidget).toBeVisible({ timeout: 15000 })

  const heroCard = themedWidget.locator('.is_Card').filter({ has: page.getByText('Your G$ Balance') }).first()
  await expect(heroCard).toBeVisible()
  // Check that the initial overridden backgroundSurface (#1E1B4B -> rgb(30, 27, 75)) is applied
  await expect(heroCard).toHaveCSS('background-color', 'rgb(30, 27, 75)')

  const buyButton = themedWidget.locator('button').filter({ hasText: 'Buy AI Credits' }).first()
  await expect(buyButton).toBeVisible()
  // Default dark_Button (#7C3AED -> rgb(124, 58, 237))
  await expect(buyButton).toHaveCSS('background-color', 'rgb(124, 58, 237)')

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-theme-overrides-dark.png',
  })

  // Dynamically update controls in-place via Storybook addon channel
  await page.evaluate(() => {
    const channel = (window as unknown as { __STORYBOOK_ADDONS_CHANNEL__?: { emit: (event: string, data: unknown) => void } })
      .__STORYBOOK_ADDONS_CHANNEL__
    channel?.emit('updateStoryArgs', {
      storyId: 'widgets-aicreditswidget-theme-overrides--playground',
      updatedArgs: {
        heroBackground: '#0284c7',
        buttonBackground: '#dc2626',
      },
    })
  })

  // Verify that controls dynamically rewired into base tokens update live styles
  await expect(heroCard).toHaveCSS('background-color', 'rgb(2, 132, 199)', { timeout: 5000 })
  await expect(buyButton).toHaveCSS('background-color', 'rgb(220, 38, 38)', { timeout: 5000 })

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-theme-overrides-custom.png',
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
