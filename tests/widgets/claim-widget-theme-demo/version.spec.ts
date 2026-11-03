import { readFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { captureVersionScreenshot } from '../version-screenshot'

const { version } = JSON.parse(
  readFileSync('packages/claim-widget-theme-demo/package.json', 'utf-8'),
) as { version: string }

test('ClaimWidget displays its package version in supported themes', async ({ page }) => {
  for (const theme of [
    { name: 'dark', story: 'widgets-claimwidget-theme-demo-showcase--default' },
    { name: 'light', story: 'widgets-claimwidget-theme-demo-showcase--light-theme' },
  ]) {
    for (const viewport of [
      { name: 'desktop', width: 1280, height: 900 },
      { name: 'mobile', width: 430, height: 932 },
    ]) {
      await captureVersionScreenshot(page, [`Claim v${version}`], {
        url: `/iframe.html?id=${theme.story}&viewMode=story`,
        path: `tests/widgets/claim-widget-theme-demo/test-results/version-showcase-${viewport.name}-${theme.name}.png`,
        width: viewport.width,
        height: viewport.height,
      })
    }
  }
})
