import { expect, test, type Page } from '@playwright/test'
import {
  MOCK_ALIGNMENT,
  MOCK_CITIZEN,
  MOCK_HOUSES,
  encodeMockGovernanceRead,
} from '../../../examples/storybook/src/fixtures/governanceRuntimeMock'

type Address = `0x${string}`
type Hex = `0x${string}`

type RuntimeStoryCase = {
  id: string
  testId: string
  expectedText: string
  screenshot: string
  mockInjected?: boolean
  mockRuntime?: boolean
}

const RUNTIME_STORIES: RuntimeStoryCase[] = [
  {
    id: 'qa-governancewidget-runtime-fixtures--disconnected-dashboard',
    testId: 'GovernanceWidget-disconnected',
    expectedText: 'Connect Wallet',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-01-disconnected-dashboard.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--loading-connected',
    testId: 'GovernanceWidget-loading',
    expectedText: 'Loading wallet, identity, membership, and governance data…',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-02-loading-connected.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--onboarding-required-hoa-unavailable',
    testId: 'GovernanceWidget-onboarding',
    expectedText: 'House of Alignment',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-03-onboarding-hoa-unavailable.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--pending-alignment',
    testId: 'GovernanceWidget-pending-alignment',
    expectedText: 'Alignment membership pending',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-04-pending-alignment.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--active-citizenship',
    testId: 'GovernanceWidget-active_citizenship',
    expectedText: 'House of Citizenship',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-05-active-citizenship.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--active-alignment-injected',
    testId: 'GovernanceWidget-active_alignment',
    expectedText: 'House of Alignment',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-06-active-alignment-injected.png',
    mockInjected: true,
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--vote-detail-open',
    testId: 'GovernanceWidget-vote-detail',
    expectedText: 'Allocation total: 10000 / 10,000 bps',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-07-vote-detail-open.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--already-voted',
    testId: 'GovernanceWidget-already-voted',
    expectedText: 'Ballot updates are not available',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-08-already-voted.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--vote-closed-executed',
    testId: 'GovernanceWidget-active-governance',
    expectedText: 'Final units executed',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-09-vote-closed-executed.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--empty-recipients',
    testId: 'GovernanceWidget-active-governance',
    expectedText: 'No House of Alignment members have been assigned yet',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-10-empty-recipients.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--pool-unavailable-mocked',
    testId: 'GovernanceWidget-funding-distribution',
    expectedText: 'No active funding distribution yet.',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-11-pool-unavailable-mocked.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--unsupported-chain',
    testId: 'GovernanceWidget-unsupported-chain',
    expectedText: 'Switch to Celo Mainnet',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-12-unsupported-chain.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--active-membership-unstake-ready',
    testId: 'GovernanceWidget-unstake',
    expectedText: 'Unstake membership',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-13-unstake-ready.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--friendly-contract-error',
    testId: 'GovernanceWidget-friendly-error',
    expectedText: 'Governance data unavailable',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-14-friendly-contract-error.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--unstake-wallet-confirmation',
    testId: 'GovernanceWidget-unstake',
    expectedText: 'Confirm the unstake transaction in your wallet.',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-16-unstake-wallet-confirmation.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--unstake-submitted',
    testId: 'GovernanceWidget-unstake',
    expectedText: 'Waiting for a successful Celo receipt',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-17-unstake-submitted.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--unstake-rejected',
    testId: 'GovernanceWidget-unstake',
    expectedText: 'Transaction rejected in the wallet.',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-18-unstake-rejected.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--unstaked-returns-to-onboarding',
    testId: 'GovernanceWidget-lifecycle-notice',
    expectedText: 'Membership unstaked successfully.',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-19-unstaked-onboarding.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--revoked-membership',
    testId: 'GovernanceWidget-revoked',
    expectedText: 'cannot be reactivated from the widget',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-20-revoked.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--real-adapter-mocked-runtime',
    testId: 'GovernanceWidget-real-adapter',
    expectedText: 'House of Citizenship',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-21-real-adapter-mocked-runtime.png',
    mockRuntime: true,
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--upcoming-vote',
    testId: 'GovernanceWidget-active-governance',
    expectedText: 'Next window starts Aug 1, 2026',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-22-upcoming-vote.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--unstake-reverted',
    testId: 'GovernanceWidget-unstake',
    expectedText: 'The governance contract rejected this action.',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-23-unstake-reverted.png',
  },
]

