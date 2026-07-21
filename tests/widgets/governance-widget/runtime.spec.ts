import { expect, test, type Page } from '@playwright/test'
import {
  MOCK_ALIGNMENT,
  MOCK_CITIZEN,
  MOCK_HOUSES,
  encodeMockGovernanceRead,
} from '../../../examples/storybook/src/fixtures/governanceRuntimeMock'
import { G_TOKEN_CELO_ADDRESS } from '../../../packages/governance-widget/src/sdks/contracts'

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
const MOCK_NOW_SECONDS = 1_784_419_200
const MOCK_ACCOUNT = '0x4E5B2D7a45C2e31a8F0d09b4bE1fA11aD3aC9F08'
const MOCK_SWITCHED_ACCOUNT = '0x9999999999999999999999999999999999999999'

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
  options: {
    receiptStatus?: 'success' | 'reverted'
    clearMemberAfterReceipt?: boolean
    initialMemberStatus?: 0 | 2
    memberStatusAfterReceipt?: 0 | 2
  } = {},
): Promise<{
  pauseReads: () => void
  resumeReads: () => void
  pauseReceipts: () => void
  resumeReceipts: () => void
  receiptRequestCount: () => number
}> {
  const memberStatusByAccount: Record<string, 0 | 2> = {
    [MOCK_ACCOUNT.toLowerCase()]: options.initialMemberStatus ?? 2,
    [MOCK_SWITCHED_ACCOUNT.toLowerCase()]: 2,
  }
  let readsPaused = false
  let resumePendingReads: (() => void) | null = null
  let pendingReads = Promise.resolve()
  let receiptsPaused = false
  let resumePendingReceipts: (() => void) | null = null
  let pendingReceipts = Promise.resolve()
  let receiptRequests = 0
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
    pauseReceipts: () => {
      if (receiptsPaused) return
      receiptsPaused = true
      pendingReceipts = new Promise<void>((resolve) => {
        resumePendingReceipts = resolve
      })
    },
    resumeReceipts: () => {
      receiptsPaused = false
      resumePendingReceipts?.()
      resumePendingReceipts = null
    },
    receiptRequestCount: () => receiptRequests,
  }
  await page.route('**/mock-governance-rpc', async (route) => {
    const request = route.request()
    const payload = request.postDataJSON() as {
      id: number
      method: string
      params?: Array<{ to?: Address; data?: Hex }>
    }
    if (payload.method === 'eth_getTransactionReceipt') {
      receiptRequests += 1
      if (receiptsPaused) await pendingReceipts
      if (options.receiptStatus !== 'reverted') {
        if (options.memberStatusAfterReceipt !== undefined) {
          memberStatusByAccount[MOCK_ACCOUNT.toLowerCase()] = options.memberStatusAfterReceipt
        } else if (options.clearMemberAfterReceipt) {
          memberStatusByAccount[MOCK_ACCOUNT.toLowerCase()] = 0
        }
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
    if (payload.method === 'eth_getBlockByNumber') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: payload.id,
          result: {
            baseFeePerGas: '0x0',
            difficulty: '0x0',
            extraData: '0x',
            gasLimit: '0x1c9c380',
            gasUsed: '0x0',
            hash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            logsBloom: `0x${'0'.repeat(512)}`,
            miner: MOCK_HOUSES,
            mixHash: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
            nonce: '0x0000000000000000',
            number: '0x10',
            parentHash: '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
            receiptsRoot: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            sha3Uncles: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            size: '0x0',
            stateRoot: '0x1111111111111111111111111111111111111111111111111111111111111111',
            timestamp: `0x${MOCK_NOW_SECONDS.toString(16)}`,
            totalDifficulty: '0x0',
            transactions: [],
            transactionsRoot: '0x2222222222222222222222222222222222222222222222222222222222222222',
            uncles: [],
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
      result = encodeMockGovernanceRead(call.to, call.data, { memberStatusByAccount })
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
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          streams: [
            {
              sender: { id: MOCK_CITIZEN.toLowerCase() },
              currentFlowRate: '0',
              streamedUntilUpdatedAt: '300000000000000000000',
              updatedAtTimestamp: String(MOCK_NOW_SECONDS),
            },
            {
              sender: { id: MOCK_ALIGNMENT.toLowerCase() },
              currentFlowRate: '1',
              streamedUntilUpdatedAt: '150000000000000000000',
              updatedAtTimestamp: String(MOCK_NOW_SECONDS),
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
  await page.addStyleTag({
    content: '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }',
  })
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

async function captureEvidence(page: Page, path: string): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.screenshot({ path, fullPage: true })
      return
    } catch (error: unknown) {
      if (attempt === 3) throw error
      await page.waitForTimeout(attempt * 100)
    }
  }
}

async function submitCitizenshipRegistration(page: Page): Promise<void> {
  await expect(page.getByTestId('GovernanceWidget-onboarding')).toBeVisible()
  await page.getByRole('button', { name: 'Proceed to Membership' }).click()
  await page.getByTestId('GovernanceOnboardingWidget-house-citizenship').click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByPlaceholder('John Doe or Organization').fill('Mocked Citizen')
  await page.getByPlaceholder('https://twitter.com/username').fill('https://twitter.com/mockcitizen')
  await page.getByRole('button', { name: 'Create Profile and Stake' }).click()
}

for (const storyCase of RUNTIME_STORIES) {
  test(`${storyCase.id} renders runtime state`, async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 900 })
    if (storyCase.mockInjected) {
      await installInjectedProvider(page)
    }
    if (storyCase.mockRuntime) {
      await page.clock.install({ time: MOCK_NOW_SECONDS * 1000 })
      await installInjectedProvider(page)
      logRuntimeDiagnostics(page)
      await installGovernanceRuntimeMocks(page)
    }

    await gotoStory(page, storyCase.id)

    await expect(page.getByTestId(storyCase.testId).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(storyCase.expectedText).first()).toBeVisible()
    if (storyCase.mockRuntime) {
      await expect(page.getByTestId('GovernanceWidget-funding-distribution')).toContainText('450')
    }
    await captureEvidence(page, storyCase.screenshot)
  })
}

test('onboarding runtime fixture greys out House of Alignment for non-whitelisted wallets', async ({
  page,
}) => {
  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--onboarding-required-hoa-unavailable')

  const alignmentCard = page.getByTestId('GovernanceOnboardingWidget-house-alignment')
  await expect(alignmentCard).toBeVisible()
  await expect(alignmentCard).toHaveCSS('pointer-events', 'none')
  await captureEvidence(page, 'tests/widgets/governance-widget/test-results/gwr-15-hoa-greyed-out.png')
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

test('real adapter registers a no-member after a successful receipt', async ({ page }) => {
  logRuntimeDiagnostics(page)
  await page.clock.install({ time: MOCK_NOW_SECONDS * 1000 })
  await installInjectedProvider(page)
  await installGovernanceRuntimeMocks(page, {
    initialMemberStatus: 0,
    memberStatusAfterReceipt: 2,
  })
  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--real-adapter-mocked-runtime')

  await submitCitizenshipRegistration(page)

  await expect(page.getByTestId('GovernanceWidget-dashboard')).toBeVisible()
  await expect(page.getByTestId('GovernanceWidget-member-footer')).toContainText('House of Citizenship')
  const sentTransactions = await page.evaluate(() => (
    window as typeof window & { __governanceSentTransactions?: Array<{ to?: string }> }
  ).__governanceSentTransactions ?? [])
  expect(sentTransactions).toHaveLength(1)
  expect(sentTransactions[0]?.to?.toLowerCase()).toBe(G_TOKEN_CELO_ADDRESS.toLowerCase())
})

test('real adapter keeps registration in onboarding after a reverted receipt', async ({ page }) => {
  logRuntimeDiagnostics(page)
  await page.clock.install({ time: MOCK_NOW_SECONDS * 1000 })
  await installInjectedProvider(page)
  const runtimeMocks = await installGovernanceRuntimeMocks(page, {
    initialMemberStatus: 0,
    memberStatusAfterReceipt: 2,
    receiptStatus: 'reverted',
  })
  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--real-adapter-mocked-runtime')

  await submitCitizenshipRegistration(page)

  await expect(page.getByText('The governance contract rejected this action.').first()).toBeVisible()
  await expect(page.getByTestId('GovernanceWidget-onboarding')).toBeVisible()
  await expect(page.getByTestId('GovernanceWidget-dashboard')).toHaveCount(0)
  expect(runtimeMocks.receiptRequestCount()).toBeGreaterThan(0)
})

test('real adapter surfaces registration rejection without requesting a receipt', async ({ page }) => {
  logRuntimeDiagnostics(page)
  await page.clock.install({ time: MOCK_NOW_SECONDS * 1000 })
  await installInjectedProvider(page, { rejectTransactions: true })
  const runtimeMocks = await installGovernanceRuntimeMocks(page, { initialMemberStatus: 0 })
  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--real-adapter-mocked-runtime')

  await submitCitizenshipRegistration(page)

  await expect(page.getByText('Transaction rejected in the wallet.').first()).toBeVisible()
  await expect(page.getByTestId('GovernanceWidget-onboarding')).toBeVisible()
  expect(runtimeMocks.receiptRequestCount()).toBe(0)
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

test('pending unstake cannot publish stale receipt state after the account changes', async ({ page }) => {
  logRuntimeDiagnostics(page)
  await page.clock.install({ time: MOCK_NOW_SECONDS * 1000 })
  await installInjectedProvider(page)
  const runtimeMocks = await installGovernanceRuntimeMocks(page, { clearMemberAfterReceipt: true })
  runtimeMocks.pauseReceipts()
  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--real-adapter-mocked-runtime')

  await page.getByRole('button', { name: 'Unstake membership' }).click()
  await expect(page.getByText('Waiting for a successful Celo receipt').first()).toBeVisible()
  await page.evaluate((nextAccount) => {
    const runtimeWindow = window as typeof window & {
      __switchGovernanceAccount?: (account: string) => void
    }
    runtimeWindow.__switchGovernanceAccount?.(nextAccount)
  }, MOCK_SWITCHED_ACCOUNT)

  await expect(page.getByTestId('GovernanceWidget-header')).toContainText('0x9999')
  runtimeMocks.resumeReceipts()
  await expect(page.getByTestId('GovernanceWidget-dashboard')).toBeVisible()
  await expect(page.getByTestId('GovernanceWidget-lifecycle-notice')).toHaveCount(0)
  await expect(page.getByTestId('GovernanceWidget-onboarding')).toHaveCount(0)
})

test('vote submission is single-flight and ignores a stale receipt after account change', async ({ page }) => {
  logRuntimeDiagnostics(page)
  await page.clock.install({ time: MOCK_NOW_SECONDS * 1000 })
  await installInjectedProvider(page)
  const runtimeMocks = await installGovernanceRuntimeMocks(page)
  runtimeMocks.pauseReceipts()
  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--real-adapter-mocked-runtime')

  await page.getByTestId('GovernanceWidget-active-governance').click()
  await expect(page.getByTestId('GovernanceWidget-vote-detail')).toBeVisible()
  await page.getByRole('textbox').fill('10000')
  const submitButton = page.getByRole('button', { name: 'Submit Allocation Vote' })
  await expect(submitButton).toBeEnabled()
  await submitButton.evaluate((button) => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  await expect(page.getByText('Vote submitted. Waiting for confirmation').first()).toBeVisible()
  await expect(submitButton).toBeDisabled()
  await expect.poll(async () => page.evaluate(() => (
    window as typeof window & { __governanceSentTransactions?: unknown[] }
  ).__governanceSentTransactions?.length ?? 0)).toBe(1)

  await page.evaluate((nextAccount) => {
    const runtimeWindow = window as typeof window & {
      __switchGovernanceAccount?: (account: string) => void
    }
    runtimeWindow.__switchGovernanceAccount?.(nextAccount)
  }, MOCK_SWITCHED_ACCOUNT)
  await expect(page.getByTestId('GovernanceWidget-header')).toContainText('0x9999')
  runtimeMocks.resumeReceipts()

  await expect(page.getByTestId('GovernanceWidget-dashboard')).toBeVisible()
  await expect(page.getByTestId('GovernanceWidget-vote-detail')).toHaveCount(0)
  await expect(page.getByText('Vote confirmed on Celo.')).toHaveCount(0)
})

test('real adapter clears account-scoped governance state while a new wallet loads', async ({ page }) => {
  logRuntimeDiagnostics(page)
  await installInjectedProvider(page)
  const runtimeMocks = await installGovernanceRuntimeMocks(page)
  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--real-adapter-mocked-runtime')
  await expect(page.getByTestId('GovernanceWidget-member-footer')).toBeVisible()

  runtimeMocks.pauseReads()
  try {
    await page.evaluate((nextAccount) => {
      const runtimeWindow = window as typeof window & {
        __switchGovernanceAccount?: (account: string) => void
      }
      runtimeWindow.__switchGovernanceAccount?.(nextAccount)
    }, MOCK_SWITCHED_ACCOUNT)

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
