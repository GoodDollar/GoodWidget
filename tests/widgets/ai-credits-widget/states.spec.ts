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
  historyTab: '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--history-tab&viewMode=story',
  setupTab: '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--setup-tab&viewMode=story',
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

test('AiCreditsWidget connecting — Setup tab connect prompt shows', async ({ page }) => {
  await gotoStory(page, STORY_IDS.connecting)
  const root = page.getByTestId('AiCreditsWidget-connecting')
  await expect(root).toBeVisible()
  await expect(root.getByText('Connecting...')).toBeVisible()
  await expect(root.getByText('Set Up', { exact: true })).toBeVisible()
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
  await expect(root.getByText('Set Up', { exact: true })).toBeVisible()
  await expect(root.getByText('Buy Credits', { exact: true })).toBeVisible()
  await root.getByText('Buy Credits', { exact: true }).click({ force: true })
  await expect(root.getByText('Connect your wallet to get started')).toBeVisible()
  await expect(root.getByText('Purchase Flow')).not.toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-01-disconnected.png',
    fullPage: true,
  })
})

test('AiCreditsWidget Setup tab — onboarding steps visible', async ({ page }) => {
  await gotoStory(page, STORY_IDS.setupTab)
  const root = page.getByTestId('AiCreditsWidget-setup-tab')
  await expect(root).toBeVisible()
  await expect(root.getByText(/One-time setup required before buying AI Credits/)).toBeVisible()
  // "Get Antseed" is both a guidance-card bullet and the first step; the step is last.
  await expect(root.getByText('Get Antseed', { exact: true }).last()).toBeVisible()
  await expect(root.getByText('Signer key', { exact: true })).toBeVisible()
  await expect(root.getByText('Authorize Credits Management', { exact: true }).last()).toBeVisible()
  await expect(root.getByText('Set Up', { exact: true })).toBeVisible()
  await expect(root.getByText('Buy Credits', { exact: true })).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-20-setup-tab.png',
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

test('AiCreditsWidget manage tab', async ({ page }) => {
  await gotoStory(page, STORY_IDS.creditsManagement)
  const root = page.getByTestId('AiCreditsWidget-manage-tab')
  await expect(root).toBeVisible({ timeout: 10_000 })
  await expect(root.getByText('Set Up', { exact: true })).toBeVisible()
  await expect(root.getByText('Buy Credits', { exact: true })).toBeVisible()
  await expect(root.getByText('Manage', { exact: true })).toBeVisible()
  await expect(root.getByText('History', { exact: true })).toBeVisible()
  await expect(page.getByText('110.00')).toBeVisible()
  await expect(page.getByText('Credit History')).not.toBeVisible()
  // The Signer Key card is collapsed at rest; unauthorize lives inside it.
  await root.getByTestId('signer-key-toggle').click()
  await root.getByRole('button', { name: 'Unauthorize Credit Management' }).click()

  // Like the Set Up authorization sheet, the Drawer renders through a Tamagui Sheet
  // portal outside the widget root, so its content is queried at the page level.
  const revokeSheetTitle = page.getByText('Unauthorize Credit Management?', { exact: true })
  await expect(revokeSheetTitle).toBeVisible()
  await expect(
    page.getByText(/removes the operator's ability to act on your behalf/i),
  ).toBeVisible()
  await expect(page.getByText(/Your credits and your signer key stay where they are/i)).toBeVisible()

  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(revokeSheetTitle).not.toBeInViewport()
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
// Multi-signer tests
// ---------------------------------------------------------------------------

const MULTI_BUYER_STORY_IDS = {
  multiSignerManage:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--multi-signer-manage&viewMode=story',
  deepLinkSigner:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--deep-link-signer&viewMode=story',
  deepLinkConsentPending:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--deep-link-consent-pending&viewMode=story',
  multiSignerHistory:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--multi-signer-history&viewMode=story',
  walletControls:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--wallet-controls&viewMode=story',
  walletControlsHidden:
    '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--wallet-controls-hidden&viewMode=story',
} as const

test('AiCreditsWidget multi-signer manage: signer selector is visible', async ({ page }) => {
  await gotoStory(page, MULTI_BUYER_STORY_IDS.multiSignerManage)
  const root = widget(page, 'AiCreditsWidget-multi-signer-manage')
  await expect(root).toBeVisible()

  // Collapsed by default: the header reports the active signer and its authorization,
  // and nothing else from the card is mounted yet.
  const toggle = root.getByTestId('signer-key-toggle')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(root.getByText(/0xfc12/i).first()).toBeVisible()
  await expect(root.getByText('Authorized', { exact: true })).toBeVisible()
  await expect(root.getByText(/0xAbcD|0xabcd/i)).toHaveCount(0)

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')

  await root.getByRole('button', { name: /Switch signer \(3\)/i }).click()
  await expect(root.getByText(/0xfc12/i).first()).toBeVisible()
  await expect(root.getByText(/0xAbcD|0xabcd/i).first()).toBeVisible()
  await expect(root.getByText(/0x1111/i).first()).toBeVisible()

  // Replacing a signer is a secondary action: it stays behind its own disclosure.
  await expect(root.getByRole('button', { name: 'Generate Signer Key' })).toHaveCount(0)
  await root.getByRole('button', { name: 'New Signer Key' }).click()
  await expect(root.getByRole('button', { name: 'Generate Signer Key' })).toBeVisible()
  await expect(root.getByRole('button', { name: 'Import Signer Key' })).toBeVisible()

  // The private key stays masked until it is explicitly revealed.
  const privateKeyField = root.getByTestId('signer-key-card').getByText(/^•+$/)
  await expect(privateKeyField).toBeVisible()
  await root.getByRole('button', { name: 'Reveal' }).click()
  await expect(root.getByTestId('signer-key-card').getByText(/^0x[0-9a-f]{64}$/i)).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-15-multi-signer-manage.png',
    fullPage: true,
  })
})

test('AiCreditsWidget wallet controls: header chip disconnects when the host opts in', async ({
  page,
}) => {
  await gotoStory(page, MULTI_BUYER_STORY_IDS.walletControls)
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
  await gotoStory(page, MULTI_BUYER_STORY_IDS.walletControlsHidden)
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

test('AiCreditsWidget deep-link signer: Sign Consent enabled via operatorSignature', async ({
  page,
}) => {
  await gotoStory(page, MULTI_BUYER_STORY_IDS.deepLinkSigner)
  const root = widget(page, 'AiCreditsWidget-deep-link-signer')
  await expect(root).toBeVisible()

  // A pre-signed operatorSignature is enough to authorize, even without a private key.
  await root.getByTestId('signer-key-toggle').click()

  await expect(root.getByText('Not authorized').first()).toBeVisible()
  const authorizeButton = root.getByRole('button', { name: 'Authorize Credit Management' })
  await expect(authorizeButton).toBeEnabled()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-16-deep-link-signer.png',
    fullPage: true,
  })
})

test('AiCreditsWidget deep-link authorization pending: Authorize Credits Management requires an explicit click', async ({
  page,
}) => {
  await gotoStory(page, MULTI_BUYER_STORY_IDS.deepLinkConsentPending)
  const root = widget(page, 'AiCreditsWidget-deep-link-consent-pending')
  await expect(root).toBeVisible()

  // A pre-filled operatorSignature must never auto-advance past consent: the
  // authorization gate must render before any permission is granted. The step
  // lives on Set Up now that Buy is purchase-only.
  await root.getByText('Set Up', { exact: true }).click()
  await root.getByText('Authorize Credits Management', { exact: true }).last().click()

  // The Drawer renders via a Tamagui Sheet portal outside the widget's root DOM
  // subtree, so its content must be queried at the page level, not scoped to `root`.
  await expect(page.getByText(/A one-time, on-chain approval — not a payment/i)).toBeVisible()
  await expect(page.getByText(/you can revoke it at any time/i)).toBeVisible()
  await expect(page.getByText('Wallet authorized')).not.toBeVisible()

  const authorizeWalletButton = page.getByRole('button', { name: 'Authorize Credits Management' })
  await expect(authorizeWalletButton).toBeEnabled()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-19-deep-link-consent-pending.png',
    fullPage: true,
  })
})

test('AiCreditsWidget multi-signer history: signer filter dropdown is visible', async ({ page }) => {
  await gotoStory(page, MULTI_BUYER_STORY_IDS.multiSignerHistory)
  const root = widget(page, 'AiCreditsWidget-multi-signer-history')
  await expect(root).toBeVisible()

  await expect(root.getByText(/Signer:/i)).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-17-multi-signer-history.png',
    fullPage: true,
  })
})

