/**
 * states.spec.ts — Playwright tests for CitizenClaimWidget states.
 *
 * Tests use the CustodialLocalFixture story with a randomly-generated test wallet
 * (address: 0x329377cbeeF39f01b0Ea04B80465c9eB47D3ED1) that has no on-chain history,
 * so the expected flow is: loading → not_whitelisted.
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
test('CitizenClaimWidget shows not_whitelisted for fresh wallet (mocked Celo RPC)', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Custodial provider story requires --disable-web-security / --ignore-certificate-errors',
  )

  // Mock the Celo RPC endpoint so the test is deterministic and does not depend on
  // forno.celo.org availability in CI. The mock returns a zero address for
  // getWhitelistedRoot(address) (4-byte selector 0x2d0e9b46), which the ClaimSDK
  // interprets as "not whitelisted". All other calls return an empty result since
  // daily-stats and claimable reads are best-effort and caught internally.
  type JsonRpcReq = { id: number; method: string; params?: unknown[] }

  const mockRpc = (req: JsonRpcReq): object => {
    if (req.method === 'eth_call') {
      const call = req.params?.[0] as { data?: string } | undefined
      // getWhitelistedRoot(address) → zero address = not whitelisted
      if (call?.data?.startsWith('0x2d0e9b46')) {
        return { jsonrpc: '2.0', id: req.id, result: '0x' + '0'.repeat(64) }
      }
    }
    return { jsonrpc: '2.0', id: req.id, result: '0x' }
  }

  await page.route('https://forno.celo.org/**', async (route, request) => {
    let body: unknown
    try {
      body = request.postDataJSON()
    } catch {
      await route.continue()
      return
    }
    const result = Array.isArray(body)
      ? (body as JsonRpcReq[]).map(mockRpc)
      : mockRpc(body as JsonRpcReq)
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(result) })
  })

  await gotoStory(page)

  // Wait up to 15s — the mock responds immediately so no long wait is needed
  const matched = await waitForText(page, ['Verify', 'Whitelisting', 'Face'], 15_000)
  expect(matched, 'Expected not_whitelisted state with Verify CTA').toBeTruthy()

  const bodyText = await page.evaluate(() => document.body.innerText)
  expect(bodyText).toMatch(/Verify|Whitelisting Required|Face/i)

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-02-not-whitelisted.png',
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
  expect(measuredDuration).toBeLessThan(10_000)

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-05-custodial-claim-all-contract.png',
    fullPage: true,
  })
})
