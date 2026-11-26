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
  // Block all chain RPC endpoints to force the error state
  await page.route('https://forno.celo.org/**', (route) => route.abort())
  await page.route('https://rpc.fuse.io/**', (route) => route.abort())
  await page.route('https://rpc.ankr.com/**', (route) => route.abort())

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

const MOCK_WIDGET_WITH_NEXT_TASK_STORY =
  '/iframe.html?id=qa-citizenclaimwidget-runtime-fixtures--mock-claim-execution-with-next-task&viewMode=story'
const MOCK_WIDGET_PARTIAL_SUCCESS_STORY =
  '/iframe.html?id=qa-citizenclaimwidget-runtime-fixtures--mock-claim-execution-partial-success-with-next-task&viewMode=story'
const MOCK_WIDGET_SINGLE_CHAIN_STORY =
  '/iframe.html?id=qa-citizenclaimwidget-runtime-fixtures--mock-claim-execution-single-chain-with-next-task&viewMode=story'
const MOCK_WIDGET_SINGLE_CLAIM_FALLBACK_STORY =
  '/iframe.html?id=qa-citizenclaimwidget-runtime-fixtures--mock-claim-execution-single-claim-fallback-with-next-task&viewMode=story'
const MOCK_WIDGET_ALL_FAILS_STORY =
  '/iframe.html?id=qa-citizenclaimwidget-runtime-fixtures--mock-claim-execution-all-fails-with-next-task&viewMode=story'
const MOCK_WIDGET_WITHOUT_NEXT_TASK_STORY =
  '/iframe.html?id=qa-citizenclaimwidget-runtime-fixtures--mock-claim-execution-without-next-task&viewMode=story'

test('CitizenClaimWidget real flow: drawer opens after multi-chain claim with all chains succeeding, CTA navigates and closes drawer', async ({
  page,
}) => {
  await page.goto(MOCK_WIDGET_WITH_NEXT_TASK_STORY)
  await page.waitForLoadState('domcontentloaded')

  // Find and click the Claim button in the widget
  const claimButton = page.getByRole('button', { name: /Claim/i })
  await expect(claimButton).toBeVisible({ timeout: 15_000 })
  await claimButton.click()

  // Verify the NextTaskModal drawer opens after claim
  const drawerHeadline = page.getByText('One good next step')
  await expect(drawerHeadline).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('Stake your G$ and earn')).toBeVisible()
  // Closed sheets remain mounted, so visibility alone can capture the claim-in-progress
  // screen. Wait for the actual drawer and actions to enter the viewport and settle.
  const cta = page.getByRole('button', { name: 'Explore staking' })
  await expect(drawerHeadline).toBeInViewport({ ratio: 1, timeout: 20_000 })
  await expect(cta).toBeInViewport({ ratio: 1 })
  await expect(page.getByRole('button', { name: 'Skip for now' })).toBeInViewport({ ratio: 1 })
  await page.getByRole('button', { name: 'Close', exact: true }).scrollIntoViewIfNeeded()
  // Let transient success toasts clear so they do not obscure the curated drawer evidence.
  await expect(page.getByText('Claim succeeded on Celo', { exact: true })).not.toBeVisible()
  await expect(page.getByText('Claim succeeded on Fuse', { exact: true })).not.toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-06-next-task-drawer-open.png',
  })

  // Press the CTA and verify the host-side callback receives the target and drawer closes
  await expect(cta).toBeVisible()
  await cta.scrollIntoViewIfNeeded()
  await cta.click()

  await expect(page.locator('body')).toHaveAttribute('data-next-task-navigated', 'https://gooddollar.org/stake')
  await expect(page.locator('body')).toHaveAttribute('data-next-task-last-event', 'clicked:https://gooddollar.org/stake')
  await expect(drawerHeadline).not.toBeInViewport()
})