const MOCK_TRANSACTION_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

async function installInjectedProvider(
  page: Page,
  options: { rejectTransactions?: boolean } = {},
): Promise<void> {
  await page.addInitScript(({ rejectTransactions, transactionHash }) => {
    const runtimeWindow = window as typeof window & {
      __governanceSentTransactions?: unknown[]
      __switchGovernanceAccount?: (account: string) => void
    }
    let currentAccount = '0x4E5B2D7a45C2e31a8F0d09b4bE1fA11aD3aC9F08'
    const accountListeners = new Set<(accounts: string[]) => void>()
    runtimeWindow.__governanceSentTransactions = []
    runtimeWindow.__switchGovernanceAccount = (account) => {
      currentAccount = account
      accountListeners.forEach((listener) => listener([account]))
    }
    window.ethereum = {
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
          return [currentAccount]
        }
        if (method === 'eth_chainId') return '0xa4ec'
        if (method === 'wallet_switchEthereumChain') return null
        if (method === 'eth_estimateGas') return '0x5208'
        if (method === 'eth_sendTransaction') {
          if (rejectTransactions) throw new Error('User rejected the request')
          runtimeWindow.__governanceSentTransactions?.push(params?.[0])
          return transactionHash
        }
        return null
      },
      on: (event: string, listener: (...args: unknown[]) => void) => {
        if (event === 'accountsChanged') {
          accountListeners.add(listener as (accounts: string[]) => void)
        }
      },
      removeListener: (event: string, listener: (...args: unknown[]) => void) => {
        if (event === 'accountsChanged') {
          accountListeners.delete(listener as (accounts: string[]) => void)
        }
      },
    }
  }, { rejectTransactions: Boolean(options.rejectTransactions), transactionHash: MOCK_TRANSACTION_HASH })
}

