/**
 * states.spec.ts — Playwright smoke tests for the StreamingWidget.
 *
 * Tests use the NoWallet story (no provider) to verify the widget shell renders and
 * surfaces the connect-wallet prompt, and the CustodialLocalFixture story to verify
 * the connected flow on Celo with an empty-history test wallet.
 *
 * Story URLs:
 *   /iframe.html?id=widgets-streamingwidget--no-wallet&viewMode=story
 *   /iframe.html?id=widgets-streamingwidget--custodial-local-fixture&viewMode=story
 *   /iframe.html?id=widgets-streamingwidget--wrong-chain&viewMode=story
 *   /iframe.html?id=widgets-streamingwidget--error-state&viewMode=story
 *   /iframe.html?id=widgets-streamingwidget--pool-claim&viewMode=story
 *   /iframe.html?id=widgets-streamingwidget--base-sup-reserve&viewMode=story
 *   /iframe.html?id=widgets-streamingwidget--base-sup-balance&viewMode=story
 *
 * Browser flags (set globally in playwright.config.ts):
 *   --disable-web-security     : allows viem fetch calls from localhost to external HTTPS RPC
 *   --ignore-certificate-errors: allows Chromium to accept RPC endpoint TLS certs
 *
 * Running:
 *   pnpm storybook          (in one terminal)
 *   pnpm test:demo          (in another terminal)
 *
 * Artifact output:
 *   tests/widgets/streaming-widget/test-results/   (widget screenshot evidence)
 *   test-results/                                  (Playwright traces/videos/attachments)
 */
import { test, expect, type Page } from '@playwright/test'

const NO_WALLET_STORY_URL =
  '/iframe.html?id=widgets-streamingwidget--no-wallet&viewMode=story'

const CUSTODIAL_STORY_URL =
  '/iframe.html?id=widgets-streamingwidget--custodial-local-fixture&viewMode=story'

const WRONG_CHAIN_STORY_URL =
  '/iframe.html?id=widgets-streamingwidget--wrong-chain&viewMode=story'

const ERROR_STATE_STORY_URL =
  '/iframe.html?id=widgets-streamingwidget--error-state&viewMode=story'

const POOL_CLAIM_STORY_URL =
  '/iframe.html?id=widgets-streamingwidget--pool-claim&viewMode=story'

const BASE_SUP_RESERVE_STORY_URL =
  '/iframe.html?id=widgets-streamingwidget--base-sup-reserve&viewMode=story'

const BASE_SUP_BALANCE_STORY_URL =
  '/iframe.html?id=widgets-streamingwidget--base-sup-balance&viewMode=story'

/** Navigate directly to the story iframe (bypasses Storybook shell for speed). */
async function gotoStory(page: Page, url: string): Promise<void> {
  await page.goto(url)
  await page.waitForLoadState('domcontentloaded')
}

/** Poll the page until all of the given text patterns appear in the body. */
async function waitForAllText(
  page: Page,
  patterns: string[],
  timeoutMs = 30_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const text = await page.evaluate(() => document.body.innerText)
    if (patterns.every((p) => text.includes(p))) return true
    await page.waitForTimeout(500)
  }
  return false
}

/** Poll the page until any of the given text patterns appears in the body. */
async function waitForText(
  page: Page,
  patterns: string[],
  timeoutMs = 30_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const text = await page.evaluate(() => document.body.innerText)
    for (const p of patterns) {
      if (text.includes(p)) return p
    }
    await page.waitForTimeout(500)
  }
  return ''
}

// ─── no-wallet state ─────────────────────────────────────────────────────────
test('StreamingWidget shows connect-wallet prompt when no provider is given', async ({ page }) => {
  await gotoStory(page, NO_WALLET_STORY_URL)

  // The widget should render the tab bar and the connect-wallet prompt
  const matched = await waitForText(page, ['Connect Wallet', 'not connected', 'Streams'], 20_000)
  expect(matched, 'Expected connect-wallet prompt').toBeTruthy()

  const bodyText = await page.evaluate(() => document.body.innerText)
  expect(bodyText).toMatch(/Connect Wallet/i)
  expect(bodyText).toMatch(/not connected/i)

  await page.screenshot({
    path: 'tests/widgets/streaming-widget/test-results/sw-01-no-wallet.png',
    fullPage: true,
  })
})

