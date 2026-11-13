import { expect, test } from '@playwright/test'

const evidence = process.env.ECOSYSTEM_EVIDENCE_DIR ?? 'tests/design-system/test-results'

for (const theme of ['light', 'dark'] as const) {
  for (const viewport of [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1280, height: 800 },
  ]) {
    test(`ecosystem shell preview: ${theme} ${viewport.name}`, async ({ page }) => {
      test.setTimeout(60_000)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`/iframe.html?id=design-system-primitives-ecosystem-shell-preview--building-blocks&viewMode=story&args=theme:${theme}`)

      const screenshot = (state: string) => page.screenshot({
        path: `${evidence}/ecosystem-shell-${theme}-${viewport.name}-${state}.png`,
        animations: 'disabled',
      })

      const shell = page.getByTestId('shell-preview')
      await expect(shell.getByText('Component preview only — no wallet or widget is connected.')).toBeVisible({ timeout: 25_000 })
      const brightness = await shell.evaluate((element) => {
        const channels = getComputedStyle(element).backgroundColor.match(/\d+/g)!.slice(0, 3).map(Number)
        return channels.reduce((sum, channel) => sum + channel, 0) / channels.length
      })
      if (theme === 'light') expect(brightness).toBeGreaterThan(128)
      else expect(brightness).toBeLessThan(128)
      await expect(shell.getByText('Connect the preview wallet to continue.')).toBeVisible()
      await screenshot('disconnected')
      await shell.getByRole('button', { name: 'Connect Wallet' }).click()
      await expect(shell.getByText('Claim widget placeholder')).toBeVisible()
      const navigation = shell.getByRole('navigation')
      await expect(navigation.getByRole('button', { name: 'Claim', exact: true })).toHaveAttribute('aria-pressed', 'true')
      const icon = (label: string) => navigation.getByRole('button', { name: label, exact: true }).locator('svg').first()
      await expect(icon('Claim').locator('path[d^="M11 15h2"]')).toHaveCount(1)
      await expect(icon('Reserve').locator('circle[cx="8"][cy="8"]')).toHaveCount(1)
      await expect(icon('Streaming').locator('path[d^="M2 6c"]')).toHaveCount(1)
      await expect(icon('More').locator('circle[cy="12"]')).toHaveCount(3)
      const geometry = (svg: ReturnType<typeof icon>) => svg.evaluate((element) =>
        Array.from(element.children, (child) =>
          ['d', 'cx', 'cy', 'r'].map((attribute) => child.getAttribute(attribute)),
        ),
      )
      const barIcons = await Promise.all(['Claim', 'Reserve', 'Streaming'].map((label) => geometry(icon(label))))
      await screenshot('connected')

      await navigation.getByRole('button', { name: 'Reserve', exact: true }).click()
      await expect(navigation.getByRole('button', { name: 'Reserve', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect(navigation.getByRole('button', { name: 'Claim', exact: true })).toHaveAttribute('aria-pressed', 'false')
      await expect(shell.getByText('Not available on this network')).toBeVisible()
      await screenshot('unsupported-network')
      await shell.getByRole('button', { name: 'Switch network' }).click()
      await expect(shell.getByText('Reserve widget placeholder')).toBeVisible()

      await navigation.getByRole('button', { name: 'More', exact: true }).click()
      await expect(page.getByText('All widgets')).toBeInViewport()
      await expect(page.getByRole('button', { name: 'AI Credits' })).toBeInViewport()
      await expect(page.getByRole('button', { name: 'Reserve', exact: true }).last()).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByRole('button', { name: 'Claim', exact: true }).last()).toHaveAttribute('aria-pressed', 'false')
      for (const [index, label] of ['Claim', 'Reserve', 'Streaming'].entries()) {
        const rowIcon = page.getByRole('button', { name: label, exact: true }).last().locator('svg').first()
        expect(await geometry(rowIcon)).toEqual(barIcons[index])
      }
      await expect(page.getByRole('button', { name: 'AI Credits' }).locator('svg').first().locator('path[d="M20 3v4"]')).toHaveCount(1)
      // Tamagui's spring continues after the sheet first enters the viewport.
      await page.waitForTimeout(700)
      await screenshot('drawer-open')
      await page.getByRole('button', { name: 'AI Credits' }).click()
      await expect(page.getByText('AI Credits widget placeholder')).toBeVisible()
      await expect(page.getByText('All widgets')).not.toBeInViewport()
      await page.waitForTimeout(700)
      await screenshot('drawer-selection')
      await navigation.getByRole('button', { name: 'More', exact: true }).click()
      await expect(page.getByRole('button', { name: 'AI Credits' })).toHaveAttribute('aria-pressed', 'true')
      await page.getByRole('button', { name: 'Close' }).click()
      await expect(page.getByText('All widgets')).not.toBeInViewport()
      await shell.getByRole('button', { name: 'Disconnect preview wallet' }).click()
      await expect(shell.getByRole('button', { name: 'Connect Wallet' })).toBeVisible()
    })
  }
}

for (const theme of ['light', 'dark'] as const) {
  test(`ecosystem building block states: ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/iframe.html?id=design-system-primitives-ecosystem-shell-preview--building-blocks&viewMode=story&args=theme:${theme}`)

    const headers = page.getByTestId('header-states')
    const connecting = headers.getByRole('button', { name: 'Connect Wallet' })
    await expect(connecting).toBeDisabled()
    await expect(connecting).toHaveAttribute('aria-busy', 'true')
    await expect(headers.getByText('Celo')).toBeVisible()
    await expect(headers.getByRole('button', { name: 'Wallet options' })).toHaveCount(0)

    const navigation = page.getByTestId('navigation-states')
    await expect(navigation.getByRole('button', { name: 'Loading' })).toHaveAttribute('aria-busy', 'true')
    await expect(navigation.getByRole('button', { name: 'More' })).toBeDisabled()
    await expect(navigation.getByText('Pressed 0')).toBeVisible()
    await navigation.getByRole('button', { name: 'More' }).evaluate((button: HTMLButtonElement) => button.click())
    await expect(navigation.getByText('Pressed 0')).toBeVisible()
    await navigation.getByRole('button', { name: 'Claim' }).click()
    await navigation.getByRole('button', { name: 'Claim' }).press('Enter')
    await expect(navigation.getByText('Pressed 2')).toBeVisible()
    if (theme === 'light') {
      await navigation.screenshot({
        path: `${evidence}/ecosystem-bottom-bar-loading-disabled.png`,
        animations: 'disabled',
      })
    }

    await expect(page.getByTestId('row-states').getByRole('button', { name: 'Disabled' })).toBeDisabled()
    const unavailable = page.getByTestId('unavailable-state')
    await expect(unavailable.getByText(/Citizen Claim is not supported on Ethereum/)).toBeVisible()
    await unavailable.getByRole('button', { name: 'Switch network' }).click()
    await expect(unavailable.getByText('Switch requested')).toBeVisible()
    await expect(unavailable.getByRole('button', { name: 'Switch network' })).toBeDisabled()
  })
}
