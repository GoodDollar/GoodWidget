import { expect, type Page } from '@playwright/test'

interface VersionScreenshotCapture {
  url: string
  path: string
  width: number
  height: number
}

export async function captureVersionScreenshot(
  page: Page,
  labels: string[],
  capture: VersionScreenshotCapture,
): Promise<void> {
  await page.setViewportSize({ width: capture.width, height: capture.height })
  await page.goto(capture.url)

  const versionLabels = page.getByTestId('widget-version')
  await expect(versionLabels).toHaveCount(labels.length, { timeout: 20_000 })
  for (const label of labels) {
    await expect(versionLabels.filter({ hasText: label })).toHaveCount(1, { timeout: 20_000 })
  }

  await page.screenshot({ path: capture.path, fullPage: true })
}