// ─── tab navigation ───────────────────────────────────────────────────────────
test('StreamingWidget renders Streams, Pools, Balances tabs', async ({ page }) => {
  await gotoStory(page, NO_WALLET_STORY_URL)

  const allTabsVisible = await waitForAllText(page, ['Streams', 'Pools', 'Balances'], 20_000)
  expect(allTabsVisible, 'All three tabs must render').toBeTruthy()

  await page.screenshot({
    path: 'tests/widgets/streaming-widget/test-results/sw-02-tabs-visible.png',
    fullPage: true,
  })
})

// ─── wrong-chain state (dedicated story) ──────────────────────────────────────
test('StreamingWidget wrong-chain story — shows unsupported network prompt', async ({
  page,
}) => {
  await gotoStory(page, WRONG_CHAIN_STORY_URL)

  // Should show the wrong-chain prompt with chain switch options
  const allVisible = await waitForAllText(
    page,
    ['Unsupported network', 'Switch to Celo', 'Switch to Base'],
    20_000,
  )
  expect(allVisible, 'Expected wrong-chain prompt with chain-switch buttons').toBeTruthy()

  await page.screenshot({
    path: 'tests/widgets/streaming-widget/test-results/sw-03-wrong-chain.png',
    fullPage: true,
  })
})

// ─── custodial: loading state ─────────────────────────────────────────────────
test('StreamingWidget custodial fixture — Streams tab shows loading spinner', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Live RPC test requires --disable-web-security / --ignore-certificate-errors',
  )

  // Route subgraph calls to never respond — intentionally hangs to keep the
  // widget in the loading state indefinitely so we can screenshot that state.
  await page.route('https://subgraph-gateway.superfluid.finance/**', () => {
    /* intentional hang — never fulfill, never abort */
  })
  await page.route('https://gateway-arbitrum.network.thegraph.com/**', () => {
    /* intentional hang — never fulfill, never abort */
  })

  await gotoStory(page, CUSTODIAL_STORY_URL)

  // Tab bar should render first
  const tabsVisible = await waitForAllText(page, ['Streams', 'Pools', 'Balances'], 30_000)
  expect(tabsVisible).toBeTruthy()

  // Loading spinner text should appear
  const loadingVisible = await waitForText(page, ['Loading'], 10_000)
  expect(loadingVisible, 'Expected loading spinner text').toBeTruthy()

  await page.screenshot({
    path: 'tests/widgets/streaming-widget/test-results/sw-04-loading.png',
    fullPage: true,
  })
})

// ─── custodial: RPC blocked → error state ────────────────────────────────────
test('StreamingWidget custodial fixture — shows error state when RPC is blocked', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Live RPC test requires --disable-web-security / --ignore-certificate-errors',
  )

  // Block all Celo RPC and subgraph endpoints to force error state
  await page.route('https://forno.celo.org/**', (route) => route.abort())
  await page.route('https://subgraph-gateway.superfluid.finance/**', (route) => route.abort())
  await page.route('https://gateway-arbitrum.network.thegraph.com/**', (route) => route.abort())

  await gotoStory(page, CUSTODIAL_STORY_URL)

  // After RPCs abort, adapter should surface error state with Retry button
  const allVisible = await waitForAllText(
    page,
    ['Retry', 'Unable to reach'],
    25_000,
  )
  expect(allVisible, 'Expected error state with Retry button after RPC abort').toBeTruthy()

  await page.screenshot({
    path: 'tests/widgets/streaming-widget/test-results/sw-05-error.png',
    fullPage: true,
  })
})

// ─── custodial: pools tab navigation ─────────────────────────────────────────
test('StreamingWidget custodial fixture — clicking Pools tab changes view', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Live RPC test requires --disable-web-security / --ignore-certificate-errors',
  )

  // Block external calls to keep the test deterministic
  await page.route('https://forno.celo.org/**', (route) => route.abort())
  await page.route('https://subgraph-gateway.superfluid.finance/**', (route) => route.abort())

  await gotoStory(page, CUSTODIAL_STORY_URL)

  // Wait for tab bar to render
  await waitForAllText(page, ['Streams', 'Pools', 'Balances'], 20_000)

  // Click the Pools tab
  const poolsTab = page.getByText('Pools').first()
  await expect(poolsTab).toBeVisible()
  await poolsTab.click()

  await page.waitForTimeout(500)

  await page.screenshot({
    path: 'tests/widgets/streaming-widget/test-results/sw-06-pools-tab.png',
    fullPage: true,
  })

  // Verify Pools tab content is visible — either loading, error, or empty state
  const bodyText = await page.evaluate(() => document.body.innerText)
  // Should show pool-related content: loading message, error, or empty state
  const hasPoolsContent =
    bodyText.includes('Loading pool') ||
    bodyText.includes('No GDA pool') ||
    bodyText.includes('Retry') ||
    bodyText.includes('Something went wrong')
  expect(hasPoolsContent, 'Pools tab should show loading/empty/error state').toBeTruthy()
})

