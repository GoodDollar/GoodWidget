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
  historyTab:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--history-tab&viewMode=story',
  setupTab:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--setup-tab&viewMode=story',
  insufficientBalance:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--insufficient-g-balance&viewMode=story',
  buyTabError:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--buy-tab-error&viewMode=story',
  paymentFailed:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--payment-failed&viewMode=story',
  backendUnavailable:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--backend-unavailable&viewMode=story',
  unsupportedChain:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--unsupported-chain&viewMode=story',
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
  const root = page.getByTestId('AiCreditsWidget-disconnected')
  await expect(root).toBeVisible()
  // Inline connect banner is shown instead of a full-screen blocking panel
  await expect(root.getByText('Connect your wallet')).toBeVisible()
  await expect(root.getByRole('button', { name: 'Connect Wallet' })).toBeVisible()
  // Main tab navigation is visible even before connecting
  await expect(root.getByText('Setup')).toBeVisible()
  await expect(root.getByText('Buy Credits')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-01-disconnected.png',
    fullPage: true,
  })
})

test('AiCreditsWidget connecting — inline banner shows', async ({ page }) => {
  await gotoStory(page, STORY_IDS.connecting)
  const root = page.getByTestId('AiCreditsWidget-connecting')
  await expect(root).toBeVisible()
  // Inline connect banner visible with spinner text while connecting
  await expect(root.getByText('Connecting...')).toBeVisible()
  // Setup tab still visible in background shell
  await expect(root.getByText('Setup')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-12-connecting.png',
    fullPage: true,
  })
})

test('AiCreditsWidget Setup tab — onboarding steps visible', async ({ page }) => {
  await gotoStory(page, STORY_IDS.setupTab)
  const root = page.getByTestId('AiCreditsWidget-setup-tab')
  await expect(root).toBeVisible()
  // All three onboarding steps must be present
  await expect(root.getByText('Download AntSeed')).toBeVisible()
  await expect(root.getByText('Signer Key')).toBeVisible()
  await expect(root.getByText('Authorize Wallet')).toBeVisible()
  // Tab bar shows both Setup and Buy Credits as separate tabs
  await expect(root.getByText('Setup')).toBeVisible()
  await expect(root.getByText('Buy Credits')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-20-setup-tab.png',
    fullPage: true,
  })
})

test('AiCreditsWidget purchase_setup', async ({ page }) => {  await gotoStory(page, STORY_IDS.purchaseSetup)
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
  // The pay step's content (and its "Buy AI Credits" submit button) only mounts once the
  // drawer is opened; open it via the outer trigger before asserting on drawer content.
  await page.getByRole('button', { name: 'Set Amounts & Pay' }).click()
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
  await expect(root.getByText('GoodID verified')).toBeVisible()
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
  // All four tabs should be visible in the navigation bar
  await expect(page.getByText('Setup')).toBeVisible()
  await expect(page.getByText('Buy Credits')).toBeVisible()
  await expect(page.getByText('Manage')).toBeVisible()
  await expect(page.getByText('History')).toBeVisible()
  await expect(page.getByText('110.00')).toBeVisible()
  await expect(page.getByText('Credit History')).not.toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-07-credits-management.png',
    fullPage: true,
  })
})

test('AiCreditsWidget history tab', async ({ page }) => {
  await gotoStory(page, STORY_IDS.historyTab)
  const root = widget(page, 'AiCreditsWidget-history-tab')
  await expect(root).toBeVisible()
  await expect(root.getByText('AI Credit History')).toBeVisible()
  await expect(root.getByText('Last 90 days activity')).toBeVisible()
  await expect(root.getByRole('checkbox', { name: 'Deposit' })).toBeVisible()
  await expect(root.getByText('CREDIT HISTORY', { exact: true })).toBeVisible()
  await expect(root.getByText('G$ Deposit')).toBeVisible({ timeout: 10_000 })
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-13-history-tab.png',
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

test('AiCreditsWidget buy tab with error', async ({ page }) => {
  await gotoStory(page, STORY_IDS.buyTabError)
  const root = page.getByTestId('AiCreditsWidget-buy-tab-error')
  await expect(root).toBeVisible()
  await expect(root.getByText('Request Failed', { exact: true })).toBeVisible()
  await expect(root.getByText('Network request failed. Please try again.', { exact: true })).toBeVisible()
  await expect(root.getByRole('button', { name: 'Buy AI Credits' })).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-15-buy-tab-error.png',
    fullPage: true,
  })
})

