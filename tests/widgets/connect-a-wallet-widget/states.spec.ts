import { test, expect, type Page } from '@playwright/test'

const STORY_PREFIX = '/iframe.html?id=qa-connectawalletwidget-runtime-fixtures--'

function storyUrl(storyId: string): string {
  return `${STORY_PREFIX}${storyId}&viewMode=story`
}

async function gotoStory(page: Page, storyId: string): Promise<void> {
  await page.goto(storyUrl(storyId))
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.body.innerText.trim().length > 0)
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

  await expectBodyToContain(page, [
    'Wallet not connected',
    'Connect your wallet to link additional addresses to your GoodID.',
    'Connect Wallet',
  ])
  await saveScreenshot(page, 'caw-01-not-connected')
})

test('ConnectAWalletWidget shows the host wallet connecting state', async ({ page }) => {
  await gotoStory(page, 'connecting')

  await expectBodyToContain(page, ['Wallet not connected'])
  // Connect Wallet button swaps its label for a Spinner while connecting — never both.
  await expect(page.getByText('Connect Wallet', { exact: true })).toHaveCount(0)
  await saveScreenshot(page, 'caw-02-connecting')
})

test('ConnectAWalletWidget shows the connected-no-input address form', async ({ page }) => {
  await gotoStory(page, 'connected-no-input')

  await expectBodyToContain(page, [
    'Wallet address to link',
    'Enter the address you want to connect to or disconnect from your GoodID, then check its status on each supported chain.',
    'Check address',
  ])
  await saveScreenshot(page, 'caw-03-connected-no-input')
})

test('ConnectAWalletWidget shows the checking-address loading state', async ({ page }) => {
  await gotoStory(page, 'checking-address')

  await expectBodyToContain(page, ['Wallet address to link'])
  // The Check address button label is replaced by a Spinner while checking.
  await expect(page.getByText('Check address', { exact: true })).toHaveCount(0)
  await saveScreenshot(page, 'caw-04-checking-address')
})

test('ConnectAWalletWidget always shows Connect or Disconnect per row, never hidden', async ({ page }) => {
  await gotoStory(page, 'ready-mixed-row-statuses')

  await expectBodyToContain(page, ['Fuse', 'Celo', 'XDC', 'connected', 'connecting', 'disconnecting'])

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

  await expectBodyToContain(page, [
    'Unsupported network',
    "Your wallet is on a network this widget doesn't support yet. Connecting or disconnecting a chain below will prompt a network switch automatically.",
    'Wallet address to link',
  ])
  await saveScreenshot(page, 'caw-06-unsupported-network')
})

test('ConnectAWalletWidget shows the top-level error state with retry', async ({ page }) => {
  await gotoStory(page, 'top-level-error-with-retry')

  await expectBodyToContain(page, [
    "Couldn't load link status",
    'Unable to reach the network. Check your connection and try again.',
    'Retry',
  ])
  await saveScreenshot(page, 'caw-07-top-level-error-with-retry')
})