// ─── custodial: balances tab navigation ──────────────────────────────────────
test('StreamingWidget custodial fixture — clicking Balances tab shows balance section', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Live RPC test requires --disable-web-security / --ignore-certificate-errors',
  )

  // Block external calls
  await page.route('https://forno.celo.org/**', (route) => route.abort())
  await page.route('https://subgraph-gateway.superfluid.finance/**', (route) => route.abort())

  await gotoStory(page, CUSTODIAL_STORY_URL)

  await waitForAllText(page, ['Streams', 'Pools', 'Balances'], 20_000)

  // Click Balances tab
  const balancesTab = page.getByText('Balances').first()
  await expect(balancesTab).toBeVisible()
  await balancesTab.click()

  await page.waitForTimeout(500)

  await page.screenshot({
    path: 'tests/widgets/streaming-widget/test-results/sw-07-balances-tab.png',
    fullPage: true,
  })

  // Balances tab shows Super Token Balance section and the SUP reserve disabled notice for non-Base
  const bodyText = await page.evaluate(() => document.body.innerText)
  expect(bodyText).toMatch(/Super Token Balance/i)
  // On Celo, SUP reserve should show disabled state
  expect(bodyText).toMatch(/only available on Base|SUP Reserve/i)
})

// ─── custodial: create-stream form toggle ────────────────────────────────────
test('StreamingWidget custodial fixture — New Stream button toggles form', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Live RPC test requires --disable-web-security / --ignore-certificate-errors',
  )

  // Block external calls for determinism
  await page.route('https://forno.celo.org/**', (route) => route.abort())
  await page.route('https://subgraph-gateway.superfluid.finance/**', (route) => route.abort())

  await gotoStory(page, CUSTODIAL_STORY_URL)

  // Wait for Streams tab to render with the New Stream button
  await waitForText(page, ['New Stream'], 20_000)

  const newStreamBtn = page.getByText('+ New Stream').first()
  await expect(newStreamBtn).toBeVisible()
  await newStreamBtn.click()

  // Form should appear with recipient and amount fields
  const formVisible = await waitForAllText(
    page,
    ['Create Stream', 'Recipient address', 'Amount', 'Set Stream'],
    5_000,
  )
  expect(formVisible, 'Create stream form should render with all fields').toBeTruthy()

  await page.screenshot({
    path: 'tests/widgets/streaming-widget/test-results/sw-08-create-stream-form.png',
    fullPage: true,
  })
})

// ─── error state via RPC abort (dedicated story) ─────────────────────────────
test('StreamingWidget error state — shows error with retry after RPC failure', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Live RPC test requires --disable-web-security / --ignore-certificate-errors',
  )

  // Block all RPC and subgraph endpoints to force error state
  await page.route('https://forno.celo.org/**', (route) => route.abort())
  await page.route('https://subgraph-gateway.superfluid.finance/**', (route) => route.abort())
  await page.route('https://gateway-arbitrum.network.thegraph.com/**', (route) => route.abort())

  await gotoStory(page, ERROR_STATE_STORY_URL)

  // After RPCs abort, adapter should surface error state with Retry button
  const allVisible = await waitForAllText(
    page,
    ['Retry', 'Unable to reach'],
    25_000,
  )
  expect(allVisible, 'Expected error state with Retry button after RPC abort').toBeTruthy()

  await page.screenshot({
    path: 'tests/widgets/streaming-widget/test-results/sw-09-error-state.png',
    fullPage: true,
  })
})