test('AiCreditsWidget payment_failed', async ({ page }) => {
  await gotoStory(page, STORY_IDS.paymentFailed)
  const root = page.getByTestId('AiCreditsWidget-payment-failed')
  await expect(root).toBeVisible()
  await expect(root.getByText('Payment Failed', { exact: true })).toBeVisible()
  await expect(root.getByText('Payment failed. Try again.', { exact: true }).first()).toBeVisible()
  await expect(root.getByText('Needs attention', { exact: true })).toBeVisible()
  await expect(root.getByText('Set Amounts & Pay', { exact: true })).toBeVisible()
  await expect(root.getByRole('button', { name: 'Try Again' })).toHaveCount(0)
  await expect(root.getByText('insufficient allowance')).toHaveCount(0)
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

test('AiCreditsWidget appkit connect wallet opens modal', async ({ page }) => {
  test.setTimeout(60_000)
  await gotoStory(page, STORY_IDS.appKitConnectWallet)
  await page.waitForLoadState('domcontentloaded')

  const noConfig = page.getByTestId('AiCreditsWidget-appkit-no-config')
  if (await noConfig.isVisible()) {
    await expect(noConfig).toBeVisible()
    await page.screenshot({
      path: 'tests/widgets/ai-credits-widget/test-results/acw-14-appkit-connect-no-config.png',
      fullPage: true,
    })
    return
  }

  const root = page.getByTestId('AiCreditsWidget-appkit-connect')
  await expect(root).toBeVisible()
  const connectBtn = root.getByRole('button', { name: 'Connect Wallet' })
  await expect(connectBtn).toBeVisible({ timeout: 20_000 })
  await expect(connectBtn).toBeEnabled({ timeout: 20_000 })

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-14-appkit-connect-before.png',
    fullPage: true,
  })

  const openModal = page.locator('w3m-modal.open')
  if (!(await openModal.isVisible().catch(() => false))) {
    await connectBtn.click({ timeout: 15_000 })
  }

  await expect(openModal).toBeVisible({ timeout: 20_000 })

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-14-appkit-connect-modal-open.png',
    fullPage: true,
  })
})

// ---------------------------------------------------------------------------
// Multi-buyer tests
// ---------------------------------------------------------------------------

const MULTI_BUYER_STORY_IDS = {
  multiBuyerManage:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--multi-buyer-manage&viewMode=story',
  deepLinkBuyer:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--deep-link-buyer&viewMode=story',
  deepLinkConsentPending:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--deep-link-consent-pending&viewMode=story',
  multiBuyerHistory:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--multi-buyer-history&viewMode=story',
} as const

test('AiCreditsWidget multi-buyer manage: buyer selector is visible', async ({ page }) => {
  await gotoStory(page, MULTI_BUYER_STORY_IDS.multiBuyerManage)
  const root = widget(page, 'AiCreditsWidget-multi-buyer-manage')
  await expect(root).toBeVisible()

  await expect(root.getByText(/0xfc12/i)).toBeVisible()
  await expect(root.getByText(/0xAbcD|0xabcd/i)).toBeVisible()
  await expect(root.getByText(/0x1111/i)).toBeVisible()
  await expect(root.getByRole('button', { name: /Sign & Generate/i })).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-15-multi-buyer-manage.png',
    fullPage: true,
  })
})

test('AiCreditsWidget deep-link buyer: Sign Consent enabled via operatorSignature', async ({
  page,
}) => {
  await gotoStory(page, MULTI_BUYER_STORY_IDS.deepLinkBuyer)
  const root = widget(page, 'AiCreditsWidget-deep-link-buyer')
  await expect(root).toBeVisible()

  const signConsentButton = root.getByRole('button', { name: /Sign Consent/i })
  await expect(signConsentButton).toBeEnabled()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-16-deep-link-buyer.png',
    fullPage: true,
  })
})

test('AiCreditsWidget deep-link consent pending: OperatorConsentStep requires an explicit click', async ({
  page,
}) => {
  await gotoStory(page, MULTI_BUYER_STORY_IDS.deepLinkConsentPending)
  const root = widget(page, 'AiCreditsWidget-deep-link-consent-pending')
  await expect(root).toBeVisible()

  // A pre-filled operatorSignature must never auto-advance past consent: the explicit
  // "Sign Operator Consent" gate has to render before any consent is granted.
  const openConsentStepButton = root.getByRole('button', { name: 'Sign Operator Consent' })
  await expect(openConsentStepButton).toBeVisible()
  await openConsentStepButton.click()

  // The Drawer renders via a Tamagui Sheet portal outside the widget's root DOM
  // subtree, so its content must be queried at the page level, not scoped to `root`.
  await expect(
    page.getByText(/Granting consent gives the operator control of your signer funds/i),
  ).toBeVisible()
  await expect(
    page.getByText(/ineligible for future bonuses and removes any existing bonuses/i),
  ).toBeVisible()
  await expect(page.getByText('Operator consent accepted')).not.toBeVisible()

  const signConsentButton = page.getByRole('button', { name: 'Sign Operator Consent' })
  await expect(signConsentButton).toBeEnabled()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-19-deep-link-consent-pending.png',
    fullPage: true,
  })
})

test('AiCreditsWidget multi-buyer history: buyer filter dropdown is visible', async ({ page }) => {
  await gotoStory(page, MULTI_BUYER_STORY_IDS.multiBuyerHistory)
  const root = widget(page, 'AiCreditsWidget-multi-buyer-history')
  await expect(root).toBeVisible()

  await expect(root.getByText(/Buyer: All buyers/i)).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-17-multi-buyer-history.png',
    fullPage: true,
  })
})

test('AiCreditsWidget multi-buyer: import buyer key link is visible', async ({ page }) => {
  await gotoStory(page, MULTI_BUYER_STORY_IDS.multiBuyerManage)
  const root = widget(page, 'AiCreditsWidget-multi-buyer-manage')
  await expect(root).toBeVisible()

  await expect(root.getByText(/Import a buyer key/i)).toBeVisible()
  await expect(root.getByText(/Watch Address/i)).toHaveCount(0)

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-18-import-key-link.png',
    fullPage: true,
  })
})

