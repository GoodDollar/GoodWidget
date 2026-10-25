import { test, expect, type Page } from '@playwright/test'

const STORY_PREFIX = '/iframe.html?id=qa-bridgingwidget-runtime-fixtures--'

function storyUrl(storyId: string): string {
  return `${STORY_PREFIX}${storyId}&viewMode=story`
}

async function gotoStory(page: Page, storyId: string): Promise<void> {
  await page.goto(storyUrl(storyId))
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.body.innerText.trim().length > 0)
}

async function bodyText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText)
}

async function expectBodyToContain(page: Page, patterns: Array<string | RegExp>) {
  const text = await bodyText(page)
  for (const pattern of patterns) {
    if (typeof pattern === 'string') {
      expect(text).toContain(pattern)
    } else {
      expect(text).toMatch(pattern)
    }
  }
}

async function saveScreenshot(page: Page, name: string, modalTestId?: string) {
  const path = `tests/widgets/bridging-widget/test-results/${name}.png`
  if (modalTestId) {
    await page.getByTestId(modalTestId).screenshot({ path })
    return
  }
  await page.screenshot({
    path,
    fullPage: true,
  })
}

test('BridgingWidget shows the disconnected wallet state with connect action', async ({ page }) => {
  await gotoStory(page, 'no-wallet')

  await expectBodyToContain(page, ['GoodDollar Bridge', 'Connect Wallet', 'Balance: — G$'])
  await saveScreenshot(page, 'bw-01-no-wallet')
})

test('BridgingWidget shows the unsupported network prompt', async ({ page }) => {
  await gotoStory(page, 'wrong-chain')

  await expectBodyToContain(page, [
    'Unsupported network',
    'your wallet will switch when you bridge.',
    'Celo',
    'Ethereum',
    'Fuse',
    'XDC',
  ])
  await saveScreenshot(page, 'bw-02-wrong-chain')
})

test('BridgingWidget renders tab navigation and switches views', async ({ page }) => {
  await gotoStory(page, 'ready-to-bridge')

  await expectBodyToContain(page, ['GoodDollar Bridge', 'Bridge', 'History', 'FAQ', 'Fuse'])

  await page.getByText('History', { exact: true }).first().click()
  await expectBodyToContain(page, ['Fuse', 'Celo', 'Ethereum'])

  await page.getByText('FAQ', { exact: true }).first().click()
  await expectBodyToContain(page, ['What is the Main Bridge?'])

  await saveScreenshot(page, 'bw-03-tab-navigation')
})

test('BridgingWidget shows route-not-supported guidance', async ({ page }) => {
  await gotoStory(page, 'route-not-supported')

  await expectBodyToContain(page, [
    'Route not supported',
    'No bridge protocol connects these two chains yet.',
  ])
  await saveScreenshot(page, 'bw-04-route-not-supported')
})

test('BridgingWidget shows bridge-config loading and error states', async ({ page }) => {
  await gotoStory(page, 'config-loading')
  await expectBodyToContain(page, ['Balance: …'])
  await saveScreenshot(page, 'bw-05-config-loading')

  await gotoStory(page, 'config-error')
  await expectBodyToContain(page, ['Unable to load balance and limits.'])
  await saveScreenshot(page, 'bw-06-config-error')
})

test('BridgingWidget shows fee-quote loading and error states', async ({ page }) => {
  await gotoStory(page, 'quote-loading')
  await expectBodyToContain(page, ['Fetching quote…'])
  await expect(page.getByTestId('BridgingWidget-review-cta')).toHaveCount(0)
  await saveScreenshot(page, 'bw-07-quote-loading')

  await gotoStory(page, 'quote-error')
  await expectBodyToContain(page, ['Unable to fetch a quote for this route right now.'])
  await saveScreenshot(page, 'bw-08-quote-error')
})

test('BridgingWidget surfaces unmet requirements and blocks the Review CTA', async ({ page }) => {
  await gotoStory(page, 'below-min-amount')
  await expectBodyToContain(page, ['Minimum bridge amount is 1 G$.'])
  await expect(page.getByTestId('BridgingWidget-review-cta')).toHaveCount(0)
  await saveScreenshot(page, 'bw-09-below-min-amount')

  await gotoStory(page, 'insufficient-balance')
  await expectBodyToContain(page, ['Your G$ balance is too low for this amount.'])
  await expect(page.getByTestId('BridgingWidget-review-cta')).toHaveCount(0)
  await saveScreenshot(page, 'bw-10-insufficient-balance')
})

