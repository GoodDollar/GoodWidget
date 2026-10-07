import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

const { version } = JSON.parse(
  readFileSync('packages/citizen-claim-widget/package.json', 'utf-8'),
) as { version: string }

test('CitizenClaimWidget displays its package version', async ({ page }) => {
  await page.goto(
    '/iframe.html?id=qa-citizenclaimwidget-runtime-fixtures--custodial-local-fixture&viewMode=story',
  )
  await expect(page.getByTestId('widget-version')).toHaveText(`v${version}`, { timeout: 20_000 })
})
