import { expect, test, type Page } from '@playwright/test'

const STORY_IDS = {
  disconnected: '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--disconnected&viewMode=story',
  connecting: '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--connecting&viewMode=story',
  purchaseSetup:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--purchase-setup&viewMode=story',
  quoteReady: '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--quote-ready&viewMode=story',
  quoteReadyGoodId:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--quote-ready-good-id&viewMode=story',
  paymentPending:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--payment-pending&viewMode=story',
  paymentConfirmed:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--payment-confirmed&viewMode=story',
  creditsManagement:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--credits-management&viewMode=story',
  insufficientBalance:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--insufficient-g-balance&viewMode=story',
  paymentFailed:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--payment-failed&viewMode=story',
  backendUnavailable:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--backend-unavailable&viewMode=story',
  unsupportedChain:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--unsupported-chain&viewMode=story',
  appKitProviderDefault:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--app-kit-provider-default&viewMode=story',
  appKitConnectWallet:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--app-kit-connect-wallet&viewMode=story',
} as const

async function gotoStory(page: Page, storyUrl: string): Promise<void> {
  await page.goto(storyUrl)
  await page.waitForLoadState('domcontentloaded')
}

function widget(page: Page, testId: string) {
  return page.getByTestId(testId)
}

test('AiCreditsWidget disconnected', async ({ page }) => {
  await gotoStory(page, STORY_IDS.disconnected)
  await expect(page.getByTestId('AiCreditsWidget-disconnected')).toBeVisible()
  await expect(page.getByText('Connect your wallet to buy AI credits')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Connect Wallet' })).toBeVisible()
  await expect(page.getByText('Purchase Flow')).not.toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-01-disconnected.png',
    fullPage: true,
  })
})

test('AiCreditsWidget purchase_setup', async ({ page }) => {
  await gotoStory(page, STORY_IDS.purchaseSetup)
  const root = widget(page, 'AiCreditsWidget-purchase-setup')
  await expect(root).toBeVisible()
  await expect(root.getByText('You need G$ before you can buy AI credits.')).toBeVisible()
  await expect(root.getByText('Purchase Flow')).toBeVisible()
  await expect(root.getByRole('button', { name: 'Sign & Generate Key' }).first()).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-02-purchase-setup.png',
    fullPage: true,
  })
})

test('AiCreditsWidget quote_ready', async ({ page }) => {
  await gotoStory(page, STORY_IDS.quoteReady)
  await expect(page.getByTestId('AiCreditsWidget-quote-ready')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Buy AI Credits' })).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-03-quote-ready.png',
    fullPage: true,
  })
})

test('AiCreditsWidget quote_ready GoodID', async ({ page }) => {
  await gotoStory(page, STORY_IDS.quoteReadyGoodId)
  const root = widget(page, 'AiCreditsWidget-quote-ready-goodid')
  await expect(root).toBeVisible()
  await expect(root.getByText('+10% deposit')).toBeVisible()
  await expect(root.getByText('+20% stream')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-04-quote-ready-goodid.png',
    fullPage: true,
  })
})

test('AiCreditsWidget payment_pending', async ({ page }) => {
  await gotoStory(page, STORY_IDS.paymentPending)
  await expect(page.getByTestId('AiCreditsWidget-payment-pending')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-05-payment-pending.png',
    fullPage: true,
  })
})

test('AiCreditsWidget payment_confirmed', async ({ page }) => {
  await gotoStory(page, STORY_IDS.paymentConfirmed)
  await expect(page.getByTestId('AiCreditsWidget-payment-confirmed')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-06-payment-confirmed.png',
    fullPage: true,
  })
})

test('AiCreditsWidget manage tab', async ({ page }) => {
  await gotoStory(page, STORY_IDS.creditsManagement)
  await expect(page.getByTestId('AiCreditsWidget-manage-tab')).toBeVisible()
  await expect(page.getByText('Buy Credits')).toBeVisible()
  await expect(page.getByText('Manage')).toBeVisible()
  await expect(page.getByText('110.00')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-07-credits-management.png',
    fullPage: true,
  })
})

test('AiCreditsWidget insufficient_g_balance', async ({ page }) => {
  await gotoStory(page, STORY_IDS.insufficientBalance)
  await expect(page.getByTestId('AiCreditsWidget-insufficient-balance')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-08-insufficient-g-balance.png',
    fullPage: true,
  })
})

test('AiCreditsWidget payment_failed', async ({ page }) => {
  await gotoStory(page, STORY_IDS.paymentFailed)
  await expect(page.getByTestId('AiCreditsWidget-payment-failed')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-09-payment-failed.png',
    fullPage: true,
  })
})

test('AiCreditsWidget backend_unavailable', async ({ page }) => {
  await gotoStory(page, STORY_IDS.backendUnavailable)
  await expect(page.getByTestId('AiCreditsWidget-backend-unavailable')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-10-backend-unavailable.png',
    fullPage: true,
  })
})

test('AiCreditsWidget unsupported_chain', async ({ page }) => {
  await gotoStory(page, STORY_IDS.unsupportedChain)
  await expect(page.getByTestId('AiCreditsWidget-unsupported-chain')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-11-unsupported-chain.png',
    fullPage: true,
  })
})

test('AiCreditsWidget connecting', async ({ page }) => {
  await gotoStory(page, STORY_IDS.connecting)
  await expect(page.getByTestId('AiCreditsWidget-connecting')).toBeVisible()
  await expect(page.getByText('Connecting...')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-12-connecting.png',
    fullPage: true,
  })
})

test('AiCreditsWidget appkit provider default', async ({ page }) => {
  await gotoStory(page, STORY_IDS.appKitProviderDefault)
  await expect(page.getByTestId('AiCreditsWidget-appkit-provider-default')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-13-appkit-provider-default.png',
    fullPage: true,
  })
})

test('AiCreditsWidget appkit connect wallet opens modal', async ({ page }) => {
  await gotoStory(page, STORY_IDS.appKitConnectWallet)
  await page.waitForLoadState('domcontentloaded')

  // When VITE_REOWN_PROJECT_ID is not configured the story shows a placeholder.
  // Assert the placeholder renders correctly and stop — modal cannot be tested without the key.
  const noConfig = page.getByTestId('AiCreditsWidget-appkit-no-config')
  if (await noConfig.isVisible()) {
    await expect(noConfig).toBeVisible()
    await page.screenshot({
      path: 'tests/widgets/ai-credits-widget/test-results/acw-14-appkit-connect-no-config.png',
      fullPage: true,
    })
    return
  }

  // AppKit is configured — assert the widget renders in disconnected state.
  const widget = page.getByTestId('AiCreditsWidget-appkit-connect')
  await expect(widget).toBeVisible()
  const connectBtn = widget.getByRole('button', { name: 'Connect Wallet' })
  await expect(connectBtn).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-14-appkit-connect-before.png',
    fullPage: true,
  })

  // Click Connect Wallet — the connectOverride calls AppKit modal.open().
  await connectBtn.click()

  // AppKit renders its modal as a <w3m-modal> custom element in the document body.
  // Wait for it to become visible (the modal opens asynchronously).
  await expect(page.locator('w3m-modal')).toBeVisible({ timeout: 10_000 })

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-14-appkit-connect-modal-open.png',
    fullPage: true,
  })
})
