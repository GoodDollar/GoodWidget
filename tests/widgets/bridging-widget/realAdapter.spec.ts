import { test, expect, type Page } from '@playwright/test'

test.use({ video: 'on' })
const SCREENSHOT_DIR = process.env.GOODWIDGET_QA_SCREENSHOT_DIR ?? 'tests/widgets/bridging-widget/test-results'

type FixtureEvent = { kind: string; [key: string]: string | number | boolean }
type FixtureWindow = Window & {
  __bridgingWidgetFixture?: {
    events: FixtureEvent[]
    holdNextSwitch: () => void
    releaseSwitch: () => void
    rejectNextSwitch: () => void
    holdNextFreshQuote: () => void
    releaseFreshQuote: () => void
    failNextFreshQuoteWithRevert: () => void
    holdBridge: () => void
    releaseBridge: () => void
    failNextBridgeWithRevert: () => void
    revertNextBridgeReceipt: () => void
    failNextApprovalWithRevert: () => void
    raiseNextFreshQuoteFee: () => void
    raiseFeeAfterApproval: () => void
    blockRaisedFeeForBalance: () => void
    failBridgeConfirmation: () => void
    failNextBridgeWithFundsError: () => void
    setAccount: (address: string | null) => void
    setWalletChain: (chainId: number) => void
    failNextHistoryRefresh: () => void
    failNextDeliveryStatus: () => void
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

test('an increased fee before submission requires a second review, not an automatic retry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepareRoute(page)
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.raiseNextFreshQuoteFee())
  await page.getByTestId('BridgingWidget-review-confirm').click()
  await expect(page.getByTestId('BridgingWidget-confirm-modal')).toContainText('Bridge fees changed.')
  await expect(page.getByTestId('BridgingWidget-confirm-modal')).toContainText('Review updated fees')
  await expect(page.getByTestId('BridgingWidget-confirm-modal')).not.toContainText('Bridge Failed')
  expect((await events(page)).filter((event) => event.kind === 'doBridge')).toHaveLength(0)
  await expect(page.getByTestId('BridgingWidget-confirm-retry')).toBeInViewport()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bw-40-fee-change-review.png` })
  await page.getByRole('button', { name: 'Review updated quote' }).click()
  await expect(page.getByTestId('BridgingWidget-review-screen')).toBeVisible()
  expect((await events(page)).filter((event) => event.kind === 'doBridge')).toHaveLength(0)
  await page.getByTestId('BridgingWidget-review-confirm').click()
  await expect(page.getByTestId('BridgingWidget-confirm-done')).toBeVisible()
})

test('fee increases after approval return to Review without another automatic bridge attempt', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepareRoute(page)
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.raiseFeeAfterApproval())
  await page.getByTestId('BridgingWidget-review-confirm').click()
  await expect(page.getByTestId('BridgingWidget-confirm-modal')).toContainText('Bridge fees changed.')
  expect((await events(page)).filter((event) => event.kind === 'bridge-complete')).toHaveLength(0)
  await page.getByRole('button', { name: 'Review updated quote' }).click()
  await expect(page.getByTestId('BridgingWidget-review-screen')).toBeVisible()
  expect((await events(page)).filter((event) => event.kind === 'doBridge')).toHaveLength(1)
  await page.getByTestId('BridgingWidget-review-confirm').click()
  await expect(page.getByTestId('BridgingWidget-confirm-done')).toBeVisible()
  expect((await events(page)).filter((event) => event.kind === 'doBridge')).toHaveLength(2)
})

test('an unaffordable updated quote keeps Review confirmation disabled', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepareRoute(page)
  await page.evaluate(() => {
    const fixture = (window as FixtureWindow).__bridgingWidgetFixture
    fixture?.raiseFeeAfterApproval()
    fixture?.blockRaisedFeeForBalance()
  })
  await page.getByTestId('BridgingWidget-review-confirm').click()
  await page.getByRole('button', { name: 'Review updated quote' }).click()
  await expect(page.getByTestId('BridgingWidget-review-screen')).toContainText('Insufficient native balance for bridge fee')
  await expect(page.getByTestId('BridgingWidget-review-confirm')).toBeDisabled()
  expect((await events(page)).filter((event) => event.kind === 'doBridge')).toHaveLength(1)
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bw-41-updated-fee-unaffordable.png` })
})

