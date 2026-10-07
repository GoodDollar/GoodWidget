import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

const { version } = JSON.parse(
  readFileSync('packages/goodreserve-widget/package.json', 'utf-8'),
) as { version: string }

test('GoodReserveWidget displays its package version', async ({ page }) => {
  await page.goto('/iframe.html?id=widgets-goodreservewidget--interactive&viewMode=story')
  await expect(page.getByTestId('widget-version')).toHaveText(`v${version}`, { timeout: 20_000 })
})
