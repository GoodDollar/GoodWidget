/**
 * quotes.spec.ts — mocked-RPC Playwright coverage for the live GoodReserve adapter.
 *
 * Runs the Interactive story (real adapter + real @goodsdks/good-reserve SDK) against a
 * deterministic JSON-RPC mock (see mockReserveRpc.ts), so no live network is needed.
 *
 * Covers:
 *   1. Quotes and fee data for Celo and XDC in both `production` and `development`,
 *      including which contract set was queried (each pair has its own rate/exit fee).
 *   2. Stale-quote protection: input / direction / slippage / network changes clear the
 *      shown quote, Review stays disabled until the quote for the current input lands,
 *      and delayed responses from superseded requests are ignored.
 *
 * Running:
 *   pnpm test:demo tests/widgets/goodreserve-widget/quotes.spec.ts
 */
import { expect, test, type Page } from '@playwright/test'
import {
  RESERVE_MOCK_CONFIGS,
  installReserveRpcMock,
  toBaseUnits,
  type ReserveEnvironmentName,
  type ReserveMockConfig,
  type ReserveRpcMock,
} from './mockReserveRpc'

const INTERACTIVE_STORY_ID = 'widgets-goodreservewidget--interactive'
const CELO_CHAIN_ID = 42220
const XDC_CHAIN_ID = 50
const DEBOUNCE_SETTLE_MS = 600

// The first story load can include a cold Vite compile.
test.describe.configure({ timeout: 60_000 })

interface QuoteScenario {
  config: ReserveMockConfig
  /** Amount of stable token typed for the buy quote. */
  buyInput: string
  expectedGoodDollarOutput: string
  expectedPrice: string
  expectedExitContribution: string
  expectedMinimumReceived: string
}

// Expected values follow from the mock rates: output = input × gdPerStable, 0.1% default slippage.
const QUOTE_SCENARIOS: QuoteScenario[] = [
  {
    config: RESERVE_MOCK_CONFIGS['production-celo'],
    buyInput: '10',
    expectedGoodDollarOutput: '1,000.00',
    expectedPrice: '100.00000',
    expectedExitContribution: '10.00%',
    expectedMinimumReceived: '999.00',
  },
  {
    config: RESERVE_MOCK_CONFIGS['development-celo'],
    buyInput: '10',
    expectedGoodDollarOutput: '500.00',
    expectedPrice: '50.00000',
    expectedExitContribution: '2.50%',
    expectedMinimumReceived: '499.50',
  },
  {
    config: RESERVE_MOCK_CONFIGS['development-xdc'],
    buyInput: '10',
    expectedGoodDollarOutput: '400.00',
    expectedPrice: '40.00000',
    expectedExitContribution: '1.00%',
    expectedMinimumReceived: '399.60',
  },
]

const walletChainIdFor = (config: ReserveMockConfig): number =>
  config.chain === 'celo' ? CELO_CHAIN_ID : XDC_CHAIN_ID

const networkLabelFor = (config: ReserveMockConfig): string =>
  config.chain === 'celo' ? 'CELO' : 'XDC'

async function openInteractiveStory(
  page: Page,
  environment: ReserveEnvironmentName,
  walletChainId: number,
): Promise<ReserveRpcMock> {
  const rpcMock = await installReserveRpcMock(page)
  await page.goto(
    `/iframe.html?id=${INTERACTIVE_STORY_ID}&viewMode=story&args=environment:${environment};walletChainId:${walletChainId}`,
    { waitUntil: 'load', timeout: 60_000 },
  )
  await page.getByTestId('GoodReserveWidget-interactive').first().waitFor({ timeout: 30_000 })
  return rpcMock
}

// Drives the Storybook control programmatically (same channel event the controls panel emits).
async function updateStoryArgs(page: Page, updatedArgs: Record<string, unknown>): Promise<void> {
  await page.evaluate(
    ({ storyId, args }) => {
      const channel = (
        window as unknown as {
          __STORYBOOK_ADDONS_CHANNEL__: { emit: (event: string, payload: unknown) => void }
        }
      ).__STORYBOOK_ADDONS_CHANNEL__
      channel.emit('updateStoryArgs', { storyId, updatedArgs: args })
    },
    { storyId: INTERACTIVE_STORY_ID, args: updatedArgs },
  )
}