test('receipt lookup failure preserves the source link and does not offer a duplicate Retry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepareRoute(page)
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.failBridgeConfirmation())
  await page.getByTestId('BridgingWidget-review-confirm').click()
  const modal = page.getByTestId('BridgingWidget-confirm-modal')
  await expect(modal).toContainText('Confirmation unavailable')
  await expect(modal).toContainText('Bridge transaction was sent')
  await expect(modal.getByRole('link', { name: 'View source transaction' })).toHaveAttribute('href', /explorer\.fuse\.io\/tx\/0x3333/)
  await expect(page.getByTestId('BridgingWidget-confirm-retry')).toHaveCount(0)
  expect((await events(page)).filter((event) => event.kind === 'doBridge')).toHaveLength(1)
  await expect(modal.getByRole('link', { name: 'View source transaction' })).toBeInViewport()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bw-42-confirmation-unavailable.png` })
  await page.getByRole('button', { name: 'Close bridge status' }).click()
  await expect(modal).toBeHidden()
  await expect(page.getByRole('textbox', { name: 'Amount to send' })).toHaveValue('')
})

test('RPC-wrapped native funding failures do not show a misleading connection error', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepareRoute(page)
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.failNextBridgeWithFundsError())
  await page.getByTestId('BridgingWidget-review-confirm').click()
  const modal = page.getByTestId('BridgingWidget-confirm-modal')
  await expect(modal).toContainText('Insufficient native balance for the bridge fee and transaction gas.')
  await expect(modal).not.toContainText('Check your connection')
  expect((await events(page)).filter((event) => event.kind === 'bridge-complete')).toHaveLength(0)
  await expect(page.getByTestId('BridgingWidget-confirm-retry')).toBeInViewport()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bw-43-native-funding-error.png` })
})

test.describe('SDK-mocked adapter submit flow', () => {
  test('switches source chain, refreshes the quote, and gives that quote to doBridge', async ({ page }) => {
    test.setTimeout(60_000)
    await prepareRoute(page)
    await expect(page.getByTestId('BridgingWidget-review-switch-hint')).toContainText(
      'Confirm will ask your wallet to switch to Fuse.',
    )
    expect((await events(page)).filter((event) => event.kind === 'switch')).toHaveLength(0)
    await page.getByTestId('BridgingWidget-review-confirm').click()
    await expect(page.getByTestId('BridgingWidget-confirm-done')).toContainText('Continue in background')
    await expect(page.getByTestId('BridgingWidget-delivery-status')).toHaveText('Bridging in progress')
    await expect(page.getByRole('link', { name: /Track on LayerZero/ })).toBeVisible()
    await expect(page.getByTestId('BridgingWidget-review-screen')).toBeHidden()
    await expect(page.getByTestId('BridgingWidget-delivery-status')).toBeInViewport({ ratio: 1 })

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
    await waitForEvent(page, 'history-status')

    await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.markDelivered())
    await expect(page.getByTestId('BridgingWidget-delivery-status')).toHaveText('Bridge complete', { timeout: 20_000 })
    await expect(page.getByRole('link', { name: /Destination transaction/ })).toHaveAttribute(
      'href',
      /celoscan\.io\/tx\/0x4444444444444444/,
    )
    await expect(page.getByTestId('BridgingWidget-review-screen')).toBeHidden()
    await expect(page.getByTestId('BridgingWidget-delivery-status')).toBeInViewport({ ratio: 1 })
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/bw-32-delivered-progress.png`,
    })
  })
})

test('rejecting a network switch shows a cancellation and Retry switches before submitting', async ({ page }) => {
  test.setTimeout(60_000)
  await prepareRoute(page)
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.rejectNextSwitch())
  await page.getByTestId('BridgingWidget-review-confirm').click()

  await expect(page.getByTestId('BridgingWidget-confirm-modal')).toContainText('Network switch canceled in wallet.')
  await waitForEvent(page, 'switch-rejected')
  let trace = await events(page)
  expect(trace.filter((event) => event.kind === 'quote' && event.refresh)).toHaveLength(0)
  expect(trace.filter((event) => event.kind === 'doBridge')).toHaveLength(0)

  await page.getByTestId('BridgingWidget-confirm-retry').click()
  await expect(page.getByTestId('BridgingWidget-confirm-done')).toBeVisible()
  trace = await events(page)
  const switchEvents = trace.filter((event) => event.kind === 'switch')
  const freshQuotes = trace.filter((event) => event.kind === 'quote' && event.refresh)
  const bridgeCalls = trace.filter((event) => event.kind === 'doBridge')
  expect(switchEvents).toHaveLength(2)
  expect(freshQuotes).toHaveLength(1)
  expect(bridgeCalls).toHaveLength(1)
  expect(trace.indexOf(freshQuotes[0])).toBeGreaterThan(trace.indexOf(switchEvents[1]))
  expect(trace.indexOf(bridgeCalls[0])).toBeGreaterThan(trace.indexOf(freshQuotes[0]))
})

test('Review keeps the switch hint and Confirm reachable on a short mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 504 })
  await prepareRoute(page)
  await expect(page.getByTestId('BridgingWidget-review-switch-hint')).toContainText(
    'Confirm will ask your wallet to switch to Fuse.',
  )
  const scrollArea = page.getByTestId('BridgingWidget-review-screen').locator('..')
  await scrollArea.evaluate((element) => { element.scrollTop = element.scrollHeight })
  await expect(page.getByTestId('BridgingWidget-review-confirm')).toBeInViewport()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bw-36-review-switch-mobile.png` })
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

  // The drawer blocks the form, but the wallet can still change networks.
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.setWalletChain(1))
  await expect(page.getByTestId('BridgingWidget-source-select')).toContainText('Ethereum')
  await expect(page.getByTestId('BridgingWidget-review-cta')).toBeDisabled()
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.releaseFreshQuote())
  await expect.poll(async () => (await events(page)).filter((event) => event.kind === 'quote-returned' && event.refresh).length).toBe(1)
  await page.waitForTimeout(50)
  expect((await events(page)).filter((event) => event.kind === 'doBridge')).toHaveLength(0)
})

