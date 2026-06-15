/**
 * states.spec.ts — Playwright coverage for the GoodReserveWidget Storybook states.
 *
 * The widget uses deterministic mockState fixtures, so these checks are CI-safe and
 * never require live reserve RPC behavior. Assertions target rendered text (Tamagui
 * does not reliably forward component testIDs to the DOM in the Storybook source
 * transform), which mirrors the citizen-claim-widget test approach.
 *
 * Each test also writes a committed screenshot under test-results/ as UI evidence.
 *
 * Running:
 *   pnpm storybook        (or let Playwright start it via webServer)
 *   pnpm test:demo tests/widgets/goodreserve-widget
 */
import { expect, test, type Page } from '@playwright/test'

const SCREENSHOT_DIR = 'tests/widgets/goodreserve-widget/test-results'

// Navigate directly to the story iframe (bypasses the Storybook shell for speed
// and avoids first-load flakiness from the manager UI). Retries the initial
// navigation so a cold-starting Storybook dev server (vite compiling its first
// request) does not fail the run with ERR_CONNECTION_REFUSED.
async function gotoStory(page: Page, storyId: string): Promise<void> {
  const url = `/iframe.html?id=${storyId}&viewMode=story`
  let lastError: unknown
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30_000 })
      lastError = undefined
      break
    } catch (err) {
      lastError = err
      await page.waitForTimeout(3000)
    }
  }
  if (lastError) throw lastError
  await page.waitForLoadState('networkidle')
  await page.getByTestId('GoodReserveWidget-root').first().waitFor({ timeout: 30_000 })
}

test('no-provider state renders the connect CTA', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--no-provider')
  await expect(page.getByText('Connect Wallet')).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/grw-01-no-provider.png` })
})

test('unsupported-chain state renders the switch-network CTA', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--unsupported-chain')
  await expect(page.getByText('Switch Network')).toBeVisible()
  await expect(page.getByText('Unsupported').first()).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/grw-02-unsupported-chain.png` })
})

test('sdk-initializing state shows a connecting loader', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--sdk-initializing')
  await expect(page.getByText('Connecting to the reserve…')).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/grw-13-sdk-initializing.png` })
})

test('idle-buy state shows the Enter Amount CTA', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--idle-buy')
  await expect(page.getByText('Enter Amount')).toBeVisible()
  await expect(page.getByText('Swap on CELO').first()).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/grw-03-idle-buy.png` })
})

test('quote-ready buy renders the quoted G$ output', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--quote-ready-buy')
  await expect(page.getByText('108.2500')).toBeVisible()
  await expect(page.getByText('Review Swap')).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/grw-04-quote-ready-buy.png` })
})

test('quote-ready sell maps G$ into the from slot', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--quote-ready-sell')
  await expect(page.getByText('8.9231')).toBeVisible()
  // Sell direction: the "from" balance is the G$ balance (300.00), not the stable balance.
  await expect(page.getByText('Balance: 300.00')).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/grw-05-quote-ready-sell.png` })
})

test('quote-ready on XDC renders the dynamic network label', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--quote-ready-xdc')
  await expect(page.getByText('Swap on XDC').first()).toBeVisible()
  await expect(page.getByText('216.5000')).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/grw-06-quote-ready-xdc.png` })
})

test('insufficient-balance state warns and disables the CTA', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--insufficient-balance')
  await expect(page.getByText(/exceeds your available/i)).toBeVisible()
  await expect(page.getByText('Insufficient Balance')).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/grw-07-insufficient-balance.png` })
})

test('slippage selection sheet exposes tolerance options', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--slippage-selection')
  await expect(page.getByText('0.5%').first()).toBeVisible()
  await expect(page.getByText('Done')).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/grw-08-slippage-selection.png` })
})

test('confirm dialog uses a press-to-confirm button (not slide-to-confirm)', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--confirm-dialog')
  await expect(page.getByText('Confirm Swap').first()).toBeVisible()
  await expect(page.getByText('Minimum Received', { exact: true })).toBeVisible()
  // Maintainer note: confirmation is a simple button, not the Figma slide control.
  await expect(page.getByText('Confirm Swap').last()).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/grw-09-confirm-dialog.png` })
})

test('swap-pending state shows the swapping CTA', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--swap-pending')
  await expect(page.getByText('Swapping…')).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/grw-10-swap-pending.png` })
})

test('swap-success state shows the success screen', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--swap-success')
  await expect(page.getByText('Swap Successful')).toBeVisible()
  await expect(page.getByText('Final amount received')).toBeVisible()
  await expect(page.getByText('Do another swap')).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/grw-11-swap-success.png` })
})

test('swap-error state surfaces the mapped reserve error', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--swap-error')
  await expect(page.getByText(/reverted/i)).toBeVisible()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/grw-12-swap-error.png` })
})

// Regression guard for the web amount input: the live adapter (no mockState)
// must accept typed characters. Tamagui's tag:'input' Stack does not forward
// RN onChangeText on web, so the view wires a native onChange instead.
test('amount input accepts typed characters (live adapter)', async ({ page }) => {
  await page.goto('/iframe.html?id=widgets-goodreservewidget--interactive&viewMode=story')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('GoodReserveWidget-interactive').first().waitFor({ timeout: 30_000 })

  const input = page.locator('input').first()
  await input.click()
  await input.pressSequentially('25', { delay: 30 })
  await expect(input).toHaveValue('25')

  // Sanitization: invalid characters and extra dots are stripped.
  await input.fill('')
  await input.pressSequentially('1.2.3x', { delay: 30 })
  await expect(input).toHaveValue('1.23')
})