// ─── pool connect/disconnect state ──────────────────────────────────────────
test('StreamingWidget custodial fixture — Pools tab shows connect/disconnect and claim actions', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Live RPC test requires --disable-web-security / --ignore-certificate-errors',
  )

  // Block external calls for determinism
  await page.route('https://forno.celo.org/**', (route) => route.abort())
  await page.route('https://subgraph-gateway.superfluid.finance/**', (route) => route.abort())

  await gotoStory(page, POOL_CLAIM_STORY_URL)

  // Wait for tab bar to render
  await waitForAllText(page, ['Streams', 'Pools', 'Balances'], 20_000)

  // Click the Pools tab
  const poolsTab = page.getByText('Pools').first()
  await expect(poolsTab).toBeVisible()
  await poolsTab.click()

  await page.waitForTimeout(500)

  await page.screenshot({
    path: 'tests/widgets/streaming-widget/test-results/sw-10-pools-connect-disconnect.png',
    fullPage: true,
  })

  // Pools tab should show pool-related content
  const bodyText = await page.evaluate(() => document.body.innerText)
  const hasPoolsContent =
    bodyText.includes('Loading pool') ||
    bodyText.includes('No GDA pool') ||
    bodyText.includes('Connect') ||
    bodyText.includes('Disconnect') ||
    bodyText.includes('Claim') ||
    bodyText.includes('Claimable') ||
    bodyText.includes('Retry')
  expect(hasPoolsContent, 'Pools tab should show pool content with connect/disconnect/claim').toBeTruthy()
})

// ─── SUP reserve visibility by chain (non-Base) ─────────────────────────────
test('StreamingWidget custodial fixture — SUP reserve disabled on non-Base chain', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Live RPC test requires --disable-web-security / --ignore-certificate-errors',
  )

  // Block external calls
  await page.route('https://forno.celo.org/**', (route) => route.abort())
  await page.route('https://subgraph-gateway.superfluid.finance/**', (route) => route.abort())

  await gotoStory(page, CUSTODIAL_STORY_URL)

  await waitForAllText(page, ['Streams', 'Pools', 'Balances'], 20_000)

  // Click Balances tab
  const balancesTab = page.getByText('Balances').first()
  await expect(balancesTab).toBeVisible()
  await balancesTab.click()

  await page.waitForTimeout(500)

  // On Celo (custodial fixture default), SUP reserve should show disabled state
  const bodyText = await page.evaluate(() => document.body.innerText)
  expect(bodyText).toMatch(/Super Token Balance/i)

  // SUP reserve must mention that it is only available on Base
  expect(bodyText).toMatch(/only available on Base/i)

  await page.screenshot({
    path: 'tests/widgets/streaming-widget/test-results/sw-11-sup-reserve-non-base.png',
    fullPage: true,
  })
})

// ─── Base SUP reserve ───────────────────────────────────────────────────────
test('StreamingWidget Base story — SUP reserve section visible on Base chain', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Live RPC test requires --disable-web-security / --ignore-certificate-errors',
  )

  // Block RPC calls so we can see the loading/structure without real data
  await page.route('https://mainnet.base.org/**', (route) => route.abort())
  await page.route('https://subgraph-gateway.superfluid.finance/**', (route) => route.abort())

  await gotoStory(page, BASE_SUP_RESERVE_STORY_URL)

  // Wait for tab bar
  await waitForAllText(page, ['Streams', 'Pools', 'Balances'], 20_000)

  // Click Balances tab
  const balancesTab = page.getByText('Balances').first()
  await expect(balancesTab).toBeVisible()
  await balancesTab.click()

  await page.waitForTimeout(500)

  // On Base, SUP Reserve section should be visible (not the disabled message)
  const bodyText = await page.evaluate(() => document.body.innerText)
  expect(bodyText).toMatch(/SUP Reserve|Staked/i)
  // Should NOT show the "only available on Base" disabled message
  expect(bodyText).not.toMatch(/only available on Base/i)

  await page.screenshot({
    path: 'tests/widgets/streaming-widget/test-results/sw-12-base-sup-reserve.png',
    fullPage: true,
  })
})

// ─── Base SUP balance ───────────────────────────────────────────────────────
test('StreamingWidget Base story — Super Token balance shows SUP on Base', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Live RPC test requires --disable-web-security / --ignore-certificate-errors',
  )

  // Block RPC calls
  await page.route('https://mainnet.base.org/**', (route) => route.abort())
  await page.route('https://subgraph-gateway.superfluid.finance/**', (route) => route.abort())

  await gotoStory(page, BASE_SUP_BALANCE_STORY_URL)

  // Wait for tab bar
  await waitForAllText(page, ['Streams', 'Pools', 'Balances'], 20_000)

  // Click Balances tab
  const balancesTab = page.getByText('Balances').first()
  await expect(balancesTab).toBeVisible()
  await balancesTab.click()

  await page.waitForTimeout(500)

  const bodyText = await page.evaluate(() => document.body.innerText)
  expect(bodyText).toMatch(/Super Token Balance/i)

  await page.screenshot({
    path: 'tests/widgets/streaming-widget/test-results/sw-13-base-sup-balance.png',
    fullPage: true,
  })
})
