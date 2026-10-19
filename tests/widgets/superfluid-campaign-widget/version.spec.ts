import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { captureVersionScreenshot } from '../version-screenshot'

const { version } = JSON.parse(
  readFileSync('packages/superfluid-campaign-widget/package.json', 'utf-8'),
) as { version: string }

const citizenClaimVersion = JSON.parse(
  readFileSync('packages/citizen-claim-widget/package.json', 'utf-8'),
) as { version: string }

test('SuperfluidCampaignWidget displays its package version in supported themes', async ({ page }) => {
  for (const theme of ['dark', 'light'] as const) {
    for (const viewport of [
      { name: 'desktop', width: 1280, height: 900 },
      { name: 'mobile', width: 430, height: 932 },
    ]) {
      await captureVersionScreenshot(page, [`Superfluid Campaign v${version}`], {
        url: `/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--no-wallet-content&viewMode=story&args=defaultTheme:${theme}`,
        path: `tests/widgets/superfluid-campaign-widget/test-results/version-content-${viewport.name}-${theme}.png`,
        width: viewport.width,
        height: viewport.height,
      })
    }
  }
})

test('embedded Citizen Claim and Superfluid Campaign show their own versions', async ({ page }) => {
  for (const theme of ['dark', 'light'] as const) {
    for (const viewport of [
      { name: 'desktop', width: 1280, height: 900 },
      { name: 'mobile', width: 430, height: 932 },
    ]) {
      const labels = [
        `Superfluid Campaign v${version}`,
        `Citizen Claim v${citizenClaimVersion.version}`,
      ]
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(
        `/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--no-wallet-content&viewMode=story&args=defaultTheme:${theme}`,
      )
      await page.getByTestId('ActionCard-layout-claim-ubi').getByText('Claim', { exact: true }).click()

      const versionLabels = page.getByTestId('widget-version')
      await expect(versionLabels).toHaveCount(labels.length, { timeout: 20_000 })
      for (const label of labels) {
        await expect(versionLabels.filter({ hasText: label })).toHaveCount(1, { timeout: 20_000 })
      }

      await page.screenshot({
        path: `tests/widgets/superfluid-campaign-widget/test-results/version-embedded-claim-${viewport.name}-${theme}.png`,
        fullPage: true,
      })
    }
  }
})
