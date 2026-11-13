import { expect, test } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const harnessUrl = `/@fs${path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'header-harness.tsx')}`
const embedSource = `/@fs${fileURLToPath(new URL('../../embed/src/createMiniAppElement.tsx', import.meta.url))}`

test.beforeEach(async ({ page }) => {
  // Storybook's react-docgen plugin cannot parse the built embed bundle's private fields.
  await page.route('**/packages/embed/dist/index.js', (route) =>
    route.fulfill({ status: 302, headers: { location: embedSource } }),
  )
  await page.goto('/iframe.html?id=qa-aicreditswidget-runtime-fixtures--wallet-controls')
  await page.addStyleTag({ content: 'vite-error-overlay { display: none !important }' })
  await page.evaluate(async (url) => {
    await import(/* @vite-ignore */ url)
  }, harnessUrl)
})

test('header opt-out preserves defaults, wallet-control precedence and tabs', async ({ page }, testInfo) => {
  const fixture = page.locator('#fixture-root')
  const render = (hideHeader?: boolean, showWalletControls?: boolean) => page.evaluate(async (args) => {
    const harness = await import(/* @vite-ignore */ args.url)
    harness.render(args.hideHeader, args.showWalletControls)
  }, { url: harnessUrl, hideHeader, showWalletControls })

  await render()
  await expect(fixture.getByText('GoodDollar', { exact: true })).toBeVisible()
  await expect(fixture.getByText('Celo', { exact: true })).toBeVisible()
  await expect(fixture.getByLabel('Wallet options')).toHaveCount(0)

  await render(false, true)
  await expect(fixture.getByText('GoodDollar', { exact: true })).toBeVisible()
  await expect(fixture.getByLabel('Wallet options')).toBeVisible()
  await render(true, true)
  await expect(fixture.getByText('GoodDollar', { exact: true })).toHaveCount(0)
  await expect(fixture.getByText('Celo', { exact: true })).toHaveCount(0)
  await expect(fixture.getByLabel('Wallet options')).toHaveCount(0)
  await expect(fixture.getByText('One-time setup required before buying AI Credits.')).toBeVisible()
  await fixture.getByText('History', { exact: true }).click()
  await expect(fixture.getByText('AI Credit History', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('ai-credits-header-hidden-history.png') })
  await render(false, true)
  await expect(fixture.getByText('GoodDollar', { exact: true })).toBeVisible()
})

test('custom element forwards and updates hideHeader', async ({ page }) => {
  await page.evaluate(async (url) => {
    const harness = await import(/* @vite-ignore */ url)
    harness.mountElement()
  }, harnessUrl)
  const element = page.locator('test-ai-credits-header')
  await expect(element.getByText('GoodDollar', { exact: true })).toBeVisible()
  await element.evaluate((el: HTMLElement & { hideHeader: boolean }) => { el.hideHeader = true })
  await expect(element.getByText('GoodDollar', { exact: true })).toHaveCount(0)
  await expect(element.getByText('Set Up', { exact: true })).toBeVisible()
  await element.evaluate((el: HTMLElement & { hideHeader: boolean }) => { el.hideHeader = false })
  await expect(element.getByText('GoodDollar', { exact: true })).toBeVisible()
})