test('CitizenClaimWidget mock claim opens the GoodBuilders Season 5 voting invitation', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(
    '/iframe.html?id=qa-citizenclaimwidget-runtime-fixtures--mock-claim-execution-with-good-builders-season-5-vote&viewMode=story',
  )
  await page.getByRole('button', { name: 'Claim', exact: true }).click({ timeout: 20_000 })

  const title = page.getByText('Vote for GoodBuilders projects', { exact: true })
  const vote = page.getByRole('button', { name: 'Explore & vote' })
  await expect(title).toBeInViewport({ ratio: 1, timeout: 20_000 })
  await expect(page.getByText('GOODBUILDERS · SEASON 5', { exact: true })).toBeInViewport({ ratio: 1 })
  await expect(vote).toBeInViewport({ ratio: 1 })
  await expect(page.getByRole('button', { name: 'Skip for now' })).toBeInViewport({ ratio: 1 })
  await expect(page.getByText('Claim succeeded on Celo', { exact: true })).not.toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('goodbuilders-season-5-next-task-mobile.png') })

  const storyUrl = page.url()
  await vote.click()
  await expect(page.locator('body')).toHaveAttribute('data-next-task-navigated', 'https://ubi.gd/4eXzuUh')
  await expect(page).toHaveURL(storyUrl)
  await expect(title).not.toBeInViewport()
})

test('CitizenClaimWidget real flow: drawer opens after multi-chain claim with partial success (at least one success)', async ({
  page,
}) => {
  await page.goto(MOCK_WIDGET_PARTIAL_SUCCESS_STORY)
  await page.waitForLoadState('domcontentloaded')

  const claimButton = page.getByRole('button', { name: /Claim/i })
  await expect(claimButton).toBeVisible({ timeout: 15_000 })
  await claimButton.click()

  // In partial success (Celo succeeds, Fuse fails), drawer must still open
  const drawerHeadline = page.getByText('One good next step')
  await expect(drawerHeadline).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('Stake your G$ and earn')).toBeVisible()

  // Press the CTA and verify the host-side callback receives the target and drawer closes
  const cta = page.getByRole('button', { name: 'Explore staking' })
  await expect(cta).toBeVisible()
  await cta.scrollIntoViewIfNeeded()
  await cta.click()

  await expect(page.locator('body')).toHaveAttribute('data-next-task-navigated', 'https://gooddollar.org/stake')
  await expect(drawerHeadline).not.toBeInViewport()
})

test('CitizenClaimWidget real flow: drawer dismiss via Skip link closes drawer without navigating', async ({
  page,
}) => {
  await page.goto(MOCK_WIDGET_WITH_NEXT_TASK_STORY)
  await page.waitForLoadState('domcontentloaded')

  const claimButton = page.getByRole('button', { name: /Claim/i })
  await expect(claimButton).toBeVisible({ timeout: 15_000 })
  await claimButton.click()

  const drawerHeadline = page.getByText('One good next step')
  await expect(drawerHeadline).toBeVisible({ timeout: 20_000 })

  const skipButton = page.getByRole('button', { name: 'Skip for now' })
  await expect(skipButton).toBeVisible()
  await skipButton.scrollIntoViewIfNeeded()
  await skipButton.click()

  await expect(drawerHeadline).not.toBeInViewport()
  const navigated = await page.evaluate(() => document.body.dataset.nextTaskNavigated)
  expect(navigated).toBeUndefined()
  await expect(page.locator('body')).toHaveAttribute('data-next-task-last-event', 'dismissed:skip-link')
})

test('CitizenClaimWidget real flow: drawer opens after single-chain claim success', async ({
  page,
}) => {
  await page.goto(MOCK_WIDGET_SINGLE_CHAIN_STORY)
  await page.waitForLoadState('domcontentloaded')

  const claimButton = page.getByRole('button', { name: /Claim/i })
  await expect(claimButton).toBeVisible({ timeout: 15_000 })
  await claimButton.click()

  const drawerHeadline = page.getByText('One good next step')
  await expect(drawerHeadline).toBeVisible({ timeout: 15_000 })

  const closeButton = page.getByRole('button', { name: 'Close' })
  await closeButton.click()
  await expect(drawerHeadline).not.toBeInViewport()
})