test('AiCreditsWidget multi-signer: signer key import is reachable', async ({ page }) => {
  await gotoStory(page, MULTI_BUYER_STORY_IDS.multiSignerManage)
  const root = widget(page, 'AiCreditsWidget-multi-signer-manage')
  await expect(root).toBeVisible()

  await root.getByTestId('signer-key-toggle').click()
  await root.getByRole('button', { name: 'New Signer Key' }).click()
  await root.getByRole('button', { name: 'Import Signer Key' }).click()

  await expect(
    root.getByTestId('signer-key-card').getByPlaceholder('0x…', { exact: true }),
  ).toBeVisible()
  await expect(root.getByText(/Watch Address/i)).toHaveCount(0)

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-18-import-key-link.png',
    fullPage: true,
  })
})

// ---------------------------------------------------------------------------
// Setup guidance card tests
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
  await expect(root.getByText(/Get Antseed/).first()).toBeVisible()

  // All three action buttons are present
  await expect(root.getByRole('button', { name: /how to use/i })).toBeVisible()
  await expect(root.getByRole('button', { name: /faqs/i })).toBeVisible()
  await expect(root.getByText(/Antseed site/i)).toBeVisible()

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
  await expect(root.getByText(/Back to Set Up/i)).toBeVisible()
  await expect(root.getByText(/Getting started with AI credits/)).toBeVisible()
  await expect(root.getByText(/QUICK SUMMARY/)).toBeVisible()
  await expect(root.getByText(/connect your wallet/i)).toBeVisible()

  // Tab navigation remains visible (content rendered inside tab, not as a new tab)
  await expect(root.getByText('Buy Credits').first()).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-21-guidance-how-to-use.png',
    fullPage: true,
  })
})

