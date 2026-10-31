import { test, expect, type Page } from '@playwright/test'

test.use({ video: 'on' })
const SCREENSHOT_DIR = process.env.GOODWIDGET_QA_SCREENSHOT_DIR ?? 'tests/widgets/bridging-widget/test-results'

type FixtureEvent = { kind: string; [key: string]: string | number | boolean }
type FixtureWindow = Window & {
  __bridgingWidgetFixture?: {
    events: FixtureEvent[]
    holdNextSwitch: () => void
    releaseSwitch: () => void
    holdNextFreshQuote: () => void
    releaseFreshQuote: () => void
    failNextFreshQuoteWithRevert: () => void
    holdBridge: () => void
    releaseBridge: () => void
    failNextBridgeWithRevert: () => void
    setAccount: (address: string | null) => void
    setWalletChain: (chainId: number) => void
    failNextHistoryRefresh: () => void
    markDelivered: () => void
  }
}

async function gotoFixture(page: Page, story: 'submit' | 'history') {
  await page.goto(`/iframe.html?id=qa-bridgingwidget-runtime-fixtures--mocked-sdk-${story}&viewMode=story`)
  await page.waitForFunction(() => Boolean((window as FixtureWindow).__bridgingWidgetFixture))
  await expect(page.getByTestId('BridgingWidget-mocked-sdk-fixture')).toBeVisible()
  await expect(page.getByText(/Mocked wallet and SDK responses/)).toBeVisible()
}

async function events(page: Page): Promise<FixtureEvent[]> {
  return page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.events ?? [])
}

async function waitForEvent(page: Page, kind: string, count = 1, timeout = 5_000) {
  await expect.poll(
    async () => (await events(page)).filter((event) => event.kind === kind).length,
    { timeout },
  ).toBe(count)
}

async function prepareRoute(page: Page) {
  await gotoFixture(page, 'submit')
  await page.getByTestId('BridgingWidget-source-select').click()
  await page.getByRole('option', { name: 'Fuse' }).click()
  await page.getByTestId('BridgingWidget-target-select').click()
  await page.getByRole('option', { name: 'Celo' }).click()
  await page.getByPlaceholder('0.00').fill('100')
  await expect(page.getByTestId('BridgingWidget-review-cta')).toBeVisible()
  await page.getByTestId('BridgingWidget-review-cta').click()
  await expect(page.getByTestId('BridgingWidget-review-screen')).toBeVisible()
}

test.describe('SDK-mocked adapter submit flow', () => {
  test('switches source chain, refreshes the quote, and gives that quote to doBridge', async ({ page }) => {
    test.setTimeout(60_000)
    await prepareRoute(page)
    expect((await events(page)).filter((event) => event.kind === 'switch')).toHaveLength(0)
    await page.getByTestId('BridgingWidget-review-confirm').click()
    await expect(page.getByTestId('BridgingWidget-confirm-done')).toContainText('Continue in background')
    await expect(page.getByTestId('BridgingWidget-bridge-progress')).toContainText('Bridging in progress')
    await expect(page.getByRole('link', { name: /Track on LayerZero/ })).toBeVisible()
    await expect(page.getByTestId('BridgingWidget-review-screen')).toBeHidden()
    await page.getByText('Bridge status').scrollIntoViewIfNeeded()
    await expect(page.getByText('Bridge status')).toBeInViewport({ ratio: 1 })

    const trace = await events(page)
    const switchIndex = trace.findIndex((event) => event.kind === 'switch')
    const freshQuoteIndex = trace.findIndex((event) => event.kind === 'quote' && event.refresh)
    const bridgeIndex = trace.findIndex((event) => event.kind === 'doBridge')
    expect(switchIndex).toBeGreaterThanOrEqual(0)
    expect(freshQuoteIndex).toBeGreaterThan(switchIndex)
    expect(bridgeIndex).toBeGreaterThan(freshQuoteIndex)
    expect(trace[bridgeIndex]).toMatchObject({
      receivedFreshQuote: true,
      amount: '10000',
      targetChainId: 42220,
    })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/bw-30-mocked-sdk-result.png`,
    })
    const video = page.video()
    await page.close()
    await video?.saveAs(`${SCREENSHOT_DIR}/bw-30-mocked-sdk-flow.webm`)
  })

  test('submission progress updates from pending to delivered with destination explorer link', async ({ page }) => {
    test.setTimeout(60_000)
    await prepareRoute(page)
    await page.getByTestId('BridgingWidget-review-confirm').click()
    await expect(page.getByTestId('BridgingWidget-delivery-status')).toContainText('Bridging in progress')

    await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.markDelivered())
    await waitForEvent(page, 'history-status', 2, 20_000)
    await expect(page.getByTestId('BridgingWidget-delivery-status')).toContainText('Bridge complete')
    await expect(page.getByRole('link', { name: /Destination transaction/ })).toHaveAttribute(
      'href',
      /celoscan\.io\/tx\/0x4444444444444444/,
    )
    await expect(page.getByTestId('BridgingWidget-review-screen')).toBeHidden()
    await page.getByText('Bridge status').scrollIntoViewIfNeeded()
    await expect(page.getByText('Bridge status')).toBeInViewport({ ratio: 1 })
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/bw-32-delivered-progress.png`,
    })
  })
})

