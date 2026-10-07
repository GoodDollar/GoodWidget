import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

const { version } = JSON.parse(
  readFileSync('packages/staking-migration-widget/package.json', 'utf-8'),
) as { version: string }

test('StakingMigrationWidget displays its package version', async ({ page }) => {
  await page.goto(
    '/iframe.html?id=qa-stakingmigrationwidget-runtime-fixtures--ready&viewMode=story',
  )
  await expect(page.getByTestId('widget-version')).toHaveText(`v${version}`, { timeout: 20_000 })
})
