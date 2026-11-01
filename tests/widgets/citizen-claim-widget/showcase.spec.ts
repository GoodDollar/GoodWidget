import { expect, test, type Page } from '@playwright/test'

async function gotoStory(page: Page, storyUrl: string) {
  await page.goto(storyUrl)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
}

test('CitizenClaimWidget Showcase story loads and remounts across environment changes', async ({ page }) => {
  await page.addInitScript(() => {
    window.ethereum = {
      request: async ({ method }: { method: string }) => {
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
          return ['0x329377cbeeF39f01b0Ea04B80465c9eB47D3ED1']
        }
        if (method === 'eth_chainId') return '0xa4ec'
        return null
      },
      on: () => {},
      removeListener: () => {},
    }
  })

  await gotoStory(
    page,
    '/iframe.html?id=widgets-citizenclaimwidget-showcase--injected-wallet&viewMode=story&args=environment:development',
  )
  await expect(page.getByText('Ready to claim').first()).toBeVisible({ timeout: 15000 })
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-showcase-development.png',
  })

  // Switch environment to production
  await gotoStory(
    page,
    '/iframe.html?id=widgets-citizenclaimwidget-showcase--injected-wallet&viewMode=story&args=environment:production',
  )
  await expect(page.getByText('Ready to claim').first()).toBeVisible({ timeout: 15000 })
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-showcase-production.png',
  })
})
