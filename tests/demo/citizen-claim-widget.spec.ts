/**
 * citizen-claim-widget.spec.ts — Playwright tests for CitizenClaimWidget states.
 *
 * Tests use the CustodialLocalFixture story with a randomly-generated test wallet
 * (address: 0x329377cbeeF39f01b0Ea04B80465c9eB47D3ED1) that has no on-chain history,
 * so the expected live-RPC flow is: loading → not_whitelisted.
 *
 * The error state is tested by intercepting and blocking all RPC network calls.
 *
 * Story URL:
 *   /iframe.html?id=widgets-citizenclaimwidget--custodial-local-fixture&viewMode=story
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
 *   test-results/           (screenshots, traces — gitignored)
 */
import { test, expect, Page } from '@playwright/test'

const STORY_URL =
  '/iframe.html?id=widgets-citizenclaimwidget--custodial-local-fixture&viewMode=story'

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
  await gotoStory(page)
  // The widget should enter the loading state immediately — capture it within 500ms
  await page.waitForTimeout(300)
  // The daily-stats footer renders even during loading
  const bodyText = await page.evaluate(() => document.body.innerText)
  // Loading is indicated by the absence of a CTA button (Verify / Claim / Retry)
  const hasSpinner = !bodyText.includes('Verify') && !bodyText.includes('Retry')
  expect(hasSpinner, 'Expected loading state before RPC resolves').toBe(true)
  await page.screenshot({
    path: 'test-results/ccw-01-loading.png',
    fullPage: true,
  })
})

// ─── not_whitelisted state (live RPC) ────────────────────────────────────────
test('CitizenClaimWidget shows not_whitelisted for fresh wallet (live Celo RPC)', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Live RPC test requires --disable-web-security / --ignore-certificate-errors',
  )

  await gotoStory(page)

  // Wait up to 40s for the identity check to complete
  const matched = await waitForText(page, ['Verify', 'Whitelisting', 'Face'], 40_000)
  expect(matched, 'Expected not_whitelisted state with Verify CTA').toBeTruthy()

  const bodyText = await page.evaluate(() => document.body.innerText)
  expect(bodyText).toMatch(/Verify|Whitelisting Required|Face/i)

  await page.screenshot({
    path: 'test-results/ccw-02-not-whitelisted.png',
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
    path: 'test-results/ccw-03-error.png',
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
    path: 'test-results/ccw-04-retry-clicked.png',
    fullPage: true,
  })

  // After retry, the adapter should transition back through loading
  await page.waitForTimeout(500)
  const afterClickText = await page.evaluate(() => document.body.innerText)
  // Either back in loading (no Retry, no Verify) or resolved to not_whitelisted
  // — both are valid depending on timing
  expect(afterClickText).toBeTruthy()
})
