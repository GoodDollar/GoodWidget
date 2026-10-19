import { readFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { captureVersionScreenshot } from '../version-screenshot'

const { version } = JSON.parse(
  readFileSync('packages/staking-migration-widget/package.json', 'utf-8'),
) as { version: string }

test('StakingMigrationWidget displays its package version', async ({ page }) => {
  for (const theme of [
    { name: 'dark', story: 'qa-stakingmigrationwidget-runtime-fixtures--ready' },
    { name: 'light', story: 'qa-stakingmigrationwidget-runtime-fixtures--light-theme-ready' },
  ]) {
    for (const viewport of [
      { name: 'desktop', width: 1280, height: 900 },
      { name: 'mobile', width: 430, height: 932 },
    ]) {
      await captureVersionScreenshot(page, [`Staking Migration v${version}`], {
        url: `/iframe.html?id=${theme.story}&viewMode=story`,
        path: `tests/widgets/staking-migration-widget/test-results/version-ready-${viewport.name}-${theme.name}.png`,
        width: viewport.width,
        height: viewport.height,
      })
    }
  }
})
