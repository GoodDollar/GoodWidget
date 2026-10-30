import { readFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { captureVersionScreenshot } from '../version-screenshot'

const { version } = JSON.parse(readFileSync('packages/streaming-widget/package.json', 'utf-8')) as {
  version: string
}

test('StreamingWidget displays its package version', async ({ page }) => {
  for (const theme of [
    { name: 'dark', story: 'qa-streamingwidget-runtime-fixtures--populated-state' },
    { name: 'light', story: 'qa-streamingwidget-runtime-fixtures--light-theme-populated' },
  ]) {
    for (const viewport of [
      { name: 'desktop', width: 1280, height: 900 },
      { name: 'mobile', width: 430, height: 932 },
    ]) {
      await captureVersionScreenshot(page, [`Streaming v${version}`], {
        url: `/iframe.html?id=${theme.story}&viewMode=story`,
        path: `tests/widgets/streaming-widget/test-results/version-populated-${viewport.name}-${theme.name}.png`,
        width: viewport.width,
        height: viewport.height,
      })
    }
  }
})
