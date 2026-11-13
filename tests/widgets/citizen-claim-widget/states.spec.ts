/**
 * states.spec.ts — Playwright tests for CitizenClaimWidget states.
 *
 * Tests use the CustodialLocalFixture story with a randomly-generated test wallet
 * (address: 0x329377cbeeF39f01b0Ea04B80465c9eB47D3ED1) that has no on-chain history,
 * with RPC reads mocked locally; the expected flow is loading → not_whitelisted.
 *
 * The error state is tested by intercepting and blocking all RPC network calls.
 *
 * Story URL:
 *   /iframe.html?id=qa-citizenclaimwidget-runtime-fixtures--custodial-local-fixture&viewMode=story
 *
 * Browser flags required in CI/sandbox environments:
 *   --disable-web-security     : allows viem fetch calls from localhost to external HTTPS RPC
 *   --ignore-certificate-errors: allows Chromium to accept RPC endpoint TLS certs
 *
 * Note: these flags are set via the `launchOptions` in this project's playwright.config.ts
 * for the citizen-claim-widget project. For sandboxed environments, pass them via
 * PLAYWRIGHT_CHROMIUM_LAUNCH_OPTIONS or directly in a custom config.
 *
 * Running:
 *   pnpm storybook          (in one terminal)
 *   pnpm test:demo          (in another terminal)
 *
 * Artifact output:
 *   tests/widgets/citizen-claim-widget/test-results/                     (curated widget screenshot evidence)
 *   test-results/                                                        (Playwright traces/videos/attachments)
 */
import { test, expect, Page } from '@playwright/test'

const STORY_URL =
  '/iframe.html?id=qa-citizenclaimwidget-runtime-fixtures--custodial-local-fixture&viewMode=story'
const CLAIM_ALL_CONTRACT_STORY_URL =
  '/iframe.html?id=qa-citizenclaimwidget-runtime-fixtures--custodial-execution-claim-all-contract&viewMode=story'

const RPC_CACHE_STORAGE_KEY = 'goodwidget:viem-rpcs'
const DETERMINISTIC_CHAINLIST_PAYLOAD = JSON.stringify([
  { chainId: 42220, rpc: ['https://celo-fallback.goodwidget.test'] },
  { chainId: 122, rpc: ['https://fuse-fallback.goodwidget.test'] },
  { chainId: 50, rpc: ['https://xdc-fallback.goodwidget.test'] },
])
const ALL_TEST_RPC_PATTERNS = [
  'https://forno.celo.org/**',
  'https://rpc.fuse.io/**',
  'https://rpc.ankr.com/**',
  'https://celo-fallback.goodwidget.test/**',
  'https://fuse-fallback.goodwidget.test/**',
  'https://xdc-fallback.goodwidget.test/**',
]

async function setupDeterministicRpcDiscovery(page: Page): Promise<void> {
  await page.addInitScript((cacheKey: string) => {
    try {
      window.localStorage.removeItem(cacheKey)
    } catch {
      // Ignore storage access errors in restricted contexts
    }
  }, RPC_CACHE_STORAGE_KEY)
  await page.route('https://chainlist.org/rpcs.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: DETERMINISTIC_CHAINLIST_PAYLOAD,
    }),
  )
}

/** Navigate directly to the story iframe (bypasses Storybook shell for speed). */
async function gotoStory(page: Page): Promise<void> {
  await page.goto(STORY_URL)
  await page.waitForLoadState('domcontentloaded')
}

/** Poll the page until any of the given strings appears in the body text. */
async function waitForText(
  page: Page,
  patterns: string[],
  timeoutMs = 40_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const text = await page.evaluate(() => document.body.innerText)
    for (const p of patterns) {
      if (text.includes(p)) return p
    }
    await page.waitForTimeout(1000)
  }
  return ''
}

