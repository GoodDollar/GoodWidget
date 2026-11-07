/**
 * showcase.spec.ts — Playwright tests for CitizenClaimWidget Showcase environment switching.
 *
 * Intercepts UBI and identity contract JSON-RPC calls via page.route, serving deterministic
 * fixture responses for contract reads (generic and personalized checkEntitlement,
 * getWhitelistedRoot, getDailyStats) without live network dependence.
 *
 * Verifies that:
 * 1. Initial load targets development UBI contracts and renders development observables.
 * 2. In-place environment switch remounts the widget DOM node cleanly via key={environment}.
 * 3. Post-switch UBI reads target production UBI contracts and update the rendered observable.
 */
import { expect, test, type Page } from '@playwright/test'

const DEV_UBI_CONTRACTS = [
  '0x3bdeb796950301ffc9568faf89b7370f8b217321', // Fuse development UBI contract
  '0x6b86f82293552c3b9fe380fc038a89e0328c7c5f', // Celo development UBI contract
  '0xa2619d468efe2f6d8b3d915b999327c8fe13ae2c', // XDC development UBI contract
]

const PROD_UBI_CONTRACTS = [
  '0xd253a5203817225e9768c05e5996d642fb96ba86', // Fuse production UBI contract
  '0x43d72ff17701b2da814620735c39c620ce0ea4a1', // Celo production UBI contract
  '0x22867567e2d80f2049200e25c6f31cb6ec2f0faf', // XDC production UBI contract
]

const MOCK_ACCOUNT = '0x329377cbeef39f01b0ea04b80465c9eb47d3ed10'

function toHex32(val: bigint | number | string): string {
  const hex =
    typeof val === 'bigint'
      ? val.toString(16)
      : typeof val === 'number'
        ? BigInt(val).toString(16)
        : val.replace(/^0x/, '')
  return hex.padStart(64, '0')
}

async function gotoStory(page: Page, storyUrl: string) {
  await page.goto(storyUrl)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
}