async function installGovernanceRuntimeMocks(
  page: Page,
  options: { receiptStatus?: 'success' | 'reverted'; clearMemberAfterReceipt?: boolean } = {},
): Promise<{ pauseReads: () => void; resumeReads: () => void }> {
  let memberStatus: 0 | 2 = 2
  let readsPaused = false
  let resumePendingReads: (() => void) | null = null
  let pendingReads = Promise.resolve()
  const controls = {
    pauseReads: () => {
      if (readsPaused) return
      readsPaused = true
      pendingReads = new Promise<void>((resolve) => {
        resumePendingReads = resolve
      })
    },
    resumeReads: () => {
      readsPaused = false
      resumePendingReads?.()
      resumePendingReads = null
    },
  }
  await page.route('**/mock-governance-rpc', async (route) => {
    const request = route.request()
    const payload = request.postDataJSON() as {
      id: number
      method: string
      params?: Array<{ to?: Address; data?: Hex }>
    }
    if (payload.method === 'eth_getTransactionReceipt') {
      if (options.receiptStatus !== 'reverted' && options.clearMemberAfterReceipt) {
        memberStatus = 0
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: payload.id,
          result: {
            blockHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            blockNumber: '0x10',
            contractAddress: null,
            cumulativeGasUsed: '0x5208',
            effectiveGasPrice: '0x1',
            from: '0x4E5B2D7a45C2e31a8F0d09b4bE1fA11aD3aC9F08',
            gasUsed: '0x5208',
            logs: [],
            logsBloom: `0x${'0'.repeat(512)}`,
            status: options.receiptStatus === 'reverted' ? '0x0' : '0x1',
            to: MOCK_HOUSES,
            transactionHash: MOCK_TRANSACTION_HASH,
            transactionIndex: '0x0',
            type: '0x2',
          },
        }),
      })
      return
    }
    if (payload.method === 'eth_blockNumber') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ jsonrpc: '2.0', id: payload.id, result: '0x10' }),
      })
      return
    }
    if (payload.method !== 'eth_call') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ jsonrpc: '2.0', id: payload.id, result: '0x' }),
      })
      return
    }

    if (readsPaused) await pendingReads

    const call = payload.params?.[0]
    if (!call?.to || !call.data) throw new Error('Mock eth_call is missing to/data')
    let result: Hex
    try {
      result = encodeMockGovernanceRead(call.to, call.data, { memberStatus })
    } catch (error) {
      console.error(`Governance RPC mock failed for ${call.to} ${call.data}: ${String(error)}`)
      throw error
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ jsonrpc: '2.0', id: payload.id, result }),
    })
  })

  await page.route('**/celo-mainnet/protocol-v1', async (route) => {
    const now = Math.floor(Date.now() / 1000).toString()
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          streams: [
            {
              sender: { id: MOCK_CITIZEN.toLowerCase() },
              currentFlowRate: '0',
              streamedUntilUpdatedAt: '300000000000000000000',
              updatedAtTimestamp: now,
            },
            {
              sender: { id: MOCK_ALIGNMENT.toLowerCase() },
              currentFlowRate: '1000000000000000',
              streamedUntilUpdatedAt: '150000000000000000000',
              updatedAtTimestamp: now,
            },
          ],
        },
      }),
    })
  })
  return controls
}

async function gotoStory(page: Page, storyId: string): Promise<void> {
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
  await page.waitForLoadState('networkidle')
}

