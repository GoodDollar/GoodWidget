import { readFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { captureVersionScreenshot } from '../version-screenshot'

const { version } = JSON.parse(
  readFileSync('packages/citizen-claim-widget/package.json', 'utf-8'),
) as { version: string }

test('CitizenClaimWidget displays its package version', async ({ page }) => {
  for (const viewport of [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 430, height: 932 },
  ]) {
    await captureVersionScreenshot(page, [`Citizen Claim v${version}`], {
      url: '/iframe.html?id=qa-citizenclaimwidget-runtime-fixtures--custodial-local-fixture&viewMode=story',
      path: `tests/widgets/citizen-claim-widget/test-results/version-custodial-${viewport.name}-dark.png`,
      width: viewport.width,
      height: viewport.height,
    })
  }
})
