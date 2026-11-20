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
  apiKeyTabActive:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--api-key-tab-active&viewMode=story',
  apiKeyTabEmpty:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--api-key-tab-empty&viewMode=story',
  apiKeyTabComingSoon:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--api-key-tab-coming-soon&viewMode=story',
  apiKeyTabError:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--api-key-tab-error&viewMode=story',
  apiKeyReadySheet:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--api-key-ready-sheet&viewMode=story',
  buyTabUnavailable:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--buy-tab-unavailable&viewMode=story',
  historyTab: '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--history-tab&viewMode=story',
  insufficientBalance:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--insufficient-g-balance&viewMode=story',
  buyTabError: '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--buy-tab-error&viewMode=story',
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
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
}

async function expectWidget(page: Page, testId: string) {
  const root = page.getByTestId(testId)
  await expect(root).toBeVisible({ timeout: 20_000 })
  return root
}

function widget(page: Page, testId: string) {
  return page.getByTestId(testId)
}

test('AiCreditsWidget connecting — Buy tab shows the connecting state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.connecting)
  const root = page.getByTestId('AiCreditsWidget-connecting')
  await expect(root).toBeVisible()
  await expect(root.getByText('Connecting...')).toBeVisible()
  await expect(root.getByText('Buy Credits', { exact: true })).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-12-connecting.png',
    fullPage: true,
  })
})

test('AiCreditsWidget disconnected', async ({ page }) => {
  await gotoStory(page, STORY_IDS.disconnected)
  const root = await expectWidget(page, 'AiCreditsWidget-disconnected')
  await expect(root.getByText('Connect your wallet to get started')).toBeVisible()
  await expect(root.getByRole('button', { name: 'Connect Wallet' })).toBeVisible()
  await expect(root.getByText('Buy Credits', { exact: true })).toBeVisible()
  await expect(root.getByText('API Key', { exact: true })).toBeVisible()
  await expect(root.getByText('Set Up', { exact: true })).toHaveCount(0)
  await root.getByText('API Key', { exact: true }).click({ force: true })
  await expect(root.getByText('Connect your wallet to get started')).toBeVisible()
  await expect(root.getByText('Purchase Flow')).not.toBeVisible()
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
  await expect(root.getByText('Buy Credits').first()).toBeVisible()
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

test('AiCreditsWidget API Key tab — key card, spend limit and rotate/revoke confirm dialogs', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.apiKeyTabActive)
  const root = await expectWidget(page, 'AiCreditsWidget-api-key-tab')
  await expect(root.getByText('Buy Credits', { exact: true })).toBeVisible()
  await expect(root.getByText('API Key', { exact: true })).toBeVisible()
  await expect(root.getByText('History', { exact: true })).toBeVisible()
  await expect(root.getByText('Set Up', { exact: true })).toHaveCount(0)
  await expect(page.getByText('110.00', { exact: true })).toBeVisible()
  await expect(root.getByText('Used this month')).toBeVisible()
  await expect(root.getByText('Withdrawable')).toHaveCount(0)
  await expect(root.getByText('Active', { exact: true })).toBeVisible()
  await expect(root.getByText('Base URL')).toBeVisible()
  await expect(root.getByRole('button', { name: 'Copy base URL' })).toBeVisible()
  await expect(root.getByText(/of .* used · Resets/)).toBeVisible()
  await expect(root.getByText('Close channel')).toHaveCount(0)

  // Confirm dialogs render through a portal outside the widget root, so they are queried page-wide.
  await root.getByRole('button', { name: 'Revoke' }).click()
  await expect(page.getByText('Revoke API key?', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('Revoke API key?', { exact: true })).toHaveCount(0)
  await expect(root.getByText('Active', { exact: true })).toBeVisible()

  await root.getByRole('button', { name: 'Rotate' }).click()
  await expect(page.getByText('Rotate API key?', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-07-api-key-tab.png',
    fullPage: true,
  })
})

test('AiCreditsWidget API Key tab — empty state points to Buy Credits', async ({ page }) => {
  await gotoStory(page, STORY_IDS.apiKeyTabEmpty)
  const root = await expectWidget(page, 'AiCreditsWidget-api-key-tab-empty')
  await expect(root.getByText('No API key yet')).toBeVisible()
  await root.getByRole('button', { name: 'Buy Credits' }).last().click()
  await expect(root.getByText('No API key yet')).toHaveCount(0)
  await expect(root.getByRole('button', { name: 'Buy AI Credits' })).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-29-api-key-tab-empty.png',
    fullPage: true,
  })
})

