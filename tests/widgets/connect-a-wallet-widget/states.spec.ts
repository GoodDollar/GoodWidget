import { test, expect, type Page } from '@playwright/test'

const STORY_PREFIX = '/iframe.html?id=qa-connectawalletwidget-runtime-fixtures--'

function storyUrl(storyId: string): string {
  return `${STORY_PREFIX}${storyId}&viewMode=story`
}

async function gotoStory(page: Page, storyId: string): Promise<void> {
  await page.goto(storyUrl(storyId))
  await page.waitForLoadState('domcontentloaded')
}

/** Poll until any of the given strings appears in the body text. */
async function waitForText(page: Page, patterns: string[], timeoutMs = 20_000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const text = await page.evaluate(() => document.body.innerText)
    for (const p of patterns) {
      if (text.includes(p)) return p
    }
    await page.waitForTimeout(250)
  }
  return ''
}

async function bodyText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText)
}

async function expectBodyToContain(page: Page, patterns: Array<string | RegExp>) {
  const text = await bodyText(page)
  for (const pattern of patterns) {
    if (typeof pattern === 'string') {
      expect(text).toContain(pattern)
    } else {
      expect(text).toMatch(pattern)
    }
  }
}

async function saveScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `tests/widgets/connect-a-wallet-widget/test-results/${name}.png`,
    fullPage: true,
  })
}

test('ConnectAWalletWidget shows the disconnected wallet gate', async ({ page }) => {
  await gotoStory(page, 'not-connected')

  const matched = await waitForText(page, ['Wallet not connected', 'Connect Wallet'])
  expect(matched, 'Widget must mount and render before screenshot').toBeTruthy()
  await expectBodyToContain(page, [
    'Wallet not connected',
    'Connect your wallet to link additional addresses to your GoodID.',
    'Connect Wallet',
  ])
  await saveScreenshot(page, 'caw-01-not-connected')
})

test('ConnectAWalletWidget shows the host wallet connecting state', async ({ page }) => {
  await gotoStory(page, 'connecting')

  const matched = await waitForText(page, ['Wallet not connected'])
  expect(matched, 'Widget must mount and render before screenshot').toBeTruthy()
  await expectBodyToContain(page, ['Wallet not connected'])
  // Connect Wallet button swaps its label for a Spinner while connecting — never both.
  await expect(page.getByText('Connect Wallet', { exact: true })).toHaveCount(0)
  await saveScreenshot(page, 'caw-02-connecting')
})

test('ConnectAWalletWidget shows the connected-no-input address form', async ({ page }) => {
  await gotoStory(page, 'connected-no-input')

  const matched = await waitForText(page, ['Connect or Disconnect Address', 'Check address'])
  expect(matched, 'Widget must mount and render before screenshot').toBeTruthy()
  await expectBodyToContain(page, [
    'Connect or Disconnect Address',
    'Enter the address you want to connect to or disconnect from your GoodID, then check its status on each supported chain.',
    'Check address',
  ])
  await saveScreenshot(page, 'caw-03-connected-no-input')
})

test('ConnectAWalletWidget shows the checking-address loading state', async ({ page }) => {
  await gotoStory(page, 'checking-address')

  const matched = await waitForText(page, ['Connect or Disconnect Address'])
  expect(matched, 'Widget must mount and render before screenshot').toBeTruthy()
  await expectBodyToContain(page, ['Connect or Disconnect Address'])
  // The Check address button label is replaced by a Spinner while checking.
  await expect(page.getByText('Check address', { exact: true })).toHaveCount(0)
  await saveScreenshot(page, 'caw-04-checking-address')
})

test('ConnectAWalletWidget always shows Connect or Disconnect per row, never hidden', async ({ page }) => {
  await gotoStory(page, 'ready-mixed-row-statuses')

  const matched = await waitForText(page, ['Fuse', 'Celo', 'XDC'])
  expect(matched, 'Widget must mount and render before screenshot').toBeTruthy()
  await expectBodyToContain(page, ['Fuse', 'Celo', 'XDC', 'Connected', 'Connecting', 'Disconnecting'])

  // Connected row is idle and shows its action label; connecting/disconnecting rows are busy
  // and swap their label for a Spinner (see ChainLinkRow), so only the idle row's action text is
  // exposed as an accessible name. `exact: true` is required here because Playwright's default
  // name matching is substring-based, and "Disconnect" would otherwise also match a name of
  // "Connect". Every row still always renders exactly one action button — busy rows render it
  // disabled — so 2 of the page's buttons must be disabled row actions.
  await expect(page.getByRole('button', { name: 'Disconnect', exact: true })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Connect', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { disabled: true })).toHaveCount(2)
  await saveScreenshot(page, 'caw-05-ready-mixed-row-statuses')
})

test('ConnectAWalletWidget shows the unsupported-network warning alongside chain rows', async ({ page }) => {
  await gotoStory(page, 'unsupported-network')

  const matched = await waitForText(page, ['Unsupported network', 'Connect or Disconnect Address'])
  expect(matched, 'Widget must mount and render before screenshot').toBeTruthy()
  await expectBodyToContain(page, [
    'Unsupported network',
    "Your wallet is on a network this widget doesn't support yet. Connecting or disconnecting a chain below will prompt a network switch automatically.",
    'Connect or Disconnect Address',
  ])
  await saveScreenshot(page, 'caw-06-unsupported-network')
})

test('ConnectAWalletWidget renders usable mobile and desktop layouts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await gotoStory(page, 'ready-mixed-row-statuses')
  const mobileMatched = await waitForText(page, ['Fuse', 'Celo', 'XDC'])
  expect(mobileMatched, 'Widget must mount on mobile before screenshot').toBeTruthy()
  await saveScreenshot(page, 'caw-08-mobile-ready')

  await page.setViewportSize({ width: 1280, height: 900 })
  await gotoStory(page, 'ready-mixed-row-statuses')
  const desktopMatched = await waitForText(page, ['Fuse', 'Celo', 'XDC'])
  expect(desktopMatched, 'Widget must mount on desktop before screenshot').toBeTruthy()
  await saveScreenshot(page, 'caw-09-desktop-ready')
})

test('ConnectAWalletWidget shows the top-level error state with retry', async ({ page }) => {
  await gotoStory(page, 'top-level-error-with-retry')

  const matched = await waitForText(page, ["Couldn't load link status", 'Retry'])
  expect(matched, 'Widget must mount and render before screenshot').toBeTruthy()
  await expectBodyToContain(page, [
    "Couldn't load link status",
    'Unable to reach the network. Check your connection and try again.',
    'Retry',
  ])
  await saveScreenshot(page, 'caw-07-top-level-error-with-retry')
})
