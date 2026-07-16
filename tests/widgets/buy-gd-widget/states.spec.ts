import { expect, test, type Page } from '@playwright/test'

const SCREENSHOT_DIR = 'tests/widgets/buy-gd-widget/test-results'

const STORY_IDS = {
  noWallet: 'qa-buygdwidget-runtime-fixtures--no-wallet',
  idle: 'qa-buygdwidget-runtime-fixtures--idle',
  loading: 'qa-buygdwidget-runtime-fixtures--loading',
  onramper: 'qa-buygdwidget-runtime-fixtures--onramper',
  transactionPending: 'qa-buygdwidget-runtime-fixtures--transaction-pending',
  success: 'qa-buygdwidget-runtime-fixtures--success',
  error: 'qa-buygdwidget-runtime-fixtures--error',
} as const

async function gotoStory(page: Page, storyId: string): Promise<void> {
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`)
  await page.waitForLoadState('networkidle')
  await page.getByTestId('BuyGdWidget-root').first().waitFor({ timeout: 30_000 })
}

test('BuyGdWidget no_wallet state renders connect CTA', async ({ page }) => {
  await gotoStory(page, STORY_IDS.noWallet)
  await expect(page.getByText('Connect a wallet to continue.')).toBeVisible()
  await expect(page.getByTestId('BuyGdWidget-connect-cta')).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bgw-01-no-wallet.png`, fullPage: true })
})

test('BuyGdWidget idle state renders onramper entry CTA', async ({ page }) => {
  await gotoStory(page, STORY_IDS.idle)
  await expect(page.getByTestId('BuyGdWidget-open-onramper-cta')).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bgw-02-idle.png`, fullPage: true })
})

test('BuyGdWidget loading state renders progress copy', async ({ page }) => {
  await gotoStory(page, STORY_IDS.loading)
  await expect(page.getByText('Preparing transaction…')).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bgw-03-loading.png`, fullPage: true })
})

test('BuyGdWidget onramper state embeds iframe and conversion CTA', async ({ page }) => {
  await gotoStory(page, STORY_IDS.onramper)
  await expect(page.getByTestId('BuyGdWidget-onramper-iframe')).toBeVisible()
  await expect(page.getByTestId('BuyGdWidget-start-buy-cta')).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bgw-04-onramper.png`, fullPage: true })
})

test('BuyGdWidget transaction_pending state renders pending copy', async ({ page }) => {
  await gotoStory(page, STORY_IDS.transactionPending)
  await expect(page.getByText('Transaction pending…')).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bgw-05-transaction-pending.png`, fullPage: true })
})

test('BuyGdWidget success state renders confirmation', async ({ page }) => {
  await gotoStory(page, STORY_IDS.success)
  await expect(page.getByTestId('BuyGdWidget-success-state')).toBeVisible()
  await expect(page.getByText('Success! G$ was sent to your wallet.')).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bgw-06-success.png`, fullPage: true })
})

test('BuyGdWidget error state renders retry and refresh actions', async ({ page }) => {
  await gotoStory(page, STORY_IDS.error)
  await expect(page.getByTestId('BuyGdWidget-error-state')).toBeVisible()
  await expect(page.getByTestId('BuyGdWidget-retry-cta')).toBeVisible()
  await expect(page.getByTestId('BuyGdWidget-refresh-cta')).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bgw-07-error.png`, fullPage: true })
})