test('AiCreditsWidget API Key tab — coming soon when no aiCreditsApi is configured', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.apiKeyTabComingSoon)
  const root = await expectWidget(page, 'AiCreditsWidget-api-key-tab-coming-soon')
  await expect(root.getByText('API keys are coming soon')).toBeVisible()
  await expect(root.getByRole('button', { name: 'Rotate' })).toHaveCount(0)

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-30-api-key-tab-coming-soon.png',
    fullPage: true,
  })
})

test('AiCreditsWidget API Key tab — load failure shows an alert', async ({ page }) => {
  await gotoStory(page, STORY_IDS.apiKeyTabError)
  const root = await expectWidget(page, 'AiCreditsWidget-api-key-tab-error')
  await expect(root.getByRole('alert')).toContainText('Could not load your API key. Please try again.')

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-31-api-key-tab-error.png',
    fullPage: true,
  })
})

test('AiCreditsWidget API key sheet — shown once after rotating, confirm before dismissing', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.apiKeyReadySheet)
  await expectWidget(page, 'AiCreditsWidget-api-key-tab')

  // The story's play() already rotated the key; the sheet portals outside the widget root.
  const sheetHeading = page.getByText('Your API key is ready', { exact: true })
  await expect(sheetHeading).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('button', { name: 'Copy API key' })).toBeVisible()
  await expect(page.getByText(/won't be able to see it again/i)).toBeVisible()
  await expect(page.getByText(/ANTHROPIC_BASE_URL/)).toBeVisible()
  await expect(page.getByText(/mock-gateway\.invalid/).first()).toBeVisible()

  await page.getByRole('button', { name: 'Codex & others' }).click()
  await expect(page.getByText(/OPENAI_BASE_URL/)).toBeVisible()
  await expect(page.getByText(/OPENAI_API_KEY/)).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-32-api-key-ready-sheet.png',
    fullPage: true,
  })

  await page.getByRole('button', { name: "I've saved my key" }).click()
  await expect(sheetHeading).toHaveCount(0)
})

test('AiCreditsWidget buy tab — purchases are disabled when no aiCreditsApi is configured', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.buyTabUnavailable)
  const root = await expectWidget(page, 'AiCreditsWidget-buy-tab-unavailable')
  await expect(root.getByText('Buying credits is not available yet')).toBeVisible()
  await expect(root.getByRole('button', { name: 'Buy AI Credits' })).toHaveCount(0)

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-33-buy-tab-unavailable.png',
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
  await expect(root.getByRole('button', { name: 'Export CSV' })).toBeVisible()
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
  await expect(
    root.getByText('Network request failed. Please try again.', { exact: true }).first(),
  ).toBeVisible()
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
  await expect(root.getByRole('button', { name: 'Buy AI Credits' })).toBeVisible()
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
  const connectRoot = page.getByTestId('AiCreditsWidget-appkit-connect')
  // Wait for whichever variant renders; an instant visibility check races the story mount.
  await expect(noConfig.or(connectRoot)).toBeVisible({ timeout: 20_000 })
  if (await noConfig.isVisible()) {
    await expect(noConfig).toBeVisible()
    await page.screenshot({
      path: 'tests/widgets/ai-credits-widget/test-results/acw-14-appkit-connect-no-config.png',
      fullPage: true,
    })
    return
  }

  const root = connectRoot
  // The story's own play() clicks Connect, so the button may already have
  // flipped to its disabled "Connecting..." state before we look at it.
  const connectBtn = root.getByRole('button', { name: /connect wallet|connecting/i })
  await expect(connectBtn).toBeVisible({ timeout: 20_000 })

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-14-appkit-connect-before.png',
    fullPage: true,
  })

  const openModal = page.locator('w3m-modal.open')
  if (!(await openModal.isVisible().catch(() => false)) && (await connectBtn.isEnabled())) {
    await connectBtn.click({ timeout: 15_000 })
  }

  await expect(openModal).toBeVisible({ timeout: 20_000 })

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-14-appkit-connect-modal-open.png',
    fullPage: true,
  })
})

