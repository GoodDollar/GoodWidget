import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

const { version } = JSON.parse(
  readFileSync('packages/governance-widget/package.json', 'utf-8'),
) as { version: string }

test('GovernanceWidget displays its package version', async ({ page }) => {
  await page.goto(
    '/iframe.html?id=qa-governancewidget-runtime-fixtures--disconnected-dashboard&viewMode=story',
  )
  await expect(page.getByTestId('widget-version')).toHaveText(`Governance v${version}`, {
    timeout: 20_000,
  })
})
