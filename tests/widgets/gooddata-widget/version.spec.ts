import { readFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { captureVersionScreenshot } from '../version-screenshot'

const { version } = JSON.parse(
  readFileSync('packages/gooddata-widget/package.json', 'utf-8'),
) as { version: string }

test('GoodDataWidget displays its package version', async ({ page }) => {
  for (const viewport of [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 430, height: 932 },
  ]) {
    await captureVersionScreenshot(page, [`GoodData v${version}`], {
      url: '/iframe.html?id=qa-aicreditsdashboard-runtime-fixtures--good-data-widget-version&viewMode=story',
      path: `tests/widgets/gooddata-widget/test-results/version-dashboard-${viewport.name}-dark.png`,
      width: viewport.width,
      height: viewport.height,
    })
  }
})