// ---------------------------------------------------------------------------
// Wallet chip tests
// ---------------------------------------------------------------------------

const WALLET_CONTROLS_STORY_IDS = {
  walletControls:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--wallet-controls&viewMode=story',
  walletControlsHidden:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--wallet-controls-hidden&viewMode=story',
} as const

test('AiCreditsWidget wallet controls: header chip disconnects when the host opts in', async ({
  page,
}) => {
  await gotoStory(page, WALLET_CONTROLS_STORY_IDS.walletControls)
  // expectWidget, not widget(): Storybook compiles a story module on its first
  // request, which can outrun the default assertion timeout on a cold server.
  const root = await expectWidget(page, 'AiCreditsWidget-wallet-controls')

  const chip = root.getByLabel('Wallet options')
  await expect(chip).toBeVisible()
  await expect(root.getByRole('button', { name: /Disconnect/i })).toHaveCount(0)

  await chip.click()
  await expect(root.getByRole('button', { name: 'Disconnect' })).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-27-wallet-controls.png',
    fullPage: true,
  })
})

test('AiCreditsWidget wallet controls: hidden by default for wallet hosts', async ({ page }) => {
  await gotoStory(page, WALLET_CONTROLS_STORY_IDS.walletControlsHidden)
  // expectWidget, not widget(): Storybook compiles a story module on its first
  // request, which can outrun the default assertion timeout on a cold server.
  const root = await expectWidget(page, 'AiCreditsWidget-wallet-controls-hidden')

  // The header keeps its chain badge but offers no address and no session controls.
  await expect(root.getByText('Celo').first()).toBeVisible()
  await expect(root.getByLabel('Wallet options')).toHaveCount(0)
  await expect(root.getByRole('button', { name: /Disconnect/i })).toHaveCount(0)

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-28-wallet-controls-hidden.png',
    fullPage: true,
  })
})

// ---------------------------------------------------------------------------
// Guidance card tests
// ---------------------------------------------------------------------------

const GUIDANCE_STORY_IDS = {
  guidanceCardDefault:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--guidance-card-default&viewMode=story',
  guidanceCardHowToUse:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--guidance-card-how-to-use&viewMode=story',
  guidanceCardFaq:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--guidance-card-faq&viewMode=story',
} as const

test('AiCreditsWidget guidance card: renders above tab navigation', async ({ page }) => {
  await gotoStory(page, GUIDANCE_STORY_IDS.guidanceCardDefault)
  const root = widget(page, 'AiCreditsWidget-guidance-card')
  await expect(root).toBeVisible()

  // Guidance card content is visible
  await expect(root.getByText("WHAT'S INVOLVED:")).toBeVisible()
  await expect(root.getByText(/Get G\$/)).toBeVisible()
  await expect(root.getByText(/Get your API key/)).toBeVisible()
  await expect(
    root.getByText('Buy AI credits with G$ and get an API key for Claude Code, Codex and other AI tools. No install needed.'),
  ).toBeVisible()

  // Only the How to use and FAQs actions remain
  await expect(root.getByRole('button', { name: /how to use/i })).toBeVisible()
  await expect(root.getByRole('button', { name: /faqs/i })).toBeVisible()
  await expect(root.getByText(/Antseed site/i)).toHaveCount(0)
  await expect(root.getByText(/desktop computer/i)).toHaveCount(0)
  await expect(root.getByText(/Antseed API docs/i)).toHaveCount(0)

  // Tab navigation is also visible (card is above it)
  await expect(root.getByText('Buy Credits').first()).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-20-guidance-card-default.png',
    fullPage: true,
  })
})

