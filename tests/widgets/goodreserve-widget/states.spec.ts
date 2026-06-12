import { expect, test, type Page } from '@playwright/test'

async function gotoStory(page: Page, storyId: string): Promise<void> {
  await page.goto(`/?path=/story/${storyId}`)
  await page.waitForSelector('#storybook-preview-iframe', { timeout: 30_000 })
  await page.waitForLoadState('networkidle')
}

async function frame(page: Page) {
  return page.frameLocator('#storybook-preview-iframe')
}

// Covers deterministic reserve states so CI does not require live reserve RPC calls.
test('GoodReserveWidget no provider state renders connect CTA', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--no-provider')
  const storyFrame = await frame(page)
  await expect(storyFrame.getByTestId('GoodReserveWidget-no-provider')).toBeVisible()
  await expect(storyFrame.getByText('Connect Wallet')).toBeVisible()
})

test('GoodReserveWidget unsupported chain state renders switch CTA', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--unsupported-chain')
  const storyFrame = await frame(page)
  await expect(storyFrame.getByText('Switch Network')).toBeVisible()
})

test('GoodReserveWidget quote-ready buy/sell stories render quoted output', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--quote-ready-buy')
  let storyFrame = await frame(page)
  await expect(storyFrame.getByText('108.2500')).toBeVisible()

  await gotoStory(page, 'widgets-goodreservewidget--quote-ready-sell')
  storyFrame = await frame(page)
  await expect(storyFrame.getByText('8.9231')).toBeVisible()
})

test('GoodReserveWidget transaction states render pending/success/error', async ({ page }) => {
  await gotoStory(page, 'widgets-goodreservewidget--swap-pending')
  let storyFrame = await frame(page)
  await expect(storyFrame.getByText('Swapping...')).toBeVisible()

  await gotoStory(page, 'widgets-goodreservewidget--swap-success')
  storyFrame = await frame(page)
  await expect(storyFrame.getByTestId('GoodReserveWidget-success')).toContainText('Swap succeeded')

  await gotoStory(page, 'widgets-goodreservewidget--swap-error')
  storyFrame = await frame(page)
  await expect(storyFrame.getByTestId('GoodReserveWidget-error')).toContainText('Swap reverted')
})
