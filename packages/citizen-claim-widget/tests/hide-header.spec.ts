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
  await page.goto('/iframe.html?id=qa-citizenclaimwidget-runtime-fixtures--custodial-local-fixture')
  await page.addStyleTag({ content: 'vite-error-overlay { display: none !important }' })
  await page.evaluate(async (url) => {
    await import(/* @vite-ignore */ url)
  }, harnessUrl)
})

test('default, explicit false and hidden header preserve functional tabs', async ({ page }, testInfo) => {
  const fixture = page.locator('#fixture-root')
  const render = (value: boolean | undefined) => page.evaluate(async ({ url, value }) => {
    const harness = await import(/* @vite-ignore */ url)
    harness.render(value)
  }, { url: harnessUrl, value })

  for (const value of [undefined, false]) {
    await render(value)
    await expect(fixture.getByText('GoodDollar', { exact: true })).toBeVisible()
    await expect(fixture.getByText('Celo', { exact: true })).toBeVisible()
  }
  await render(true)
  await expect(fixture.getByText('GoodDollar', { exact: true })).toHaveCount(0)
  await expect(fixture.getByText('Celo', { exact: true })).toHaveCount(0)
  await expect(fixture.getByText('Widget coming soon')).toBeVisible()
  await fixture.getByText('Invite Rewards', { exact: true }).click()
  await expect(fixture.getByText('Widget coming soon')).toBeVisible()
  await fixture.getByText('Claim', { exact: true }).click()
  await expect(fixture.getByText('Widget coming soon')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('citizen-claim-header-hidden.png') })
  await render(false)
  await expect(fixture.getByText('GoodDollar', { exact: true })).toBeVisible()
})

test('custom element forwards and updates hideHeader', async ({ page }) => {
  await page.evaluate(async (url) => {
    const harness = await import(/* @vite-ignore */ url)
    harness.mountElement()
  }, harnessUrl)
  const element = page.locator('test-citizen-claim-header')
  await expect(element.getByText('GoodDollar', { exact: true })).toBeVisible()
  await element.evaluate((el: HTMLElement & { hideHeader: boolean }) => { el.hideHeader = true })
  await expect(element.getByText('GoodDollar', { exact: true })).toHaveCount(0)
  await expect(element.getByText('News', { exact: true })).toBeVisible()
  await element.evaluate((el: HTMLElement & { hideHeader: boolean }) => { el.hideHeader = false })
  await expect(element.getByText('GoodDollar', { exact: true })).toBeVisible()
})
