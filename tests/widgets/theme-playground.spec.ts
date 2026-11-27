import { expect, test } from '@playwright/test'

const stories = [
  ['Bridge', 'widgets-bridgingwidget-theme-overrides--playground', 'Review'],
  ['Connect a Wallet', 'widgets-connectawalletwidget-theme-overrides--playground', 'Connect Wallet'],
] as const

for (const [widget, storyId, buttonName] of stories) {
  test(`${widget} button colors follow the active theme and its controls`, async ({ page }, testInfo) => {
    await page.goto(`/iframe.html?id=${storyId}&viewMode=story`)
    const button = page.getByRole('button', { name: buttonName, exact: true })
    await expect(button).toHaveCSS('background-color', 'rgb(91, 33, 182)')

    await page.evaluate((id) => {
      const channel = (window as Window & {
        __STORYBOOK_ADDONS_CHANNEL__?: { emit: (event: string, data: unknown) => void }
      }).__STORYBOOK_ADDONS_CHANNEL__
      channel?.emit('updateStoryArgs', {
        storyId: id,
        updatedArgs: { defaultTheme: 'light', lightButtonBackground: '#0369A1' },
      })
    }, storyId)

    await expect(button).toHaveCSS('background-color', 'rgb(3, 105, 161)')
    await page.screenshot({ path: testInfo.outputPath('light-button-override.png') })
  })
}
