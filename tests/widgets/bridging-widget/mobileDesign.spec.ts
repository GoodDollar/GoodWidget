import { expect, test } from '@playwright/test'

const scenarios = [
  ['no-wallet', 'BridgingWidget-connect-cta'],
  ['connected-empty', 'BridgingWidget-review-cta'],
  ['ready-to-bridge', 'BridgingWidget-review-cta'],
  ['review-open', 'BridgingWidget-review-screen'],
  ['submission-completed', 'BridgingWidget-delivery-status'],
  ['delivery-complete', 'BridgingWidget-delivery-status'],
  ['history-populated', 'BridgingWidget-history-row'],
  ['history-detail-modal-open', 'BridgingWidget-history-detail'],
] as const

const evidenceDir = process.env.GOODWIDGET_QA_SCREENSHOT_DIR ?? 'tests/widgets/bridging-widget/test-results'

for (const width of [360, 390]) {
  for (const theme of ['light', 'dark']) {
    test(`bridge design evidence at ${width}px in ${theme}`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width, height: 844 })
      for (const [story, landmark] of scenarios) {
        await page.goto(`/iframe.html?id=qa-bridgingwidget-runtime-fixtures--${story}&viewMode=story&args=defaultTheme:${theme}`)
        await expect(page.getByTestId(landmark).first()).toBeInViewport({ timeout: 45_000 })
        if (story === 'connected-empty') {
          await expect(page.getByPlaceholder('0.00')).toHaveValue('')
          await expect(page.getByTestId(landmark)).toBeDisabled()
          await expect(page.getByTestId('BridgingWidget-review-disabled-reason')).toHaveText('Enter an amount to continue.')
          await expect(page.getByTestId('BridgingWidget-amount-received')).toHaveText('\u2014')
        }
        if (story === 'ready-to-bridge') {
          await expect(page.getByTestId(landmark)).toBeInViewport({ ratio: 1 })
          await expect(page.getByTestId(landmark)).toBeEnabled()
          expect(await page.evaluate(() => window.scrollY)).toBe(0)
          const [from, to] = await Promise.all([
            page.getByTestId('BridgingWidget-source-select').boundingBox(),
            page.getByTestId('BridgingWidget-target-select').boundingBox(),
          ])
          expect(from).not.toBeNull()
          expect(to).not.toBeNull()
          expect(from!.x + from!.width).toBeLessThan(to!.x)
          expect(Math.abs(from!.y - to!.y)).toBeLessThan(2)
          const title = page.getByText('GoodDollar Bridge', { exact: true })
          expect(await title.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
          const axelar = page.getByRole('button', { name: /Axelar/ })
          await expect(axelar).toBeDisabled()
          const [foreground, background] = await axelar.getByText('Axelar', { exact: true }).evaluate((label) => [
            getComputedStyle(label).color,
            getComputedStyle(label.closest('button')!).backgroundColor,
          ])
          expect(foreground).not.toBe(background)
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
        if (story === 'review-open') {
          await expect(page.getByTestId('BridgingWidget-review-confirm')).toBeInViewport({ ratio: 1 })
          const cancel = page.getByRole('button', { name: 'Cancel' })
          await expect(cancel).toBeInViewport({ ratio: 1 })
          if (theme === 'light') {
            await expect(cancel.getByText('Cancel')).not.toHaveCSS('color', 'rgb(255, 255, 255)')
          }
        }
        await page.screenshot({ path: `${evidenceDir}/${width}-${theme}/${story}.png`, animations: 'disabled' })
      }
    })
  }
}

test('mobile network selector opens a sheet and the longest chain fits the header', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 844 })
  await page.goto('/iframe.html?id=qa-bridgingwidget-runtime-fixtures--interactive-submit&viewMode=story')
  const source = page.getByTestId('BridgingWidget-source-select')
  await source.click()
  const ethereum = page.getByRole('option', { name: 'Ethereum' })
  await expect(ethereum).toBeInViewport({ ratio: 1 })
  expect((await ethereum.boundingBox())?.y).toBeGreaterThan(422)
  await ethereum.click()
  await expect(source).toContainText('Ethereum')
  const title = page.getByText('GoodDollar Bridge', { exact: true })
  expect(await title.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
})