test('BridgingWidget flags a one-time approval requirement while still allowing Review', async ({ page }) => {
  await gotoStory(page, 'needs-approval')

  await expectBodyToContain(page, ['This amount needs a one-time G$ approval before it can bridge.'])
  await expect(page.getByTestId('BridgingWidget-review-cta')).toBeVisible()
  await saveScreenshot(page, 'bw-11-needs-approval')
})

test('BridgingWidget shows the fee breakdown and Review CTA when ready to bridge', async ({ page }) => {
  await gotoStory(page, 'ready-to-bridge')

  await expectBodyToContain(page, ['Celo via LayerZero', 'Estimated G$ received', '0.000132 FUSE'])
  await expect(page.getByTestId('BridgingWidget-review-cta')).toBeVisible()
  await saveScreenshot(page, 'bw-12-ready-to-bridge')
})

test('BridgingWidget opens the Review Bridge drawer with route and fee details', async ({ page }) => {
  await gotoStory(page, 'review-open')

  await expectBodyToContain(page, [
    'Review Bridge',
    'G$ Sent',
    'Celo via LayerZero',
    'Estimated G$ received',
    '0.000132 FUSE',
  ])
  await expect(page.getByTestId('BridgingWidget-review-confirm')).toBeVisible()
  await saveScreenshot(page, 'bw-13-review-open', 'BridgingWidget-review-screen')
})

