import { expect, test, type Page } from '@playwright/test'

const STORY_IDS = {
  tabNavigation:
    '/iframe.html?id=qa-aicreditswidget-redesign-states--tab-navigation&viewMode=story',
  setupState: '/iframe.html?id=qa-aicreditswidget-redesign-states--setup-state&viewMode=story',
  signerKeyModal:
    '/iframe.html?id=qa-aicreditswidget-redesign-states--signer-key-modal-states&viewMode=story',
  authorizeWallet:
    '/iframe.html?id=qa-aicreditswidget-redesign-states--authorize-wallet-modal-state&viewMode=story',
  connectTab: '/iframe.html?id=qa-aicreditswidget-redesign-states--connect-tab-state&viewMode=story',
} as const

async function gotoStory(page: Page, storyUrl: string): Promise<void> {
  await page.goto(storyUrl)
  await page.waitForLoadState('domcontentloaded')
}

test('AiCredits redesign tab navigation shows locked Manage and Connect states', async ({ page }) => {
  await gotoStory(page, STORY_IDS.tabNavigation)
  await expect(page.getByTestId('AiCreditsWidget-redesign-tabs')).toBeVisible()
  await expect(page.getByText('Setup')).toBeVisible()
  await expect(page.getByText('Buy')).toBeVisible()
  await expect(page.getByText('Manage')).toBeVisible()
  await expect(page.getByText('Connect')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-redesign-01-tabs.png',
    fullPage: true,
  })
})

test('AiCredits redesign setup state renders disconnected prompt', async ({ page }) => {
  await gotoStory(page, STORY_IDS.setupState)
  await expect(page.getByTestId('AiCreditsWidget-redesign-setup')).toBeVisible()
  await expect(page.getByText('Connect your wallet to unlock Setup')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-redesign-02-setup.png',
    fullPage: true,
  })
})

test('AiCredits redesign signer key modal renders path selector', async ({ page }) => {
  await gotoStory(page, STORY_IDS.signerKeyModal)
  const root = page.getByTestId('AiCreditsWidget-redesign-signer-modal')
  await expect(root).toBeVisible()
  await expect(root.getByText('Generate new signer key')).toBeVisible()
  await expect(root.getByText('Import existing AntSeed signer key')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-redesign-03-signer-modal.png',
    fullPage: true,
  })
})

test('AiCredits redesign authorize wallet modal renders permissions framing', async ({ page }) => {
  await gotoStory(page, STORY_IDS.authorizeWallet)
  const root = page.getByTestId('AiCreditsWidget-redesign-authorize-modal')
  await expect(root).toBeVisible()
  await expect(root.getByText('Can', { exact: true })).toBeVisible()
  await expect(root.getByText('Cannot', { exact: true })).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-redesign-04-authorize-wallet.png',
    fullPage: true,
  })
})

test('AiCredits redesign connect tab references setup download', async ({ page }) => {
  await gotoStory(page, STORY_IDS.connectTab)
  await expect(page.getByTestId('AiCreditsWidget-redesign-connect-tab')).toBeVisible()
  await expect(page.getByText('Download AntSeed in Setup')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/ai-credits-widget/test-results/acw-redesign-05-connect-tab.png',
    fullPage: true,
  })
})
