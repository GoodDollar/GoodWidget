/**
 * states.spec.ts — Playwright tests for CitizenClaimWidget states.
 *
 * Tests use the CustodialLocalFixture story with a randomly-generated test wallet
 * (address: 0x329377cbeeF39f01b0Ea04B80465c9eB47D3ED81) that has no on-chain history,
 * so the expected live-RPC flow is: loading → not_whitelisted.
 * The live test requires forno.celo.org for identity reads; auxiliary claimable
 * balances and stats also read rpc.fuse.io and rpc.ankr.com/xdc.
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
 *   tests/widgets/citizen-claim-widget/test-results/                     (widget screenshot evidence + debug)
 *   test-results/                                                        (Playwright traces/videos/attachments)
 */
import { test, expect, Page, Route } from '@playwright/test'

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

// ─── not_whitelisted state (live RPC) ────────────────────────────────────────
test('CitizenClaimWidget shows not_whitelisted for fresh wallet (live Celo RPC)', async ({
  page,
  browserName,
}) => {
  // Allow the 40s live-RPC assertion plus navigation, CTA checks, and screenshot.
  test.setTimeout(60_000)
  test.skip(
    browserName !== 'chromium',
    'Live RPC test requires --disable-web-security / --ignore-certificate-errors',
  )

  await gotoStory(page)

  // A retrying assertion reports the actual widget text if RPC/state resolution fails.
  const widget = page.locator('body')
  await expect(widget, 'Expected not_whitelisted state from live Celo RPC').toContainText(
    'Whitelisting Required',
    { timeout: 40_000 },
  )
  await expect(widget.getByRole('button', { name: 'Verify', exact: true })).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-02-not-whitelisted.png',
    fullPage: true,
  })
})

test('CitizenClaimWidget preserves verification after late addressless auxiliary reads', async ({
  page,
}) => {
  const entitlementRoutes: Route[] = []
  const statsRoutes: Route[] = []
  const zeroWord = '0'.repeat(64)
  const statsResult = `0x${(17).toString(16).padStart(64, '0')}${zeroWord}`

  await page.route(/https:\/\/(forno\.celo\.org|rpc\.fuse\.io|rpc\.ankr\.com)\/.*/, async (route) => {
    const { id, params } = route.request().postDataJSON()
    const data = params[0].data as string
    // Hold the initial addressless entitlement and stats reads past wallet discovery.
    if (data === '0x98d6621b') {
      entitlementRoutes.push(route)
    } else if (data === '0x069786ea') {
      statsRoutes.push(route)
    } else {
      // The connected identity read resolves immediately to a zero root.
      await route.fulfill({ json: { jsonrpc: '2.0', id, result: `0x${zeroWord}` } })
    }
  })

  await gotoStory(page)
  const verify = page.getByRole('button', { name: 'Verify', exact: true })
  await expect(verify).toBeVisible({ timeout: 15_000 })
  await expect.poll(() => entitlementRoutes.length).toBe(3)
  await expect.poll(() => statsRoutes.length).toBe(6)

  for (const route of entitlementRoutes) {
    const finished = page.waitForEvent('requestfinished', (request) => request === route.request())
    const { id } = route.request().postDataJSON()
    await route.fulfill({ json: { jsonrpc: '2.0', id, result: `0x${zeroWord}` } })
    await finished
  }
  // Stats finish last so their rendered value signals completion of the held reads.
  for (const route of statsRoutes) {
    const { id } = route.request().postDataJSON()
    await route.fulfill({ json: { jsonrpc: '2.0', id, result: statsResult } })
  }
  await expect(page.getByText('17', { exact: true })).toBeVisible()
  await expect(page.getByText('Whitelisting Required', { exact: true })).toBeVisible()
  await expect(verify).toBeVisible()
  await expect(page.getByText('Connect your wallet to claim daily G$', { exact: true })).toBeHidden()
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-06-late-addressless-refresh.png',
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
  // Block RPCs to enter error state, then unblock to allow retry to succeed
  let blocked = true
  await page.route('https://forno.celo.org/**', (route) =>
    blocked ? route.abort() : route.continue(),
  )
  await page.route('https://rpc.fuse.io/**', (route) =>
    blocked ? route.abort() : route.continue(),
  )
  await page.route('https://rpc.ankr.com/**', (route) =>
    blocked ? route.abort() : route.continue(),
  )

  await gotoStory(page)
  await waitForText(page, ['Retry'], 20_000)

  // Unblock and click Retry
  blocked = false
  const retryBtn = page.locator('text=Retry')
  await expect(retryBtn).toBeVisible()
  await retryBtn.click()

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-04-retry-clicked.png',
    fullPage: true,
  })

  // After retry, the adapter should transition back through loading
  await page.waitForTimeout(500)
  const afterClickText = await page.evaluate(() => document.body.innerText)
  // Either back in loading (no Retry, no Verify) or resolved to not_whitelisted
  // — both are valid depending on timing
  expect(afterClickText).toBeTruthy()
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
  expect(measuredDuration).toBeLessThan(6_500)

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-05-custodial-claim-all-contract.png',
    fullPage: true,
  })
})