test('BridgingWidget keeps Review confirmation reachable on a short mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 504 })
  await gotoStory(page, 'review-open')

  const scrollArea = page.getByTestId('BridgingWidget-review-screen').locator('..')
  const confirm = page.getByTestId('BridgingWidget-review-confirm')
  await expect.poll(() => scrollArea.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
  await expect.poll(() => scrollArea.evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(200)
  await page.mouse.move(195, 350)
  await page.mouse.wheel(0, 800)
  await expect.poll(() => scrollArea.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  await expect(confirm).toBeInViewport()
  await page.screenshot({ path: 'tests/widgets/bridging-widget/test-results/bw-31-mobile-review-footer.png' })
})

test('BridgingWidget confirm modal tracks the approve/bridge submission steps', async ({ page }) => {
  await gotoStory(page, 'submission-approving')
  await expectBodyToContain(page, ['Approving G$…'])
  await saveScreenshot(page, 'bw-14-submission-approving', 'BridgingWidget-confirm-modal')

  await gotoStory(page, 'submission-bridging')
  await expectBodyToContain(page, ['Bridging…'])
  await saveScreenshot(page, 'bw-15-submission-bridging', 'BridgingWidget-confirm-modal')

  await gotoStory(page, 'submission-completed')
  await expectBodyToContain(page, ['Bridge Submitted'])
  await expect(page.getByTestId('BridgingWidget-confirm-done')).toBeVisible()
  await saveScreenshot(page, 'bw-16-submission-completed', 'BridgingWidget-confirm-modal')
})

test('BridgingWidget confirm modal shows retryable failure states per step', async ({ page }) => {
  await gotoStory(page, 'submission-failed-approving')
  await expectBodyToContain(page, ['Bridge Failed', 'You rejected the approval request.'])
  await expect(page.getByTestId('BridgingWidget-confirm-retry')).toBeVisible()
  await saveScreenshot(page, 'bw-17-submission-failed-approving', 'BridgingWidget-confirm-modal')

  await gotoStory(page, 'submission-failed-bridging')
  await expectBodyToContain(page, ['Bridge Failed', 'The bridge transaction reverted on-chain.'])
  await expect(page.getByTestId('BridgingWidget-confirm-retry')).toBeVisible()
  await saveScreenshot(page, 'bw-18-submission-failed-bridging', 'BridgingWidget-confirm-modal')
})

test('BridgingWidget shows history loading, empty and error states', async ({ page }) => {
  await gotoStory(page, 'history-loading')
  await expectBodyToContain(page, ['Loading history…'])
  await saveScreenshot(page, 'bw-19-history-loading')

  await gotoStory(page, 'history-empty')
  await expectBodyToContain(page, ['Bridge history', 'No transactions found.'])
  await saveScreenshot(page, 'bw-20-history-empty')

  await gotoStory(page, 'history-error')
  await expectBodyToContain(page, ['Unable to load bridge history.'])
  await saveScreenshot(page, 'bw-21-history-error')
})

test('BridgingWidget lists populated bridge history across statuses', async ({ page }) => {
  await gotoStory(page, 'history-populated')

  await expectBodyToContain(page, [
    'Fuse',
    'Celo',
    'Ethereum',
    'XDC',
    'completed',
    'pending',
    'failed',
  ])
  await expect(page.getByTestId('BridgingWidget-history-row')).toHaveCount(3)
  await expect(page.getByTestId('BridgingWidget-history-row').first()).toContainText('120.00 G$')
  await expect(page.getByTestId('BridgingWidget-history-row').last()).toContainText('8.00 G$')
  await saveScreenshot(page, 'bw-22-history-populated')
})

test('BridgingWidget opens the history detail modal with delivery progress', async ({ page }) => {
  await gotoStory(page, 'history-detail-modal-open')

  await expectBodyToContain(page, [
    'LayerZero (Celo, Ethereum, Fuse, XDC) Bridge',
    '120.00 G$',
    'Sent on Fuse',
    'Delivered on Celo',
    'View on explorer',
  ])
  await saveScreenshot(page, 'bw-23-history-detail-modal-open', 'BridgingWidget-history-detail')
})

test('BridgingWidget FAQ tab renders reference content', async ({ page }) => {
  await gotoStory(page, 'faq-tab')

  await expectBodyToContain(page, ['What is the Main Bridge?'])
  await saveScreenshot(page, 'bw-24-faq-tab')
})

test('BridgingWidget renders correctly in the light theme', async ({ page }) => {
  await gotoStory(page, 'light-theme-populated')

  await expectBodyToContain(page, ['GoodDollar Bridge', 'Celo via LayerZero'])
  const inactiveChainLabel = page
    .getByRole('button', { name: 'Ethereum', exact: true })
    .first()
    .getByText('Ethereum', { exact: true })
  await expect(inactiveChainLabel).not.toHaveCSS('color', 'rgb(255, 255, 255)')
  await saveScreenshot(page, 'bw-25-light-theme-populated')
})

test('BridgingWidget renders a usable mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await gotoStory(page, 'ready-to-bridge')
  await expectBodyToContain(page, ['GoodDollar Bridge', 'Bridge', 'History', 'FAQ'])
  await saveScreenshot(page, 'bw-26-mobile-ready-to-bridge')
})

test('BridgingWidget correctly formats 2-decimal Fuse amounts as source', async ({ page }) => {
  await gotoStory(page, 'fuse-source')

  await expectBodyToContain(page, [
    'GoodDollar Bridge',
    'Balance: 500.00 G$',
    'Estimated G$ received',
    '99.75 G$',
    '0.000132 FUSE',
  ])
  await expect(page.getByTestId('BridgingWidget-review-cta')).toBeVisible()
  await saveScreenshot(page, 'bw-27-fuse-source')
})

test('BridgingWidget correctly formats 2-decimal Fuse amounts as destination', async ({ page }) => {
  await gotoStory(page, 'fuse-destination')

  await expectBodyToContain(page, [
    'GoodDollar Bridge',
    'Balance: 500.00 G$',
    'Estimated G$ received',
    '99.75 G$',
    '0.25% (0.25 G$)',
    '0.000132 CELO',
  ])
  await expect(page.getByTestId('BridgingWidget-review-cta')).toBeVisible()
  await saveScreenshot(page, 'bw-28-fuse-destination')
})

test('BridgingWidget completes the interactive route-to-submit flow', async ({ page }) => {
  await gotoStory(page, 'interactive-submit')

  await page.getByRole('button', { name: 'Fuse', exact: true }).first().click()
  await page.getByRole('button', { name: 'Celo', exact: true }).last().click()
  await page.getByPlaceholder('0.00').fill('100')
  await expect(page.getByTestId('BridgingWidget-review-cta')).toBeVisible()
  await page.getByPlaceholder('0.00').fill('101')
  await expect(page.getByTestId('BridgingWidget-review-cta')).toHaveCount(0)
  await expect(page.getByTestId('BridgingWidget-review-cta')).toBeVisible()
  await page.getByPlaceholder('0.00').fill('100')
  await expect(page.getByTestId('BridgingWidget-review-cta')).toBeVisible()
  await page.getByTestId('BridgingWidget-review-cta').click()
  await expect(page.getByTestId('BridgingWidget-review-screen')).toBeVisible()
  await expectBodyToContain(page, ['G$ Sent', '100.00', 'Celo via LayerZero'])
  await page.getByTestId('BridgingWidget-review-confirm').click()
  await expect(page.getByTestId('BridgingWidget-confirm-modal')).toBeVisible()
  await expectBodyToContain(page, ['Bridging…'])
  await expect(page.getByTestId('BridgingWidget-confirm-done')).toBeVisible()
  await saveScreenshot(page, 'bw-29-interactive-submit', 'BridgingWidget-confirm-modal')
})