function logRuntimeDiagnostics(page: Page): void {
  page.on('pageerror', (error) => console.error(`Governance runtime page error: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`Governance runtime console error: ${message.text()}`)
  })
  page.on('requestfailed', (request) => {
    console.error(`Governance runtime request failed: ${request.method()} ${request.url()} ${request.failure()?.errorText}`)
  })
}

for (const storyCase of RUNTIME_STORIES) {
  test(`${storyCase.id} renders runtime state`, async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 900 })
    if (storyCase.mockInjected) {
      await installInjectedProvider(page)
    }
    if (storyCase.mockRuntime) {
      await installInjectedProvider(page)
      logRuntimeDiagnostics(page)
      await installGovernanceRuntimeMocks(page)
    }

    await gotoStory(page, storyCase.id)

    await expect(page.getByTestId(storyCase.testId).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(storyCase.expectedText).first()).toBeVisible()
    await page.screenshot({ path: storyCase.screenshot, fullPage: true })
  })
}

test('onboarding runtime fixture greys out House of Alignment for non-whitelisted wallets', async ({
  page,
}) => {
  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--onboarding-required-hoa-unavailable')

  const alignmentCard = page.getByTestId('GovernanceOnboardingWidget-house-alignment')
  await expect(alignmentCard).toBeVisible()
  await expect(alignmentCard).toHaveCSS('pointer-events', 'none')
  await page.screenshot({
    path: 'tests/widgets/governance-widget/test-results/gwr-15-hoa-greyed-out.png',
    fullPage: true,
  })
})

test('active membership keeps unstake disabled until the contract unlock boundary', async ({
  page,
}) => {
  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--active-citizenship')

  await expect(page.getByTestId('GovernanceWidget-unstake-locked')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Unstake membership' })).toBeDisabled()
})

test('active membership enables unstake after the contract unlock boundary', async ({ page }) => {
  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--active-membership-unstake-ready')

  await expect(page.getByRole('button', { name: 'Unstake membership' })).toBeEnabled()
})

test('real adapter waits for a successful unstake receipt and refreshes to onboarding', async ({ page }) => {
  logRuntimeDiagnostics(page)
  await installInjectedProvider(page)
  await installGovernanceRuntimeMocks(page, { clearMemberAfterReceipt: true })
  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--real-adapter-mocked-runtime')

  await page.getByRole('button', { name: 'Unstake membership' }).click()
  await expect(page.getByTestId('GovernanceWidget-lifecycle-notice')).toContainText(
    'Membership unstaked successfully.',
  )
  await expect(page.getByTestId('GovernanceWidget-onboarding')).toBeVisible()
  const sentTransactions = await page.evaluate(() => (
    window as typeof window & { __governanceSentTransactions?: Array<{ to?: string }> }
  ).__governanceSentTransactions ?? [])
  expect(sentTransactions).toHaveLength(1)
  expect(sentTransactions[0]?.to?.toLowerCase()).toBe(MOCK_HOUSES.toLowerCase())
})

test('real adapter keeps membership active after a reverted unstake receipt', async ({ page }) => {
  logRuntimeDiagnostics(page)
  await installInjectedProvider(page)
  await installGovernanceRuntimeMocks(page, { receiptStatus: 'reverted', clearMemberAfterReceipt: true })
  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--real-adapter-mocked-runtime')

  await page.getByRole('button', { name: 'Unstake membership' }).click()
  await expect(page.getByText('The governance contract rejected this action.')).toBeVisible()
  await expect(page.getByTestId('GovernanceWidget-dashboard')).toBeVisible()
  await expect(page.getByTestId('GovernanceWidget-friendly-error')).toHaveCount(0)
  await expect(page.getByTestId('GovernanceWidget-unstake')).toBeVisible()
  await expect(page.getByTestId('GovernanceWidget-onboarding')).toHaveCount(0)
})

test('real adapter surfaces wallet rejection without waiting for a receipt', async ({ page }) => {
  logRuntimeDiagnostics(page)
  await installInjectedProvider(page, { rejectTransactions: true })
  await installGovernanceRuntimeMocks(page)
  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--real-adapter-mocked-runtime')

  await page.getByRole('button', { name: 'Unstake membership' }).click()
  await expect(page.getByText('Transaction rejected in the wallet.')).toBeVisible()
  await expect(page.getByTestId('GovernanceWidget-dashboard')).toBeVisible()
  await expect(page.getByTestId('GovernanceWidget-friendly-error')).toHaveCount(0)
  await expect(page.getByTestId('GovernanceWidget-unstake')).toBeVisible()
})

test('real adapter clears account-scoped governance state while a new wallet loads', async ({ page }) => {
  logRuntimeDiagnostics(page)
  await installInjectedProvider(page)
  const runtimeMocks = await installGovernanceRuntimeMocks(page)
  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--real-adapter-mocked-runtime')
  await expect(page.getByTestId('GovernanceWidget-member-footer')).toBeVisible()

  runtimeMocks.pauseReads()
  try {
    await page.evaluate(() => {
      const runtimeWindow = window as typeof window & {
        __switchGovernanceAccount?: (account: string) => void
      }
      runtimeWindow.__switchGovernanceAccount?.('0x9999999999999999999999999999999999999999')
    })

    await expect(page.getByTestId('GovernanceWidget-header')).toContainText('0x9999')
    await expect(page.getByTestId('GovernanceWidget-loading')).toBeVisible()
    await expect(page.getByTestId('GovernanceWidget-member-footer')).toHaveCount(0)
    await expect(page.getByTestId('GovernanceWidget-unstake')).toHaveCount(0)
  } finally {
    runtimeMocks.resumeReads()
  }

  await expect(page.getByTestId('GovernanceWidget-member-footer')).toBeVisible()
  await expect(page.getByTestId('GovernanceWidget-unstake')).toBeVisible()
})