test('AiCreditsWidget guidance card: Back to setup returns to purchase flow', async ({ page }) => {
  await gotoStory(page, GUIDANCE_STORY_IDS.guidanceCardHowToUse)
  const root = widget(page, 'AiCreditsWidget-guidance-how-to-use')
  await expect(root).toBeVisible()

  // Open how-to-use view
  await root.getByRole('button', { name: /how to use/i }).click()
  await expect(root.getByText(/Back to Set Up/i)).toBeVisible()

  // Navigate back
  await root.getByRole('button', { name: /Back to Set Up/i }).click()

  // Purchase flow is restored
  await expect(root.getByText(/Back to Set Up/i)).not.toBeVisible()
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
  await expect(root.getByText(/Back to Set Up/i)).toBeVisible()
  await expect(root.getByText(/I only claim UBI with GoodWallet/i)).toBeVisible()
  await expect(root.getByText(/Deposit or stream/i)).toBeVisible()

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
  await expect(root.getByText(/Back to Set Up/i)).toBeVisible()

  // Switch to Manage tab
  await root.getByText('Manage', { exact: true }).first().click()

  // How-to-use view is gone
  await expect(root.getByText(/Back to Set Up/i)).not.toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-24-guidance-tab-switch.png',
    fullPage: true,
  })
})

// ---------------------------------------------------------------------------
// Download AntSeed step tests
// ---------------------------------------------------------------------------

const DOWNLOAD_ANTSEED_STORY_ID =
  '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--download-ant-seed-step&viewMode=story'

test('AiCreditsWidget Setup — Download AntSeed step is first and shows Start link', async ({
  page,
}) => {
  await gotoStory(page, DOWNLOAD_ANTSEED_STORY_ID)
  const root = page.getByTestId('AiCreditsWidget-download-antseed-step')
  await expect(root).toBeVisible()

  await expect(root.getByText('Get Antseed', { exact: true }).last()).toBeVisible()
  await expect(root.getByText('Signer key', { exact: true })).toBeVisible()
  await expect(root.getByText('Authorize Credits Management', { exact: true }).last()).toBeVisible()
  await expect(root.getByText('Ready', { exact: true })).toBeVisible()
  // Later steps are skippable rather than locked: they carry no status label at
  // all, where a locked step would read "Pending".
  await expect(root.getByText('Pending')).toHaveCount(0)

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-25-download-antseed-step.png',
    fullPage: true,
  })
})

test('AiCreditsWidget Setup — Download AntSeed step is shown on Setup tab', async ({ page }) => {
  await gotoStory(page, DOWNLOAD_ANTSEED_STORY_ID)
  const root = page.getByTestId('AiCreditsWidget-download-antseed-step')
  await expect(root).toBeVisible()

  // Setup tab should be active
  await expect(root.getByText('Set Up', { exact: true })).toBeVisible()

  // Buy and other tabs present but separate from the Setup flow
  await expect(root.getByText('Buy Credits', { exact: true })).toBeVisible()
  await expect(root.getByText('Manage', { exact: true })).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-26-download-antseed-tabs.png',
    fullPage: true,
  })
})
