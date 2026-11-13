import { expect, test } from '@playwright/test'

const evidence = 'tests/design-system/test-results'

for (const theme of ['light', 'dark'] as const) {
  for (const viewport of [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1280, height: 800 },
  ]) {
    test(`ecosystem shell preview: ${theme} ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`/iframe.html?id=design-system-primitives-ecosystem-shell-preview--${theme}&viewMode=story`)

      const screenshot = (state: string) => page.screenshot({
        path: `${evidence}/ecosystem-shell-${theme}-${viewport.name}-${state}.png`,
        animations: 'disabled',
      })

      await expect(page.getByText('Component preview only — no wallet or widget is connected.')).toBeVisible()
      await expect(page.getByText('Connect the preview wallet to continue.')).toBeVisible()
      await screenshot('disconnected')
      await page.getByRole('button', { name: 'Connect Wallet' }).click()
      await expect(page.getByText('Claim widget placeholder')).toBeVisible()
      const navigation = page.getByRole('navigation')
      await expect(navigation.getByRole('button', { name: 'Claim', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await screenshot('connected')

      await navigation.getByRole('button', { name: 'Reserve', exact: true }).click()
      await expect(navigation.getByRole('button', { name: 'Reserve', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByText('Not available on this network')).toBeVisible()
      await screenshot('unsupported-network')
      await page.getByRole('button', { name: 'Switch network' }).click()
      await expect(page.getByText('Reserve widget placeholder')).toBeVisible()

      await navigation.getByRole('button', { name: 'More', exact: true }).click()
      await expect(page.getByText('All widgets')).toBeInViewport()
      await expect(page.getByRole('button', { name: 'AI Credits' })).toBeInViewport()
      await screenshot('drawer-open')
      await page.getByRole('button', { name: 'AI Credits' }).click()
      await expect(page.getByText('AI Credits widget placeholder')).toBeVisible()
      await expect(page.getByText('All widgets')).not.toBeInViewport()
      await screenshot('drawer-selection')
      await page.getByRole('button', { name: 'Disconnect preview wallet' }).click()
      await expect(page.getByRole('button', { name: 'Connect Wallet' })).toBeVisible()
    })
  }
}

test('bottom bar item displays loading and disabled states', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/iframe.html?id=design-system-primitives-bottombaritem--light&viewMode=story')
  await expect(page.getByRole('button', { name: 'Loading' })).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByRole('button', { name: 'More' })).toBeDisabled()
  await page.screenshot({
    path: `${evidence}/ecosystem-bottom-bar-loading-disabled.png`,
    animations: 'disabled',
  })
})