test('AiCreditsWidget guidance card: How to use opens in-widget guide', async ({ page }) => {
  await gotoStory(page, GUIDANCE_STORY_IDS.guidanceCardHowToUse)
  const root = widget(page, 'AiCreditsWidget-guidance-how-to-use')
  await expect(root).toBeVisible()

  // Click How to use button
  await root.getByRole('button', { name: /how to use/i }).click()

  // Guide content appears inside the buy tab area
  await expect(root.getByRole('button', { name: 'Back' })).toBeVisible()
  await expect(root.getByText(/QUICK SUMMARY/)).toBeVisible()
  await expect(root.getByText('Get G$ and connect your wallet')).toBeVisible()
  await expect(root.getByText('Buy credits and save your API key')).toBeVisible()
  await expect(root.getByText('Paste the base URL and key into your AI tool')).toBeVisible()

  // Tab navigation remains visible (content rendered inside tab, not as a new tab)
  await expect(root.getByText('Buy Credits').first()).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-21-guidance-how-to-use.png',
    fullPage: true,
  })
})

test('AiCreditsWidget guidance card: Back returns to the purchase flow', async ({ page }) => {
  await gotoStory(page, GUIDANCE_STORY_IDS.guidanceCardHowToUse)
  const root = widget(page, 'AiCreditsWidget-guidance-how-to-use')
  await expect(root).toBeVisible()

  // Open how-to-use view
  await root.getByRole('button', { name: /how to use/i }).click()
  await expect(root.getByRole('button', { name: 'Back' })).toBeVisible()

  // Navigate back
  await root.getByRole('button', { name: 'Back' }).click()

  // Purchase flow is restored
  await expect(root.getByRole('button', { name: 'Back' })).toHaveCount(0)
  await expect(root.getByText('Buy Credits').first()).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-22-guidance-back-to-buying.png',
    fullPage: true,
  })
})

test('AiCreditsWidget guidance card: FAQs opens in-widget FAQ', async ({ page }) => {
  await gotoStory(page, GUIDANCE_STORY_IDS.guidanceCardFaq)
  const root = widget(page, 'AiCreditsWidget-guidance-faq')
  await expect(root).toBeVisible()

  // Click FAQs button
  await root.getByRole('button', { name: /faqs/i }).click()

  // FAQ content appears inside the buy tab area
  await expect(root.getByRole('button', { name: 'Back' })).toBeVisible()
  await expect(root.getByText(/I only claim G\$ UBI/i)).toBeVisible()
  await expect(root.getByText(/Deposit or subscribe/i)).toBeVisible()
  await expect(root.getByText('What if I lose my API key?')).toBeVisible()
  await expect(root.getByText('Can I get unused credits back?')).toBeVisible()
  await expect(root.getByText(/Signer Private Key/i)).toHaveCount(0)
  await expect(root.getByText(/Credit Management/i)).toHaveCount(0)

  // Tab navigation remains visible
  await expect(root.getByText('Buy Credits').first()).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-23-guidance-faq.png',
    fullPage: true,
  })
})

test('AiCreditsWidget guidance card: switching tabs clears help view', async ({ page }) => {
  await gotoStory(page, GUIDANCE_STORY_IDS.guidanceCardHowToUse)
  const root = widget(page, 'AiCreditsWidget-guidance-how-to-use')
  await expect(root).toBeVisible()

  // Open how-to-use
  await root.getByRole('button', { name: /how to use/i }).click()
  await expect(root.getByRole('button', { name: 'Back' })).toBeVisible()

  // Switch to the API Key tab
  await root.getByText('API Key', { exact: true }).first().click()

  // How-to-use view is gone
  await expect(root.getByRole('button', { name: 'Back' })).toHaveCount(0)

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-24-guidance-tab-switch.png',
    fullPage: true,
  })
})