async function waitForNetwork(page: Page, config: ReserveMockConfig): Promise<void> {
  await expect(page.getByText(`Swap on ${networkLabelFor(config)}`)).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText('Enter Amount').or(page.getByText('Review Swap'))).toBeVisible({
    timeout: 20_000,
  })
}

async function typeAmount(page: Page, amount: string): Promise<void> {
  const input = page.locator('input').first()
  await input.click()
  await input.fill('')
  await input.pressSequentially(amount, { delay: 20 })
}

const primaryCta = (page: Page) => page.getByTestId('GoodReserveWidget-primary-cta')
const reviewSwapButton = (page: Page) => primaryCta(page).filter({ hasText: 'Review Swap' })

// The confirm dialog renders the same rows, so details are read from the main swap shell only.
const swapShell = (page: Page) => page.getByTestId('GoodReserveWidget-shell')

async function openTransactionDetails(page: Page): Promise<void> {
  const exitContributionLabel = swapShell(page).getByText('EXIT CONTRIBUTION')
  if (!(await exitContributionLabel.isVisible())) {
    await swapShell(page).getByText('Transaction Details').click()
  }
  await expect(exitContributionLabel).toBeVisible()
}

// Every contract the widget touched must belong to the expected chain/environment set.
function expectOnlyContractsOf(rpcMock: ReserveRpcMock, config: ReserveMockConfig): void {
  const expectedAddresses = [
    config.broker,
    config.exchangeProvider,
    config.goodDollar,
    config.stableToken,
  ].map((address) => address.toLowerCase())
  expect(rpcMock.calls.length).toBeGreaterThan(0)
  expect(
    rpcMock.calls.filter((call) => !expectedAddresses.includes(call.to.toLowerCase())),
  ).toEqual([])
  expect(rpcMock.unexpectedCalls).toEqual([])
}

