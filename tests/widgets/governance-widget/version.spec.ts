import { readFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { captureVersionScreenshot } from '../version-screenshot'

const { version } = JSON.parse(
  readFileSync('packages/governance-widget/package.json', 'utf-8'),
) as { version: string }

test('GovernanceWidget displays its package version', async ({ page }) => {
  for (const theme of ['dark', 'light'] as const) {
    for (const viewport of [
      { name: 'desktop', width: 1280, height: 900 },
      { name: 'mobile', width: 430, height: 932 },
    ]) {
      await captureVersionScreenshot(page, [`Governance v${version}`], {
        url: `/iframe.html?id=widgets-governancewidget-showcase--demo&viewMode=story&args=defaultTheme:${theme}`,
        path: `tests/widgets/governance-widget/test-results/version-dashboard-${viewport.name}-${theme}.png`,
        width: viewport.width,
        height: viewport.height,
      })
    }
  }

  for (const viewport of [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 430, height: 932 },
  ]) {
    await captureVersionScreenshot(page, [`Governance v${version}`], {
      url: '/iframe.html?id=qa-governancewidget-runtime-fixtures--onboarding-house-selection&viewMode=story',
      path: `tests/widgets/governance-widget/test-results/version-onboarding-${viewport.name}-light.png`,
      width: viewport.width,
      height: viewport.height,
    })
  }
})
