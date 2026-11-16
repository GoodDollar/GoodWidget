import { test, expect, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

async function setup(page: Page) {
  await page.goto('/iframe.html')
  await page.evaluate(async (path) => {
    await import(/* @vite-ignore */ path)
  }, `/@fs${fileURLToPath(new URL('./embedding.fixture.tsx', import.meta.url))}`)
}

async function render(page: Page, widget: 'streaming' | 'reserve', options: object = {}) {
  await page.evaluate(({ widget, options }) => {
    ;(window as any).widgetTest.render(widget, options)
  }, { widget, options })
}

test('streaming hides only header, keeps tabs and honors live wallet overrides', async ({ page }, testInfo) => {
  await setup(page)
  await render(page, 'streaming', { addressOverride: null, chainIdOverride: 1 })
  await expect(page.getByText('GoodDollar', { exact: true })).toBeVisible()
  await expect(page.getByText('Chain 1', { exact: true })).toBeVisible()
  await page.getByText('Connect Wallet', { exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as any).widgetTest.calls)).toContain('connectOverride')
  await render(page, 'streaming', {
    hideHeader: true,
    addressOverride: '0x1111111111111111111111111111111111111111',
    chainIdOverride: 1,
  })
  await expect(page.getByText('GoodDollar', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Chain 1', { exact: true })).toHaveCount(0)
  await expect(page.getByText('History', { exact: true })).toBeVisible()
  await expect(page.getByText('Unsupported network')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('streaming-embedded-unsupported.png') })
  await page.getByText('Switch to Celo', { exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as any).widgetTest.calls)).toContain('switchOverride:42220')
  await render(page, 'streaming', {
    addressOverride: '0x1111111111111111111111111111111111111111',
    chainIdOverride: 50,
  })
  await expect(page.getByText('Chain 50', { exact: true })).toBeVisible()
})

test('reserve hides header without hiding swap controls and uses chain fallback', async ({ page }, testInfo) => {
  await setup(page)
  await render(page, 'reserve', { addressOverride: null, chainIdOverride: 1 })
  await expect(page.getByText('Connect Wallet', { exact: true })).toBeVisible()
  await page.getByText('Connect Wallet', { exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as any).widgetTest.calls)).toContain('connectOverride')
  await render(page, 'reserve', {
    addressOverride: '0x1111111111111111111111111111111111111111',
    chainIdOverride: 1,
  })
  await expect(page.getByText('Swap on Unsupported')).toBeVisible()
  await expect(page.getByText('Switch Network', { exact: true })).toBeVisible()
  await render(page, 'reserve', {
    hideHeader: true,
    addressOverride: '0x1111111111111111111111111111111111111111',
    chainIdOverride: 1,
  })
  await expect(page.getByText('Swap on Unsupported')).toHaveCount(0)
  await expect(page.getByText('Swap from', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('reserve-embedded-unsupported.png') })
  await page.getByText('Switch Network', { exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as any).widgetTest.calls)).toContain('switchOverride:42220')
})

test('reserve tries the provider first and does not fall back on user rejection', async ({ page }) => {
  await setup(page)
  await render(page, 'reserve', { mockReserve: true })
  await page.evaluate(() => (window as any).widgetTest.setSwitchResult('success'))
  await page.getByText('Switch Network', { exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as any).widgetTest.calls)).toContain('wallet_switchEthereumChain')
  expect(await page.evaluate(() => (window as any).widgetTest.calls)).not.toContain('switchOverride:42220')
  await page.evaluate(() => (window as any).widgetTest.setSwitchResult('rejected'))
  await page.getByText('Switch Network', { exact: true }).click()
  await expect.poll(() => page.evaluate(() =>
    (window as any).widgetTest.calls.filter((call: string) => call === 'wallet_switchEthereumChain').length,
  )).toBe(2)
  await page.waitForTimeout(100)
  expect(await page.evaluate(() => (window as any).widgetTest.calls)).not.toContain('switchOverride:42220')
})
