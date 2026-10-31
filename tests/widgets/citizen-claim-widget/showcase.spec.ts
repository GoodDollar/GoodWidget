import { expect, test, type Page } from '@playwright/test'

async function gotoStory(page: Page, storyUrl: string) {
  await page.goto(storyUrl)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
}

test('CitizenClaimWidget Showcase story loads with environment control', async ({ page }) => {
  await gotoStory(
    page,
    '/iframe.html?id=widgets-citizenclaimwidget-showcase--injected-wallet&viewMode=story&args=environment:production',
  )

  const root = page.locator('#storybook-root')
  await expect(root).toBeVisible()
})

