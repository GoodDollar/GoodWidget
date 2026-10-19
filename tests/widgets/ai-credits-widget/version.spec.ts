import { readFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { captureVersionScreenshot } from '../version-screenshot'

const { version } = JSON.parse(
  readFileSync('packages/ai-credits-widget/package.json', 'utf-8'),
) as { version: string }

test('AiCreditsWidget displays its package version', async ({ page }) => {
  for (const viewport of [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 430, height: 932 },
  ]) {
    await captureVersionScreenshot(page, [`AI Credits v${version}`], {
      url: '/iframe.html?id=qa-aicreditswidget-runtime-fixtures--disconnected&viewMode=story',
      path: `tests/widgets/ai-credits-widget/test-results/version-disconnected-${viewport.name}-dark.png`,
      width: viewport.width,
      height: viewport.height,
    })
  }
})