// ─── loading state ────────────────────────────────────────────────────────────
test('CitizenClaimWidget shows loading spinner on mount', async ({ page }) => {
  // Route all RPC calls to hang (never respond, never abort).
  // This keeps the adapter in the `loading` state indefinitely, giving the Storybook
  // bundle time to fully mount even on a cold first run before we screenshot.
  await page.route('https://forno.celo.org/**', () => { /* hang — never fulfill */ })
  await page.route('https://rpc.fuse.io/**', () => { /* hang — never fulfill */ })
  await page.route('https://rpc.ankr.com/**', () => { /* hang — never fulfill */ })

  await gotoStory(page)

  // Poll until the widget container renders its daily-stats footer text.
  // "Today" / "G$" appear in the footer even during loading state (showing 0-values).
  // RPC calls are hanging so we will never transition out of loading.
  const matched = await waitForText(page, ['Today', 'claimers', 'GoodDollar'], 30_000)
  expect(matched, 'Widget must mount and render before screenshot').toBeTruthy()

  // The daily-stats footer renders even during loading
  const bodyText = await page.evaluate(() => document.body.innerText)
  // Loading is indicated by the absence of a CTA button (Verify / Claim / Retry)
  const hasSpinner = !bodyText.includes('Verify') && !bodyText.includes('Retry')
  expect(hasSpinner, 'Expected loading state before RPC resolves').toBe(true)
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-01-loading.png',
    fullPage: true,
  })
})

// ─── not_whitelisted state ────────────────────────────────────────────────────
/**
 * Mock every chain read, including SDK fallback RPCs, so no live network is used.
 * The zero whitelisted root drives the real SDK/adapter to not_whitelisted.
 * Optionally hold the first Celo stats read, started before wallet discovery.
 */
async function mockFreshWalletRpc(page: Page, holdInitialStats = false) {
  type JsonRpcReq = { id: number; method: string; params?: [{ data?: string }] }
  const zeroWord = '0'.repeat(64)
  let releaseInitialStats!: () => void
  const initialStatsGate = new Promise<void>((resolve) => { releaseInitialStats = resolve })
  let initialStatsHeld = false

  await page.route('https://**/*', async (route, request) => {
    // All remote calls stay local, including unexpected SDK fallback endpoints.
    if (request.method() !== 'POST') return route.abort()
    const body = request.postDataJSON() as JsonRpcReq | JsonRpcReq[]
    const requests = Array.isArray(body) ? body : [body]
    if (requests.some((req) => req.method !== 'eth_call')) return route.abort()

    const isInitialStats = holdInitialStats && !initialStatsHeld &&
      new URL(request.url()).hostname === 'forno.celo.org' &&
      requests.some((req) => req.params?.[0]?.data === '0x069786ea')
    if (isInitialStats) {
      initialStatsHeld = true
      await initialStatsGate
    }

    const responses = requests.map((req) => ({
      jsonrpc: '2.0',
      id: req.id,
      // getDailyStats() returns two uint256s; getWhitelistedRoot(address) and
      // both checkEntitlement overloads return one ABI word. Seven claimers
      // marks completion of the held read in the rendered footer.
      result: req.params?.[0]?.data === '0x069786ea'
        ? '0x' + (isInitialStats ? '7'.padStart(64, '0') : zeroWord) + zeroWord
        : '0x' + zeroWord,
    }))
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(Array.isArray(body) ? responses : responses[0]),
    })
  })

  return {
    releaseInitialStats,
    isInitialStatsHeld: () => initialStatsHeld,
  }
}

test('CitizenClaimWidget shows not_whitelisted for fresh wallet (mocked RPC)', async ({ page }) => {
  await mockFreshWalletRpc(page)
  await gotoStory(page)

  await expect(page.getByRole('button', { name: 'Verify', exact: true })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText('Whitelisting Required', { exact: true })).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-02-not-whitelisted.png',
    fullPage: true,
  })
})

