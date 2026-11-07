import { expect, test, type Page } from '@playwright/test'

const VALID_TEST_WALLET = '0x329377cbeeF39f01b0Ea04B80465c9eB47D3ED12'

// Celo UBI & Identity contracts per environment (from @goodsdks/citizen-sdk constants)
const DEV_CELO_UBI_CONTRACT = '0x6b86f82293552c3b9fe380fc038a89e0328c7c5f'
const DEV_CELO_IDENTITY_CONTRACT = '0xf25fa0d4896271228193e782831f6f3cfccf169c'
const PROD_CELO_UBI_CONTRACT = '0x43d72ff17701b2da814620735c39c620ce0ea4a1'
const PROD_CELO_IDENTITY_CONTRACT = '0xc361a6e67822a0edc17d899227dd9fc50bd62f42'

// ABI-encoded uint256 / address responses:
// development: 10 G$ (10 * 10^18 = 0x8ac7230489e80000)
const DEV_ENTITLEMENT_HEX = '0x' + (10n * 10n ** 18n).toString(16).padStart(64, '0')
// production: 42 G$ (42 * 10^18 = 0x246ddcd90f1880000)
const PROD_ENTITLEMENT_HEX = '0x' + (42n * 10n ** 18n).toString(16).padStart(64, '0')
// getWhitelistedRoot returns the valid test wallet address (whitelisted)
const WHITELISTED_ROOT_HEX =
  '0x' + VALID_TEST_WALLET.slice(2).toLowerCase().padStart(64, '0')
// getDailyStats returns (uint256 claimers = 100, uint256 amount = 1000 * 10^18)
const DAILY_STATS_HEX =
  '0x' +
  100n.toString(16).padStart(64, '0') +
  (1000n * 10n ** 18n).toString(16).padStart(64, '0')

async function gotoStory(page: Page, storyUrl: string) {
  await page.goto(storyUrl)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
}

test('CitizenClaimWidget Showcase story remounts and refreshes contract data on in-place environment switch', async ({
  page,
}) => {
  await page.addInitScript((walletAddress: string) => {
    ;(window as unknown as { ethereum: unknown }).ethereum = {
      request: async ({ method }: { method: string }) => {
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
          return [walletAddress]
        }
        if (method === 'eth_chainId') return '0xa4ec'
        return null
      },
      on: () => {},
      removeListener: () => {},
    }
  }, VALID_TEST_WALLET)

  const outgoingContractCalls: string[] = []

  // Intercept Celo, Fuse, and XDC RPC reads with deterministic development vs production responses
  await page.route(
    (url) =>
      url.hostname.includes('celo.org') ||
      url.hostname.includes('fuse.io') ||
      url.hostname.includes('ankr.com') ||
      url.hostname.includes('pokt.network'),
    async (route) => {
      const request = route.request()
      let payload: unknown
      try {
        payload = request.postDataJSON()
      } catch {
        return route.continue()
      }

      const handleCall = (item: {
        id?: unknown
        method?: string
        params?: Array<{ to?: string; data?: string }>
      }) => {
        if (item.method === 'eth_chainId') {
          return { jsonrpc: '2.0', id: item.id, result: '0xa4ec' }
        }
        if (item.method === 'eth_call') {
          const to = (item.params?.[0]?.to ?? '').toLowerCase()
          const data = (item.params?.[0]?.data ?? '').toLowerCase()
          if (to) outgoingContractCalls.push(to)

          // getWhitelistedRoot(address) selector: 0x4df45994
          if (data.startsWith('0x4df45994')) {
            return { jsonrpc: '2.0', id: item.id, result: WHITELISTED_ROOT_HEX }
          }
          // getDailyStats() selector: 0x7a07827b
          if (data.startsWith('0x7a07827b')) {
            return { jsonrpc: '2.0', id: item.id, result: DAILY_STATS_HEX }
          }
          // checkEntitlement(address) (0x4f02c420) or checkEntitlement() (0x75f12b21)
          if (to === DEV_CELO_UBI_CONTRACT) {
            return { jsonrpc: '2.0', id: item.id, result: DEV_ENTITLEMENT_HEX }
          }
          if (to === PROD_CELO_UBI_CONTRACT) {
            return { jsonrpc: '2.0', id: item.id, result: PROD_ENTITLEMENT_HEX }
          }
          // Zero entitlement for non-active chains in this test
          return { jsonrpc: '2.0', id: item.id, result: '0x' + '0'.repeat(64) }
        }
        return { jsonrpc: '2.0', id: item.id, result: '0x0' }
      }

      const responseBody = Array.isArray(payload)
        ? payload.map(handleCall)
        : handleCall(payload as Parameters<typeof handleCall>[0])

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseBody),
      })
    },
  )

  // 1. Initial page load in development environment
  await gotoStory(
    page,
    '/iframe.html?id=widgets-citizenclaimwidget-showcase--injected-wallet&viewMode=story&args=environment:development',
  )

  const widget = page.getByTestId('CitizenClaimWidget-injected-wallet')
  await expect(widget).toBeVisible({ timeout: 15000 })
  await expect(widget).toContainText('10', { timeout: 15000 })

  // Verify development contract targets were queried before switching
  expect(
    outgoingContractCalls.includes(DEV_CELO_UBI_CONTRACT) ||
      outgoingContractCalls.includes(DEV_CELO_IDENTITY_CONTRACT),
  ).toBe(true)

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-showcase-development.png',
    fullPage: true,
  })

  // Obtain a handle to the mounted widget DOM element to verify React unmounting
  const initialWidgetElement = await widget.elementHandle()
  expect(initialWidgetElement).not.toBeNull()

  const devCallsCount = outgoingContractCalls.length

  // 2. Switch environment to production in-place via Storybook addon channel (NO page reload)
  await page.evaluate(() => {
    const channel = (
      window as unknown as {
        __STORYBOOK_ADDONS_CHANNEL__?: { emit: (event: string, data: unknown) => void }
      }
    ).__STORYBOOK_ADDONS_CHANNEL__
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

  // 4. Verify that the remounted widget mounts cleanly and replaces the development 10 G$ entitlement with the production 42 G$ entitlement
  await expect(widget).toBeVisible({ timeout: 15000 })
  await expect(widget).toContainText('42', { timeout: 15000 })

  // 5. Verify that fresh contract calls were dispatched post-switch targeting production contracts
  await expect
    .poll(
      () => {
        const postSwitchCalls = outgoingContractCalls.slice(devCallsCount)
        return (
          postSwitchCalls.includes(PROD_CELO_UBI_CONTRACT) ||
          postSwitchCalls.includes(PROD_CELO_IDENTITY_CONTRACT)
        )
      },
      {
        message:
          'Expected fresh RPC calls targeting production Celo UBI/Identity contracts after environment switch',
        timeout: 10000,
      },
    )
    .toBe(true)

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-showcase-production.png',
    fullPage: true,
  })
})