test('swapping reverses the route without retaining the amount or prompting the wallet', async ({ page }) => {
  await prepareRoute(page)
  await page.getByRole('button', { name: 'Cancel' }).click()
  await page.getByTestId('BridgingWidget-swap-route').click()
  await expect(page.getByTestId('BridgingWidget-source-select')).toContainText('Celo')
  await expect(page.getByTestId('BridgingWidget-target-select')).toContainText('Fuse')
  await expect(page.getByRole('textbox', { name: 'Amount to send' })).toHaveValue('')
  await expect(page.getByTestId('BridgingWidget-review-cta')).toBeDisabled()
  await expect(page.getByRole('button', { name: /Axelar/ })).toBeDisabled()
  await expect(page.getByRole('button', { name: /LayerZero/ })).toHaveAttribute('aria-pressed', 'true')
  expect((await events(page)).filter((event) => event.kind === 'switch' || event.kind === 'doBridge')).toHaveLength(0)
})

test('external wallet network change updates an explicitly selected source', async ({ page }) => {
  await prepareRoute(page)
  await page.getByRole('button', { name: 'Cancel' }).click()
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.setWalletChain(1))

  await expect(page.getByTestId('BridgingWidget-source-select')).toContainText('Ethereum')
  await expect(page.getByTestId('BridgingWidget-target-select')).toContainText('Select')
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

test('reverted bridge receipt is a failed submission, not pending delivery', async ({ page }) => {
  await prepareRoute(page)
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.revertNextBridgeReceipt())
  await page.getByTestId('BridgingWidget-review-confirm').click()
  await expect(page.getByTestId('BridgingWidget-confirm-modal')).toContainText(
    'Bridge transaction reverted on-chain. Try a smaller amount.',
  )
  await expect(page.getByTestId('BridgingWidget-confirm-retry')).toBeVisible()
  expect((await events(page)).filter((event) => event.kind === 'history-status')).toHaveLength(0)
})

test('approval revert stays on the approval step', async ({ page }) => {
  await prepareRoute(page)
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.failNextApprovalWithRevert())
  await page.getByTestId('BridgingWidget-review-confirm').click()
  await expect(page.getByTestId('BridgingWidget-confirm-modal')).toContainText(
    'Token approval failed on-chain. Please approve and try again.',
  )
  await expect(page.getByTestId('BridgingWidget-confirm-retry')).toBeVisible()
})

test('open history detail follows a pending transfer through delivery', async ({ page }) => {
  await page.clock.install()
  await gotoFixture(page, 'history')
  await page.getByText('History', { exact: true }).first().click()
  await expect(page.getByTestId('BridgingWidget-history-row')).toContainText('pending')
  await page.getByTestId('BridgingWidget-history-row').click()
  await expect(page.getByTestId('BridgingWidget-history-detail')).toContainText('Bridging in progress')

  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.markDelivered())
  await page.clock.fastForward(15_000)
  await expect(page.getByTestId('BridgingWidget-history-detail')).toContainText('Bridge complete')
  await expect(page.getByTestId('BridgingWidget-history-detail').getByRole('link', { name: /Destination transaction/ })).toBeVisible()
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
  // Delivery recovery cannot claim that the separate failed history scan recovered.
  await expect(page.getByText(/History could not be refreshed/)).toBeVisible()
  await expect(page.getByText(/Some delivery statuses could not be checked/)).toHaveCount(0)
  await page.getByRole('button', { name: 'Refresh history' }).click()
  await expect(page.getByText(/History could not be refreshed/)).toHaveCount(0)
  await expect(page.getByTestId('BridgingWidget-history-row')).toContainText('completed')
})

test('delivery warning appears only after a failed lookup and clears when it recovers', async ({ page }) => {
  await page.clock.install()
  await gotoFixture(page, 'history')
  await page.getByText('History', { exact: true }).first().click()
  const warning = page.getByText(/Some delivery statuses could not be checked/)
  await expect(page.getByTestId('BridgingWidget-history-row')).toContainText('pending')
  await expect(warning).toHaveCount(0)

  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.failNextDeliveryStatus())
  await page.clock.fastForward(15_000)
  await expect(warning).toBeVisible()
  await expect(page.getByTestId('BridgingWidget-history-row')).toContainText('pending')

  await page.clock.fastForward(15_000)
  await expect(warning).toHaveCount(0)
  await expect(page.getByTestId('BridgingWidget-history-row')).toContainText('pending')

  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.markDelivered())
  await page.clock.fastForward(15_000)
  await expect(page.getByTestId('BridgingWidget-history-row')).toContainText('completed')
  await expect(warning).toHaveCount(0)
})
