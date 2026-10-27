import { readFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { captureVersionScreenshot } from '../version-screenshot'

const { version } = JSON.parse(
  readFileSync('packages/goodreserve-widget/package.json', 'utf-8'),
) as { version: string }

test('GoodReserveWidget displays its package version', async ({ page }) => {
  for (const theme of [
    { name: 'dark', story: 'widgets-goodreservewidget--quote-ready-buy' },
    { name: 'light', story: 'widgets-goodreservewidget--quote-ready-buy-light-theme' },
  ]) {
    for (const viewport of [
      { name: 'desktop', width: 1280, height: 900 },
      { name: 'mobile', width: 430, height: 932 },
    ]) {
      await captureVersionScreenshot(page, [`GoodReserve v${version}`], {
        url: `/iframe.html?id=${theme.story}&viewMode=story`,
        path: `tests/widgets/goodreserve-widget/test-results/version-quote-ready-${viewport.name}-${theme.name}.png`,
        width: viewport.width,
        height: viewport.height,
      })
    }
  }
})