test('CitizenClaimWidget Showcase story remounts and refreshes contract data on in-place environment switch', async ({
  page,
}) => {
  await page.addInitScript((account) => {
    ;(window as unknown as { ethereum: unknown }).ethereum = {
      request: async ({ method }: { method: string }) => {
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
          return [account]
        }
        if (method === 'eth_chainId') return '0xa4ec'
        return null
      },
      on: () => {},
      removeListener: () => {},
    }
  }, MOCK_ACCOUNT)

  const outgoingContractCalls: string[] = []

  // Deterministic RPC interception for UBI and identity contract calls
  await page.route(/(forno\.celo\.org|rpc\.fuse\.io|rpc\.ankr\.com)/, async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') {
      return route.continue()
    }

    let postData: unknown
    try {
      postData = request.postDataJSON()
    } catch {
      return route.continue()
    }

    const isBatch = Array.isArray(postData)
    const calls = isBatch
      ? (postData as Array<Record<string, unknown>>)
      : [postData as Record<string, unknown>]

    const responses = calls.map((call) => {
      const id = call.id ?? 1
      const method = call.method
      const params = (call.params as Array<Record<string, unknown>>) ?? []

      if (method === 'eth_call') {
        const callObj = params[0] as { to?: string; data?: string } | undefined
        const to = callObj?.to?.toLowerCase() ?? ''
        const data = callObj?.data?.toLowerCase() ?? ''

        if (to) {
          outgoingContractCalls.push(to)
        }

        // 1. getWhitelistedRoot(address) -> 0x2d0e9b46
        if (data.startsWith('0x2d0e9b46')) {
          return {
            jsonrpc: '2.0',
            id,
            result: '0x' + toHex32(MOCK_ACCOUNT),
          }
        }

        // 2. checkEntitlement() (0x98d6621b) / checkEntitlement(address) (0x1a787f2e)
        if (data.startsWith('0x98d6621b') || data.startsWith('0x1a787f2e')) {
          let amount = 0n
          if (to === '0x6b86f82293552c3b9fe380fc038a89e0328c7c5f') {
            // Celo Development UBI entitlement: 25 G$
            amount = 25n * 10n ** 18n
          } else if (to === '0x43d72ff17701b2da814620735c39c620ce0ea4a1') {
            // Celo Production UBI entitlement: 50 G$
            amount = 50n * 10n ** 18n
          }

          return {
            jsonrpc: '2.0',
            id,
            result: '0x' + toHex32(amount),
          }
        }

        // 3. getDailyStats() -> 0x069786ea
        if (data.startsWith('0x069786ea')) {
          const isDev = DEV_UBI_CONTRACTS.includes(to)
          const claimers = isDev ? 120n : 450n
          // Fuse G$ has 2 decimals; Celo and XDC G$ have 18
          const isFuse =
            to === '0x3bdeb796950301ffc9568faf89b7370f8b217321' ||
            to === '0xd253a5203817225e9768c05e5996d642fb96ba86'
          const scale = isFuse ? 10n ** 2n : 10n ** 18n
          const claimedAmount = (isDev ? 1200n : 4500n) * scale
          return {
            jsonrpc: '2.0',
            id,
            result: '0x' + toHex32(claimers) + toHex32(claimedAmount),
          }
        }

        return {
          jsonrpc: '2.0',
          id,
          result: '0x' + toHex32(0n),
        }
      }

      if (method === 'eth_chainId') {
        const url = request.url()
        let chainIdHex = '0xa4ec' // Celo (42220)
        if (url.includes('fuse.io')) chainIdHex = '0x7a' // Fuse (122)
        if (url.includes('ankr.com')) chainIdHex = '0x32' // XDC (50)
        return { jsonrpc: '2.0', id, result: chainIdHex }
      }

      if (method === 'eth_blockNumber') {
        return { jsonrpc: '2.0', id, result: '0x1000000' }
      }

      if (method === 'net_version') {
        return { jsonrpc: '2.0', id, result: '42220' }
      }

      return { jsonrpc: '2.0', id, result: null }
    })

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isBatch ? responses : responses[0]),
    })
  })

  // 1. Initial page load in development environment
  await gotoStory(
    page,
    '/iframe.html?id=widgets-citizenclaimwidget-showcase--injected-wallet&viewMode=story&args=environment:development',
  )

  const widget = page.getByTestId('CitizenClaimWidget-injected-wallet')
  await expect(widget).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Ready to claim').first()).toBeVisible({ timeout: 15000 })

  // Verify initial development observable: 25 G$ entitlement, 120 daily claimers, 3.6K G$ total daily claimed
  await expect(widget.getByText('25', { exact: true }).first()).toBeVisible({ timeout: 15000 })
  await expect(widget.getByText('120', { exact: true })).toBeVisible({ timeout: 15000 })
  await expect(widget.getByText('3.6K', { exact: true })).toBeVisible({ timeout: 15000 })

  // Verify development calls targeted development UBI contracts
  expect(
    DEV_UBI_CONTRACTS.some((devContract) => outgoingContractCalls.includes(devContract)),
    'Expected development UBI contract calls prior to environment switch',
  ).toBe(true)

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

  // 5. Verify that the rendered observable updated across the switch (50 replaces 25, 450 replaces 120, 13.5K replaces 3.6K)
  await expect(widget.getByText('50', { exact: true }).first()).toBeVisible({ timeout: 15000 })
  await expect(widget.getByText('450', { exact: true })).toBeVisible({ timeout: 15000 })
  await expect(widget.getByText('13.5K', { exact: true })).toBeVisible({ timeout: 15000 })
  await expect(widget.getByText('25', { exact: true })).not.toBeVisible()
  await expect(widget.getByText('120', { exact: true })).not.toBeVisible()
  await expect(widget.getByText('3.6K', { exact: true })).not.toBeVisible()

  // 6. Verify that fresh contract calls were dispatched post-switch targeting production UBI contracts
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
