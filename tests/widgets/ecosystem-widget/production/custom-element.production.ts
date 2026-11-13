import { expect, test } from '@playwright/test'

test('custom element updates properties after connection and switches widgets in shadow DOM', async ({ page }) => {
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === 'http://127.0.0.1:4178' ? route.continue() : route.abort(),
  )
  await page.goto('/element.html')
  const element = page.locator('gw-ecosystem-widget')
  expect(await element.evaluate((widget) => widget.shadowRoot !== null)).toBe(true)
  await expect(element.getByText('No widgets are enabled.')).toBeVisible()
  await page.evaluate(() => {
    const widget = document.querySelector('gw-ecosystem-widget') as HTMLElement & Record<string, unknown>
    widget.widgets = ['citizen-claim', 'goodreserve']
    widget.addressOverride = null
    widget.chainIdOverride = 42220
    widget.provider = (window as unknown as { productionProvider: unknown }).productionProvider
    widget.nativeMode = false
  })
  await expect(element.getByText('Connect your wallet to continue.')).toBeVisible()
  await expect(element.getByRole('button', { name: 'Connect Wallet' })).toBeVisible()

  await page.evaluate(() => {
    const widget = document.querySelector('gw-ecosystem-widget') as HTMLElement & Record<string, unknown>
    widget.nativeMode = true
  })
  await expect(element.getByText('Waiting for the host wallet.')).toBeVisible()
  await expect(element.getByRole('button', { name: 'Connect Wallet' })).toHaveCount(0)

  await page.evaluate(() => {
    const widget = document.querySelector('gw-ecosystem-widget') as HTMLElement & Record<string, unknown>
    widget.addressOverride = undefined
  })
  await expect(element.locator('[aria-label="Connected wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"]')).toBeVisible()

  const address = '0x1111111111111111111111111111111111111111'
  await page.evaluate((value) => {
    const widget = document.querySelector('gw-ecosystem-widget') as HTMLElement & Record<string, unknown>
    widget.addressOverride = value
  }, address)
  await expect(element.locator(`[aria-label="Connected wallet ${address}"]`)).toBeVisible()
  await expect(element.getByText(/^Citizen Claim v/)).toBeVisible()

  await page.evaluate(() => {
    const widget = document.querySelector('gw-ecosystem-widget') as HTMLElement & Record<string, unknown>
    widget.chainIdOverride = 8453
  })
  await expect(element.getByText('Claim is not supported on chain 8453.', { exact: false })).toBeVisible()
  await page.evaluate(() => {
    const widget = document.querySelector('gw-ecosystem-widget') as HTMLElement & Record<string, unknown>
    widget.chainIdOverride = 42220
  })
  await expect(element.getByText(/^Citizen Claim v/)).toBeVisible()

  const navigation = element.getByRole('navigation')
  await navigation.getByRole('button', { name: 'Reserve', exact: true }).click()
  await expect(navigation.getByRole('button', { name: 'Reserve', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(element.getByText(/^GoodReserve v/)).toBeVisible()
  await expect(element.getByText(/^Citizen Claim v/)).toHaveCount(0)

  await page.evaluate(() => {
    const widget = document.querySelector('gw-ecosystem-widget') as HTMLElement & Record<string, unknown>
    widget.widgets = ['streaming']
  })
  await expect(element.getByRole('navigation')).toHaveCount(0)
  await expect(element.getByText(/^Streaming v/)).toBeVisible()
  await expect(element.getByText(/^GoodReserve v/)).toHaveCount(0)
})
