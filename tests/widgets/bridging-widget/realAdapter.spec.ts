import { test, expect, type Page } from '@playwright/test'

test.use({ video: 'on' })

type FixtureEvent = { kind: string; [key: string]: string | number | boolean }
type FixtureWindow = Window & {
  __bridgingWidgetFixture?: {
    events: FixtureEvent[]
    holdNextSwitch: () => void
    releaseSwitch: () => void
    holdNextFreshQuote: () => void
    releaseFreshQuote: () => void
    holdBridge: () => void
    releaseBridge: () => void
    setAccount: (address: string | null) => void
    failNextHistoryRefresh: () => void
    markDelivered: () => void
  }
}

async function gotoFixture(page: Page, story: 'submit' | 'history') {
  await page.goto(`/iframe.html?id=qa-bridgingwidget-runtime-fixtures--real-adapter-${story}&viewMode=story`)
  await page.waitForFunction(() => Boolean((window as FixtureWindow).__bridgingWidgetFixture))
  await expect(page.getByTestId('BridgingWidget-real-adapter')).toBeVisible()
}

async function events(page: Page): Promise<FixtureEvent[]> {
  return page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.events ?? [])
}

async function waitForEvent(page: Page, kind: string, count = 1) {
  await expect.poll(async () => (await events(page)).filter((event) => event.kind === kind).length).toBe(count)
}

async function prepareRoute(page: Page) {
  await gotoFixture(page, 'submit')
  await page.getByRole('button', { name: 'Fuse', exact: true }).first().click()
  await page.getByRole('button', { name: 'Celo', exact: true }).last().click()
  await page.getByPlaceholder('0.00').fill('100')
  await expect(page.getByTestId('BridgingWidget-review-cta')).toBeVisible()
  await page.getByTestId('BridgingWidget-review-cta').click()
  await expect(page.getByTestId('BridgingWidget-review-screen')).toBeVisible()
}

test.describe('real adapter submit flow', () => {
  test('switches source chain, refreshes the quote, and gives that quote to doBridge', async ({ page }) => {
    test.setTimeout(60_000)
    await prepareRoute(page)
    await page.getByTestId('BridgingWidget-review-confirm').click()
    await expect(page.getByTestId('BridgingWidget-confirm-done')).toBeVisible()

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

    await page.getByTestId('BridgingWidget-confirm-modal').screenshot({
      path: 'tests/widgets/bridging-widget/test-results/bw-30-real-adapter-result.png',
    })
    const video = page.video()
    await page.close()
    await video?.saveAs('tests/widgets/bridging-widget/test-results/bw-30-real-adapter-happy-path.webm')
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

  await page.getByRole('button', { name: 'Celo', exact: true }).first().dispatchEvent('click')
  await expect(page.getByTestId('BridgingWidget-review-cta')).toHaveCount(0)
  await page.evaluate(() => (window as FixtureWindow).__bridgingWidgetFixture?.releaseFreshQuote())
  await expect.poll(async () => (await events(page)).filter((event) => event.kind === 'quote-returned' && event.refresh).length).toBe(1)
  await page.waitForTimeout(50)
  expect((await events(page)).filter((event) => event.kind === 'doBridge')).toHaveLength(0)
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
  await expect(page.getByTestId('BridgingWidget-confirm-done')).toBeVisible()
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
