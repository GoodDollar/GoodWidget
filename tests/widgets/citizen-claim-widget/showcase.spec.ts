import { expect, test, type Page } from '@playwright/test'

const PROD_UBI_CONTRACTS = [
  '0xd253a5203817225e9768c05e5996d642fb96ba86', // Fuse production UBI contract
  '0x43d72ff17701b2da814620735c39c620ce0ea4a1', // Celo production UBI contract
  '0x22867567e2d80f2049200e25c6f31cb6ec2f0faf', // XDC production UBI contract
]

async function gotoStory(page: Page, storyUrl: string) {
  await page.goto(storyUrl)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
}

test('CitizenClaimWidget Showcase story remounts and refreshes contract data on in-place environment switch', async ({
  page,
}) => {
  await page.addInitScript(() => {
    ;(window as unknown as { ethereum: unknown }).ethereum = {
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

  const outgoingContractCalls: string[] = []
  page.on('request', (request) => {
    try {
      const postData = request.postDataJSON() as { params?: Array<{ to?: string }> } | null
      const target = postData?.params?.[0]?.to
      if (typeof target === 'string') {
        outgoingContractCalls.push(target.toLowerCase())
      }
    } catch {
      // Non-JSON or auxiliary request
    }
  })

  // 1. Initial page load in development environment
  await gotoStory(
    page,
    '/iframe.html?id=widgets-citizenclaimwidget-showcase--injected-wallet&viewMode=story&args=environment:development',
  )

  const widget = page.getByTestId('CitizenClaimWidget-injected-wallet')
  await expect(widget).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Ready to claim').first()).toBeVisible({ timeout: 15000 })

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-showcase-development.png',
  })

  // Obtain a handle to the mounted widget DOM element to verify React unmounting
  const initialWidgetElement = await widget.elementHandle()
  expect(initialWidgetElement).not.toBeNull()

  const devCallsCount = outgoingContractCalls.length

  // 2. Switch environment to production in-place via Storybook addon channel (NO page reload)
  await page.evaluate(() => {
    const channel = (window as unknown as { __STORYBOOK_ADDONS_CHANNEL__?: { emit: (event: string, data: unknown) => void } })
      .__STORYBOOK_ADDONS_CHANNEL__
    channel?.emit('updateStoryArgs', {
      storyId: 'widgets-citizenclaimwidget-showcase--injected-wallet',
      updatedArgs: { environment: 'production' },
    })
  })

  // 3. Verify that the previous widget DOM node was unmounted and detached due to key={environment}
  await expect
    .poll(async () => initialWidgetElement?.evaluate((el) => el.isConnected), {
      message: 'Expected initial CitizenClaimWidget element to be detached on environment change',
      timeout: 10000,
    })
    .toBe(false)

  // 4. Verify that the remounted widget mounts cleanly and displays active claim UI
  await expect(widget).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Ready to claim').first()).toBeVisible({ timeout: 15000 })

  // 5. Verify that fresh contract calls were dispatched post-switch targeting production UBI contracts
  await expect
    .poll(
      () => {
        const postSwitchCalls = outgoingContractCalls.slice(devCallsCount)
        return PROD_UBI_CONTRACTS.some((prodContract) => postSwitchCalls.includes(prodContract))
      },
      {
        message: 'Expected fresh RPC calls targeting production UBI contract addresses after environment switch',
        timeout: 10000,
      },
    )
    .toBe(true)

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-showcase-production.png',
  })
})