test('CitizenClaimWidget keeps Verify after pre-connect stats finish', async ({ page }) => {
  const rpc = await mockFreshWalletRpc(page, true)
  await gotoStory(page)

  const verify = page.getByRole('button', { name: 'Verify', exact: true })
  await expect(verify).toBeVisible({ timeout: 15_000 })
  expect(rpc.isInitialStatsHeld(), 'Initial address-less refresh must still be pending').toBe(true)

  rpc.releaseInitialStats()
  // Wait for the held read to reach React, not an arbitrary sleep. The obsolete
  // address-less refresh must not replace the connected wallet's Verify CTA.
  await expect(page.getByText('7', { exact: true })).toBeVisible()
  await expect(verify).toBeVisible()
  await expect(page.getByText('Connect your wallet to claim daily G$', { exact: true })).toBeHidden()

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-06-not-whitelisted-after-stats.png',
    fullPage: true,
  })
})

// ─── error state (RPC blocked) ────────────────────────────────────────────────
test('CitizenClaimWidget shows error state when RPC is unreachable', async ({ page }) => {
  // Seed deterministic Chainlist discovery and block all primary + fallback RPC endpoints
  await setupDeterministicRpcDiscovery(page)
  for (const pattern of ALL_TEST_RPC_PATTERNS) {
    await page.route(pattern, (route) => route.abort())
  }

  await gotoStory(page)

  // Wait for the adapter to surface the error and render the Retry button
  const matched = await waitForText(page, ['Retry'], 20_000)
  expect(matched, 'Expected error state with Retry button').toBe('Retry')

  const bodyText = await page.evaluate(() => document.body.innerText)
  expect(bodyText).toContain('Retry')

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-03-error.png',
    fullPage: true,
  })
})

// ─── error → retry ────────────────────────────────────────────────────────────
test('CitizenClaimWidget Retry button re-triggers the adapter', async ({ page }) => {
  // Start with unreachable RPCs, then recover using the same local fresh-wallet mock.
  await page.route('https://**/*', (route) => route.abort())

  await gotoStory(page)
  await waitForText(page, ['Retry'], 20_000)

  // The most recently registered route takes precedence over the abort handler.
  await mockFreshWalletRpc(page)
  const retryBtn = page.locator('text=Retry')
  await expect(retryBtn).toBeVisible()
  await retryBtn.click()

  await expect(page.getByRole('button', { name: 'Verify', exact: true })).toBeVisible({
    timeout: 15_000,
  })
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-04-retry-clicked.png',
    fullPage: true,
  })
})

test('CitizenClaimWidget claimExecution claimAll reports per-chain success and failure', async ({
  page,
}) => {
  await page.goto(CLAIM_ALL_CONTRACT_STORY_URL)
  await page.waitForLoadState('domcontentloaded')

  const runButton = page.getByRole('button', { name: 'Run claimAll' })
  await expect(runButton).toBeVisible()
  await runButton.click()

  const celoResult = page.getByTestId('CitizenClaimWidget-custodial-claim-all-42220')
  const fuseResult = page.getByTestId('CitizenClaimWidget-custodial-claim-all-122')
  const duration = page.getByTestId('CitizenClaimWidget-custodial-claim-all-duration')

  await expect(celoResult).toHaveText('chain 42220: fulfilled - ok', { timeout: 20_000 })
  await expect(fuseResult).toContainText('chain 122: rejected', { timeout: 20_000 })
  await expect(fuseResult).toContainText('Simulated Fuse claim failure', { timeout: 20_000 })
  await expect(duration).toContainText('duration:', { timeout: 20_000 })

  const measuredDurationText = await duration.textContent()
  expect(measuredDurationText).toBeTruthy()
  const durationMatch = measuredDurationText?.match(/[\d.]+/)
  expect(durationMatch).toBeTruthy()
  const measuredDuration = Number(durationMatch?.[0])
  expect(Number.isFinite(measuredDuration)).toBe(true)
  expect(measuredDuration).toBeLessThan(10_000)

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-05-custodial-claim-all-contract.png',
    fullPage: true,
  })
})