test.describe('quotes and fee data per chain and environment', () => {
  for (const scenario of QUOTE_SCENARIOS) {
    const { config } = scenario

    test(`${config.chain} / ${config.environment}: buy quote, price and exit contribution`, async ({
      page,
    }) => {
      const rpcMock = await openInteractiveStory(page, config.environment, walletChainIdFor(config))
      await waitForNetwork(page, config)

      await typeAmount(page, scenario.buyInput)

      await expect(page.getByText(scenario.expectedGoodDollarOutput, { exact: true })).toBeVisible({
        timeout: 15_000,
      })
      await expect(reviewSwapButton(page)).toBeEnabled()

      await openTransactionDetails(page)
      await expect(
        swapShell(page).getByText(`1 ${config.stableSymbol} = ${scenario.expectedPrice} G$`, {
          exact: true,
        }),
      ).toBeVisible()
      await expect(
        swapShell(page).getByText(scenario.expectedExitContribution, { exact: true }),
      ).toBeVisible()
      await expect(
        swapShell(page).getByText(`${scenario.expectedMinimumReceived} G$`, { exact: true }),
      ).toBeVisible()

      expectOnlyContractsOf(rpcMock, config)
    })
  }

  test('xdc / development: sell quote uses the 6-decimal stable token', async ({ page }) => {
    const config = RESERVE_MOCK_CONFIGS['development-xdc']
    const rpcMock = await openInteractiveStory(page, config.environment, XDC_CHAIN_ID)
    await waitForNetwork(page, config)

    await page.getByTestId('GoodReserveWidget-swap-direction').click()
    await typeAmount(page, '400')

    // 400 G$ at 40 G$ per USDC → 10 USDC (a wrong 18-decimal read would not give this).
    await expect(page.getByText('10.00', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(reviewSwapButton(page)).toBeEnabled()

    await openTransactionDetails(page)
    await expect(swapShell(page).getByText('1 G$ = 0.02500 USDC', { exact: true })).toBeVisible()
    await expect(swapShell(page).getByText('1.00%', { exact: true })).toBeVisible()

    expectOnlyContractsOf(rpcMock, config)
  })

  // The SDK publishes no XDC production contracts, so the widget must not query anything there.
  test('xdc / production: unavailable in the SDK, shows the switch-network CTA and sends no reserve calls', async ({
    page,
  }) => {
    const rpcMock = await openInteractiveStory(page, 'production', XDC_CHAIN_ID)

    await expect(primaryCta(page)).toContainText('Switch Network', { timeout: 20_000 })
    await page.waitForTimeout(DEBOUNCE_SETTLE_MS)
    expect(rpcMock.calls).toEqual([])
  })
})

test.describe('stale quote protection', () => {
  const celoProduction = RESERVE_MOCK_CONFIGS['production-celo']

  test('changing the amount clears the previous quote and blocks Review until the new quote lands', async ({
    page,
  }) => {
    const rpcMock = await openInteractiveStory(page, 'production', CELO_CHAIN_ID)
    await waitForNetwork(page, celoProduction)

    await typeAmount(page, '10')
    await expect(page.getByText('1,000.00', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(reviewSwapButton(page)).toBeEnabled()

    const heldQuote = rpcMock.holdQuote('celo', toBaseUnits(11n, celoProduction.stableDecimals))
    await typeAmount(page, '11')

    // The 10-amount quote must disappear immediately, before the new one has landed.
    await expect(page.getByText('1,000.00', { exact: true })).toHaveCount(0)
    await expect(primaryCta(page)).toBeDisabled()

    await heldQuote.requested
    await expect(primaryCta(page)).toContainText('Fetching Quote')
    await expect(primaryCta(page)).toBeDisabled()

    await heldQuote.release()
    await expect(page.getByText('1,100.00', { exact: true })).toBeVisible()
    await expect(reviewSwapButton(page)).toBeEnabled()
  })

  test('a delayed response for an older amount never overwrites the newer quote', async ({
    page,
  }) => {
    const rpcMock = await openInteractiveStory(page, 'production', CELO_CHAIN_ID)
    await waitForNetwork(page, celoProduction)

    const slowQuote = rpcMock.holdQuote('celo', toBaseUnits(20n, celoProduction.stableDecimals))
    await typeAmount(page, '20')
    await slowQuote.requested

    // Type a different amount while the "20" request is still outstanding.
    await typeAmount(page, '30')
    await expect(page.getByText('3,000.00', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(reviewSwapButton(page)).toBeEnabled()

    // The late "20" response arrives now and must be ignored.
    await slowQuote.release()
    await page.waitForTimeout(DEBOUNCE_SETTLE_MS)
    await expect(page.getByText('3,000.00', { exact: true })).toBeVisible()
    await expect(page.getByText('2,000.00', { exact: true })).toHaveCount(0)
    await expect(reviewSwapButton(page)).toBeEnabled()
  })

  test('flipping the direction drops the quote and ignores a late response from the old direction', async ({
    page,
  }) => {
    const rpcMock = await openInteractiveStory(page, 'production', CELO_CHAIN_ID)
    await waitForNetwork(page, celoProduction)

    // The buy quote for 10 USDm is still in flight when the user flips to selling G$.
    const lateBuyQuote = rpcMock.holdQuote('celo', toBaseUnits(10n, celoProduction.stableDecimals))
    await typeAmount(page, '10')
    await lateBuyQuote.requested

    await page.getByTestId('GoodReserveWidget-swap-direction').click()
    await expect(primaryCta(page)).toBeDisabled()

    // Sell 20 G$ at 100 G$ per USDm → 0.2 USDm.
    await typeAmount(page, '20')
    await expect(page.getByText('0.20', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(reviewSwapButton(page)).toBeEnabled()

    await lateBuyQuote.release()
    await page.waitForTimeout(DEBOUNCE_SETTLE_MS)
    await expect(page.getByText('0.20', { exact: true })).toBeVisible()
    await expect(page.getByText('1,000.00', { exact: true })).toHaveCount(0)
    await expect(reviewSwapButton(page)).toBeEnabled()
  })

  test('changing slippage clears the quote until it is re-fetched', async ({ page }) => {
    const rpcMock = await openInteractiveStory(page, 'production', CELO_CHAIN_ID)
    await waitForNetwork(page, celoProduction)

    await typeAmount(page, '10')
    await expect(page.getByText('1,000.00', { exact: true })).toBeVisible({ timeout: 15_000 })

    const heldQuote = rpcMock.holdQuote('celo', toBaseUnits(10n, celoProduction.stableDecimals))
    await page.getByTestId('GoodReserveWidget-settings').click()
    await page
      .getByTestId('GoodReserveWidget-slippage-sheet')
      .getByText('1%', { exact: true })
      .click()
    // The drawer animates outside the default viewport, so close it with a dispatched click.
    await page
      .getByTestId('GoodReserveWidget-slippage-sheet')
      .getByText('Done')
      .dispatchEvent('click')

    await expect(page.getByText('1,000.00', { exact: true })).toHaveCount(0)
    await expect(primaryCta(page)).toBeDisabled()

    await heldQuote.requested
    await heldQuote.release()
    await expect(page.getByText('1,000.00', { exact: true })).toBeVisible()
    await openTransactionDetails(page)
    // 1% slippage on 1,000 G$ → 990 G$ minimum received.
    await expect(page.getByText('990.00 G$', { exact: true })).toBeVisible()
  })

  test('switching network clears the quote and ignores the old network response', async ({
    page,
  }) => {
    const celoDevelopment = RESERVE_MOCK_CONFIGS['development-celo']
    const xdcDevelopment = RESERVE_MOCK_CONFIGS['development-xdc']
    const rpcMock = await openInteractiveStory(page, 'development', CELO_CHAIN_ID)
    await waitForNetwork(page, celoDevelopment)

    // Celo quote for 10 is held in flight while the wallet moves to XDC.
    const staleCeloQuote = rpcMock.holdQuote(
      'celo',
      toBaseUnits(10n, celoDevelopment.stableDecimals),
    )
    await typeAmount(page, '10')
    await staleCeloQuote.requested

    await updateStoryArgs(page, { walletChainId: XDC_CHAIN_ID })
    await waitForNetwork(page, xdcDevelopment)

    // The retained amount is re-quoted on XDC (10 USDC × 40 = 400 G$), never with the Celo rate.
    await expect(page.getByText('400.00', { exact: true })).toBeVisible({ timeout: 20_000 })
    await expect(reviewSwapButton(page)).toBeEnabled()

    // The late Celo response (500 G$) arrives after the switch and must be dropped.
    await staleCeloQuote.release()
    await page.waitForTimeout(DEBOUNCE_SETTLE_MS)
    await expect(page.getByText('400.00', { exact: true })).toBeVisible()
    await expect(page.getByText('500.00', { exact: true })).toHaveCount(0)
    await expect(reviewSwapButton(page)).toBeEnabled()
  })

  test('a network switch hides the old network quote while the new one is pending', async ({
    page,
  }) => {
    const celoDevelopment = RESERVE_MOCK_CONFIGS['development-celo']
    const xdcDevelopment = RESERVE_MOCK_CONFIGS['development-xdc']
    const rpcMock = await openInteractiveStory(page, 'development', CELO_CHAIN_ID)
    await waitForNetwork(page, celoDevelopment)

    await typeAmount(page, '10')
    await expect(page.getByText('500.00', { exact: true })).toBeVisible({ timeout: 15_000 })

    const pendingXdcQuote = rpcMock.holdQuote(
      'xdc',
      toBaseUnits(10n, xdcDevelopment.stableDecimals),
    )
    await updateStoryArgs(page, { walletChainId: XDC_CHAIN_ID })

    await expect(page.getByText('500.00', { exact: true })).toHaveCount(0)
    await expect(primaryCta(page)).toBeDisabled()

    await pendingXdcQuote.requested
    await pendingXdcQuote.release()
    await expect(page.getByText('400.00', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(reviewSwapButton(page)).toBeEnabled()
  })

  test('switching to a network without reserve contracts clears the quote', async ({ page }) => {
    const rpcMock = await openInteractiveStory(page, 'production', CELO_CHAIN_ID)
    await waitForNetwork(page, celoProduction)

    await typeAmount(page, '10')
    await expect(page.getByText('1,000.00', { exact: true })).toBeVisible({ timeout: 15_000 })

    const callsBeforeSwitch = rpcMock.calls.length
    await updateStoryArgs(page, { walletChainId: XDC_CHAIN_ID })

    await expect(primaryCta(page)).toContainText('Switch Network', { timeout: 20_000 })
    await expect(page.getByText('1,000.00', { exact: true })).toHaveCount(0)
    expect(rpcMock.calls.filter((call) => call.chain === 'xdc')).toEqual([])
    expect(rpcMock.calls.length).toBeGreaterThanOrEqual(callsBeforeSwitch)
  })
})
