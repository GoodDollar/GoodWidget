import { expect, test, type Page } from '@playwright/test'

const STORY_URL =
  '/iframe.html?id=widgets-goodreservewidget-theme-overrides--playground&viewMode=story'

async function gotoStory(page: Page, extraArgs = '') {
  const url = extraArgs ? `${STORY_URL}&args=${extraArgs}` : STORY_URL
  await page.goto(url)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
}

test('GoodReserveWidget Theme Overrides playground renders in dark mode with custom background overrides', async ({
  page,
}) => {
  await gotoStory(page, 'defaultTheme:dark')

  const themedWidget = page.getByTestId('GoodReserveWidget-themed')
  await expect(themedWidget).toBeVisible({ timeout: 15000 })

  const shell = page.getByTestId('GoodReserveWidget-shell').first()
  await expect(shell).toBeVisible()
  await expect(shell).toHaveCSS('background-color', 'rgb(30, 27, 75)')

  await page.screenshot({
    path: 'tests/widgets/goodreserve-widget/test-results/grw-theme-overrides-dark.png',
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
  await expect(shell).toHaveCSS('background-color', 'rgb(30, 27, 75)')

  await page.screenshot({
    path: 'tests/widgets/goodreserve-widget/test-results/grw-theme-overrides-light.png',
  })
})
