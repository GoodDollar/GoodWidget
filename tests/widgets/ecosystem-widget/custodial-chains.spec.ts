import { expect, test } from '@playwright/test'
import path from 'node:path'

const harnessUrl = `/@fs${path.resolve('packages/ecosystem-widget/tests/claim-harness.tsx')}`
const mockUrl = `/@fs${path.resolve('packages/ecosystem-widget/tests/claim-child-mock.tsx')}`
const embedSource = `/@fs${path.resolve('packages/embed/src/createMiniAppElement.tsx')}`

test.beforeEach(async ({ page }) => {
  await page.route('**/packages/embed/dist/index.js', (route) =>
    route.fulfill({ status: 302, headers: { location: embedSource } }),
  )
  await page.goto('/iframe.html?id=design-system-primitives-card--default')
  await page.route('**/packages/citizen-claim-widget/dist/index.js', (route) =>
    route.fulfill({ status: 302, headers: { location: mockUrl } }),
  )
  await page.evaluate(async (url) => { await import(/* @vite-ignore */ url) }, harnessUrl)
})

test('custodial clients and factory follow supported chains, not the active wallet', async ({ page }) => {
  const render = (options: { chainId: number | null; supported?: number[]; available?: number[]; custodial?: boolean }) =>
    page.evaluate(async ({ url, options }) => {
      const harness = await import(/* @vite-ignore */ url)
      harness.render(options)
    }, { url: harnessUrl, options })
  const fixture = page.locator('#fixture-root')
  const clients = fixture.getByTestId('claim-clients')

  await render({ chainId: null, supported: [42220], available: [122] })
  await expect(clients).toHaveText('42220')
  await fixture.getByRole('button', { name: 'Factory Fuse' }).click()
  await expect(fixture.getByTestId('factory-result')).toHaveText('blocked 122')
  await fixture.getByRole('button', { name: 'Factory Celo' }).click()
  await expect(fixture.getByTestId('factory-result')).toHaveText('allowed 42220')
  expect(await page.evaluate(async (url) => (await import(/* @vite-ignore */ url)).getFactoryCalls(), harnessUrl)).toEqual([42220])

  await render({ chainId: 8453, supported: [122], available: [] })
  await expect(clients).toHaveText('122')
  await fixture.getByRole('button', { name: 'Factory Celo' }).click()
  await expect(fixture.getByTestId('factory-result')).toHaveText('blocked 42220')
  await fixture.getByRole('button', { name: 'Factory Fuse' }).click()
  await expect(fixture.getByTestId('factory-result')).toHaveText('allowed 122')
  expect(await page.evaluate(async (url) => (await import(/* @vite-ignore */ url)).getFactoryCalls(), harnessUrl)).toEqual([42220, 122])

  await render({ chainId: 8453, supported: [], available: [42220] })
  await expect(clients).toHaveText('')
  await fixture.getByRole('button', { name: 'Factory Celo' }).click()
  await expect(fixture.getByTestId('factory-result')).toHaveText('blocked 42220')
  await render({ chainId: 8453 })
  await expect(clients).toHaveText('122,42220,50')
})

test('non-custodial claim retains active chain and wallet availability gating', async ({ page }) => {
  const render = (chainId: number | null, available: number[]) =>
    page.evaluate(async ({ url, chainId, available }) => {
      (await import(/* @vite-ignore */ url)).render({ chainId, available, custodial: false })
    }, { url: harnessUrl, chainId, available })
  const fixture = page.locator('#fixture-root')
  await render(null, [42220])
  await expect(fixture.getByText('Waiting for the wallet network.')).toBeVisible()
  await render(122, [42220])
  await expect(fixture.getByText('Not available on this network')).toBeVisible()
  await render(42220, [42220])
  await expect(fixture.getByTestId('claim-available')).toHaveText('42220')
})