test('account change during network switch cancels preparation before a fresh quote', async ({ page }) => {
  await prepareRoute(page)
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.holdNextSwitch())
  await page.getByTestId('BridgingWidget-review-confirm').click()
  await waitForEvent(page, 'switch')

  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.setAccount(null))
  await expect(page.getByTestId('BridgingWidget-connect-cta')).toBeVisible()
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.releaseSwitch())
  await waitForEvent(page, 'switch-resolved')
  await page.waitForTimeout(50)

  const trace = await events(page)
  expect(trace.filter((event) => event.kind === 'quote' && event.refresh)).toHaveLength(0)
  expect(trace.filter((event) => event.kind === 'doBridge')).toHaveLength(0)
})

test('source change during a fresh quote cancels preparation before doBridge', async ({ page }) => {
  await prepareRoute(page)
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.holdNextFreshQuote())
  await page.getByTestId('BridgingWidget-review-confirm').click()
  await expect.poll(async () => (await events(page)).filter((event) => event.kind === 'quote' && event.refresh).length).toBe(1)

  // The preparation drawer intentionally blocks pointer input to the bridge
  // form. Trigger the underlying source control programmatically to model a
  // host-driven route update while the fresh quote is still pending.
  await page.getByTestId('BridgingWidget-source-select').evaluate((element) => {
    (element as HTMLButtonElement).click()
  })
  await page.getByRole('option', { name: 'Celo' }).evaluate((element) => {
    (element as HTMLButtonElement).click()
  })
  await expect(page.getByTestId('BridgingWidget-review-cta')).toHaveCount(0)
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.releaseFreshQuote())
  await expect.poll(async () => (await events(page)).filter((event) => event.kind === 'quote-returned' && event.refresh).length).toBe(1)
  await page.waitForTimeout(50)
  expect((await events(page)).filter((event) => event.kind === 'doBridge')).toHaveLength(0)
})

test('external wallet network change updates an explicitly selected source', async ({ page }) => {
  await prepareRoute(page)
  await page.getByRole('button', { name: 'Cancel' }).click()
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.setWalletChain(1))

  await expect(page.getByTestId('BridgingWidget-source-select')).toContainText('Ethereum')
  await expect(page.getByTestId('BridgingWidget-target-select')).toContainText('Choose a destination')
  expect((await events(page)).filter((event) => event.kind === 'doBridge')).toHaveLength(0)
})

test('changing source does not rescan account-wide history', async ({ page }) => {
  await gotoFixture(page, 'history')
  await waitForEvent(page, 'history-scan')
  await page.getByTestId('BridgingWidget-source-select').click()
  await page.getByRole('option', { name: 'Fuse' }).click()
  await expect(page.getByTestId('BridgingWidget-source-select')).toContainText('Fuse')
  await page.waitForTimeout(100)
  expect((await events(page)).filter((event) => event.kind === 'history-scan')).toHaveLength(1)
})

test('account change after doBridge starts keeps transaction progress visible', async ({ page }) => {
  await prepareRoute(page)
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.holdBridge())
  await page.getByTestId('BridgingWidget-review-confirm').click()
  await waitForEvent(page, 'doBridge')

  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.setAccount(null))
  await expect(page.getByTestId('BridgingWidget-confirm-modal')).toBeVisible()
  await expect(page.getByText('Bridging…')).toBeVisible()
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.releaseBridge())
  await expect(page.getByTestId('BridgingWidget-confirm-done')).toContainText('Continue in background')
  expect((await events(page)).filter((event) => event.kind === 'doBridge')).toHaveLength(1)
})

test('fresh-quote revert does not claim the bridge transaction reverted', async ({ page }) => {
  await prepareRoute(page)
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.failNextFreshQuoteWithRevert())
  await page.getByTestId('BridgingWidget-review-confirm').click()

  await expect(page.getByTestId('BridgingWidget-confirm-modal')).toContainText(
    'Unable to prepare bridge. Please try again.',
  )
  expect((await events(page)).filter((event) => event.kind === 'doBridge')).toHaveLength(0)
})

test('doBridge revert retains the transaction-specific hint', async ({ page }) => {
  await prepareRoute(page)
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.failNextBridgeWithRevert())
  await page.getByTestId('BridgingWidget-review-confirm').click()

  await expect(page.getByTestId('BridgingWidget-confirm-modal')).toContainText(
    'Bridge transaction reverted on-chain. Try a smaller amount.',
  )
  expect((await events(page)).filter((event) => event.kind === 'doBridge')).toHaveLength(1)
})

test('failed history refresh still lets the pending-status poll complete delivery', async ({ page }) => {
  test.setTimeout(45_000)
  await page.clock.install()
  await gotoFixture(page, 'history')
  await page.getByText('History', { exact: true }).first().click()
  await expect(page.getByTestId('BridgingWidget-history-row')).toContainText('pending')

  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.failNextHistoryRefresh())
  await page.getByRole('button', { name: 'Refresh history' }).click()
  await expect(page.getByText(/History could not be refreshed/)).toBeVisible()
  const scansBeforePoll = (await events(page)).filter((event) => event.kind === 'history-scan').length
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.markDelivered())
  await page.clock.fastForward(15_000)

  await expect(page.getByTestId('BridgingWidget-history-row')).toContainText('completed')
  expect((await events(page)).filter((event) => event.kind === 'history-scan')).toHaveLength(scansBeforePoll)
})