test('CitizenClaimWidget real flow: single-claim fallback runs and opens drawer when claimablesByChain is empty', async ({
  page,
}) => {
  // Abort fallback RPCs so findAltEntitlement settles immediately with no alt-chain claimables.
  await page.route('https://forno.celo.org/**', (route) => route.abort())
  await page.route('https://rpc.fuse.io/**', (route) => route.abort())
  await page.route('https://fuse-rpc.gateway.pokt.network/**', (route) => route.abort())
  await page.route('https://rpc.ankr.com/**', (route) => route.abort())

  await page.goto(MOCK_WIDGET_SINGLE_CLAIM_FALLBACK_STORY)
  await page.waitForLoadState('domcontentloaded')

  await expect(page.getByText('Ready to claim')).toBeVisible({ timeout: 15_000 })
  const claimButton = page.getByRole('button', { name: /Claim/i })
  await expect(claimButton).toBeVisible()
  await expect(claimButton).toBeEnabled()

  // claimablesByChain is empty, so ClaimChainBreakdown ("Celo" inside the card) is absent:
  // only the WidgetTabs network badge renders exact "Celo", proving claimPlan.length === 0.
  await expect(page.getByText('Celo', { exact: true })).toHaveCount(1)
  await expect(page.getByTestId('CitizenClaimWidget-custodial-claim-all-42220')).toHaveCount(0)
  await expect(page.getByTestId('CitizenClaimWidget-custodial-claim-all-122')).toHaveCount(0)

  await claimButton.click()

  // Single-claim fallback emits single-chain success toast and opens NextTaskModal.
  await expect(page.getByText('Claim succeeded on Celo')).toBeVisible({ timeout: 20_000 })
  const drawerHeadline = page.getByText('One good next step')
  await expect(drawerHeadline).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('Stake your G$ and earn')).toBeVisible()

  // ClaimChainBreakdown stays absent after claim completion as well.
  await expect(page.getByText('Celo', { exact: true })).toHaveCount(1)
  await expect(page.getByTestId('CitizenClaimWidget-custodial-claim-all-42220')).toHaveCount(0)

  const cta = page.getByRole('button', { name: 'Explore staking' })
  await expect(cta).toBeVisible()
  await cta.scrollIntoViewIfNeeded()
  await cta.click()

  await expect(page.locator('body')).toHaveAttribute('data-next-task-navigated', 'https://gooddollar.org/stake')
  await expect(drawerHeadline).not.toBeInViewport()
})

test('CitizenClaimWidget real flow: drawer does NOT open when every claim fails', async ({
  page,
}) => {
  await page.goto(MOCK_WIDGET_ALL_FAILS_STORY)
  await page.waitForLoadState('domcontentloaded')

  const claimButton = page.getByRole('button', { name: /Claim/i })
  await expect(claimButton).toBeVisible({ timeout: 15_000 })
  await claimButton.click()

  // Wait for claim failure outcome to be reported and execution to settle
  await expect(page.getByText('Claim failed on Celo')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('Claim failed on Fuse')).toBeVisible({ timeout: 20_000 })
  await expect(claimButton).toBeEnabled({ timeout: 20_000 })

  // Assert the drawer headline did not open
  const drawerHeadline = page.getByText('One good next step')
  await expect(drawerHeadline).not.toBeInViewport()
})

test('CitizenClaimWidget real flow: drawer does NOT open when nextTaskContent is absent', async ({
  page,
}) => {
  await page.goto(MOCK_WIDGET_WITHOUT_NEXT_TASK_STORY)
  await page.waitForLoadState('domcontentloaded')

  const claimButton = page.getByRole('button', { name: /Claim/i })
  await expect(claimButton).toBeVisible({ timeout: 15_000 })
  await claimButton.click()

  // Wait for claim success outcome to be reported, proving the claim succeeded
  await expect(page.getByText('Claim succeeded on Celo')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('Claim succeeded on Fuse')).toBeVisible({ timeout: 20_000 })

  // Assert the drawer was not opened despite success
  const drawerHeadline = page.getByText('One good next step')
  await expect(drawerHeadline).toHaveCount(0)
})
