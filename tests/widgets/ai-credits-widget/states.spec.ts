import { expect, test, type Page } from '@playwright/test'

// Story IDs mapped to the QA fixture stories for each widget state.
const STORY_IDS = {
  disconnected:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--disconnected&viewMode=story',
  connectedEmpty:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--connected-empty&viewMode=story',
  quoteReady:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--quote-ready&viewMode=story',
  quoteReadyGoodId:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--quote-ready-good-id&viewMode=story',
  paymentPending:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--payment-pending&viewMode=story',
  paymentConfirmed:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--payment-confirmed&viewMode=story',
  hasCredits:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--has-credits&viewMode=story',
  usageEmpty:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--usage-empty&viewMode=story',
  usageActive:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--usage-active&viewMode=story',
  insufficientBalance:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--insufficient-g-balance&viewMode=story',
  paymentFailed:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--payment-failed&viewMode=story',
  backendUnavailable:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--backend-unavailable&viewMode=story',
  unsupportedChain:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--unsupported-chain&viewMode=story',
} as const

async function gotoStory(page: Page, storyUrl: string): Promise<void> {
  await page.goto(storyUrl)
  await page.waitForLoadState('domcontentloaded')
}

test('AiCreditsWidget disconnected state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.disconnected)
  await expect(page.getByTestId('AiCreditsWidget-disconnected')).toBeVisible()
  await expect(page.getByText('Connect your wallet to purchase')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Connect Wallet' })).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-01-disconnected.png',
    fullPage: true,
  })
})

test('AiCreditsWidget connected_empty state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.connectedEmpty)
  await expect(page.getByTestId('AiCreditsWidget-connected-empty')).toBeVisible()
  await expect(page.getByText('Your G$ Balance')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-02-connected-empty.png',
    fullPage: true,
  })
})

test('AiCreditsWidget quote_ready state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.quoteReady)
  await expect(page.getByTestId('AiCreditsWidget-quote-ready')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Buy AI Credits' })).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-03-quote-ready.png',
    fullPage: true,
  })
})

test('AiCreditsWidget quote_ready GoodID bonus', async ({ page }) => {
  await gotoStory(page, STORY_IDS.quoteReadyGoodId)
  await expect(page.getByTestId('AiCreditsWidget-quote-ready-goodid')).toBeVisible()
  await expect(page.getByText('+20% Bonus', { exact: true })).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-04-quote-ready-goodid.png',
    fullPage: true,
  })
})

test('AiCreditsWidget payment_pending state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.paymentPending)
  await expect(page.getByTestId('AiCreditsWidget-payment-pending')).toBeVisible()
  await expect(page.getByText('Transaction submitted — waiting for confirmation…')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-05-payment-pending.png',
    fullPage: true,
  })
})

test('AiCreditsWidget payment_confirmed state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.paymentConfirmed)
  await expect(page.getByTestId('AiCreditsWidget-payment-confirmed')).toBeVisible()
  await expect(page.getByText('settling credits on Base')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-06-payment-confirmed.png',
    fullPage: true,
  })
})

test('AiCreditsWidget has_credits state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.hasCredits)
  await expect(page.getByTestId('AiCreditsWidget-has-credits')).toBeVisible()
  await expect(page.getByText('AI Credits')).toBeVisible()
  await expect(page.getByText('110.00 credits')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-07-has-credits.png',
    fullPage: true,
  })
})

test('AiCreditsWidget usage_empty state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.usageEmpty)
  await expect(page.getByTestId('AiCreditsWidget-usage-empty')).toBeVisible()
  await expect(page.getByText('credits are depleted')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-08-usage-empty.png',
    fullPage: true,
  })
})

test('AiCreditsWidget usage_active state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.usageActive)
  await expect(page.getByTestId('AiCreditsWidget-usage-active')).toBeVisible()
  await expect(page.getByText('87.50 credits')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-09-usage-active.png',
    fullPage: true,
  })
})

test('AiCreditsWidget insufficient_g_balance state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.insufficientBalance)
  await expect(page.getByTestId('AiCreditsWidget-insufficient-balance')).toBeVisible()
  await expect(page.getByText('Insufficient G$ Balance')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-10-insufficient-balance.png',
    fullPage: true,
  })
})

test('AiCreditsWidget payment_failed state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.paymentFailed)
  await expect(page.getByTestId('AiCreditsWidget-payment-failed')).toBeVisible()
  await expect(page.getByText('Payment Failed')).toBeVisible()
  await expect(page.getByText('Transaction reverted: insufficient allowance').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-11-payment-failed.png',
    fullPage: true,
  })
})

test('AiCreditsWidget backend_unavailable state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.backendUnavailable)
  await expect(page.getByTestId('AiCreditsWidget-backend-unavailable')).toBeVisible()
  await expect(page.getByText('Service Unavailable')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-12-backend-unavailable.png',
    fullPage: true,
  })
})

test('AiCreditsWidget unsupported_chain state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.unsupportedChain)
  await expect(page.getByTestId('AiCreditsWidget-unsupported-chain')).toBeVisible()
  await expect(page.getByText('Wrong Network')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Switch to Celo' })).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-13-unsupported-chain.png',
    fullPage: true,
  })
})
