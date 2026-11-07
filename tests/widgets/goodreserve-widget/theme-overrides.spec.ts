import { expect, test, type Page } from '@playwright/test'

const STORY_URL =
  '/iframe.html?id=widgets-goodreservewidget-theme-overrides--playground&viewMode=story'

async function gotoStory(page: Page, extraArgs = '') {
  const url = extraArgs ? `${STORY_URL}&args=${extraArgs}` : STORY_URL
  await page.goto(url)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
}

test('GoodReserveWidget Theme Overrides playground renders in dark mode and updates dynamically in-place', async ({
  page,
}) => {
  await gotoStory(page, 'defaultTheme:dark')

  const themedWidget = page.getByTestId('GoodReserveWidget-themed')
  await expect(themedWidget).toBeVisible({ timeout: 15000 })

  const shell = page.getByTestId('GoodReserveWidget-shell').first()
  await expect(shell).toBeVisible()
  // Default dark backgroundSurface (#1E1B4B -> rgb(30, 27, 75))
  await expect(shell).toHaveCSS('background-color', 'rgb(30, 27, 75)')

  const amountCard = page.getByTestId('GoodReserveWidget-amount-card-from').first()
  await expect(amountCard).toBeVisible()
  // Default dark backgroundInput (#0F172A -> rgb(15, 23, 42))
  await expect(amountCard).toHaveCSS('background-color', 'rgb(15, 23, 42)')

  const submitButton = themedWidget.locator('.is_Button').first()
  await expect(submitButton).toBeVisible()
  // Default dark_Button (#7C3AED -> rgb(124, 58, 237))
  await expect(submitButton).toHaveCSS('background-color', 'rgb(124, 58, 237)')

  await page.screenshot({
    path: 'tests/widgets/goodreserve-widget/test-results/grw-theme-overrides-dark.png',
    fullPage: true,
  })

  // Dynamically update controls in-place via Storybook addon channel
  await page.evaluate(() => {
    const channel = (window as unknown as { __STORYBOOK_ADDONS_CHANNEL__?: { emit: (event: string, data: unknown) => void } })
      .__STORYBOOK_ADDONS_CHANNEL__
    channel?.emit('updateStoryArgs', {
      storyId: 'widgets-goodreservewidget-theme-overrides--playground',
      updatedArgs: {
        swapShellBackgroundDark: '#e11d48',
        amountCardBackgroundDark: '#059669',
        submitButtonBackground: '#2563eb',
      },
    })
  })

  // Verify that controls dynamically rewired into base tokens update live styles
  await expect(shell).toHaveCSS('background-color', 'rgb(225, 29, 72)', { timeout: 5000 })
  await expect(amountCard).toHaveCSS('background-color', 'rgb(5, 150, 105)', { timeout: 5000 })
  await expect(submitButton).toHaveCSS('background-color', 'rgb(37, 99, 235)', { timeout: 5000 })

  await page.screenshot({
    path: 'tests/widgets/goodreserve-widget/test-results/grw-theme-overrides-custom.png',
    fullPage: true,
  })
})

test('GoodReserveWidget Theme Overrides playground renders in light mode with custom background overrides', async ({
  page,
}) => {
  await gotoStory(page, 'defaultTheme:light')

  const themedWidget = page.getByTestId('GoodReserveWidget-themed')
  await expect(themedWidget).toBeVisible({ timeout: 15000 })

  const shell = page.getByTestId('GoodReserveWidget-shell').first()
  await expect(shell).toBeVisible()
  await expect(shell).toHaveCSS('background-color', 'rgb(224, 231, 255)')

  const amountCard = page.getByTestId('GoodReserveWidget-amount-card-from').first()
  await expect(amountCard).toBeVisible()
  await expect(amountCard).toHaveCSS('background-color', 'rgb(211, 220, 254)')

  await page.screenshot({
    path: 'tests/widgets/goodreserve-widget/test-results/grw-theme-overrides-light.png',
    fullPage: true,
  })
})
