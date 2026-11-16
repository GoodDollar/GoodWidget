import { readFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { captureVersionScreenshot } from '../version-screenshot'

const { version } = JSON.parse(readFileSync('packages/passkey-login-widget/package.json', 'utf-8')) as {
  version: string
}

// The entry screen is the first thing a user sees, so it carries the version label checked here.
test('PasskeyLoginWidget displays its package version', async ({ page }) => {
  for (const themeName of ['dark', 'light']) {
    for (const viewport of [
      { name: 'desktop', width: 1280, height: 900 },
      { name: 'mobile', width: 430, height: 932 },
    ]) {
      await captureVersionScreenshot(page, [`Passkey Login v${version}`], {
        url: `/iframe.html?id=qa-passkeyloginwidget-screen-fixtures--a-1-entry&viewMode=story&args=themeMode:${themeName}`,
        path: `tests/widgets/passkey-login-widget/test-results/version-a1-${viewport.name}-${themeName}.png`,
        width: viewport.width,
        height: viewport.height,
      })
    }
  }
})
