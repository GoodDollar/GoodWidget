import { expect as baseExpect, test, type Page } from '@playwright/test'

const qa = '/iframe.html?id=qa-ecosystemwidget-runtime-fixtures--'
const showcase = '/iframe.html?id=widgets-ecosystemwidget-showcase--'
const evidence = 'tests/widgets/ecosystem-widget/test-results'
const expect = baseExpect.configure({ timeout: 20_000 })
test.setTimeout(90_000)

async function gotoFixture(page: Page, id: string) {
  // The wallet is mocked; prevent child widget RPC/backend requests from being
  // mistaken for live integration evidence or affecting deterministic tests.
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort()
  })
  await page.goto(`${qa}${id}&viewMode=story`)
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true })
}

for (const viewport of [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
]) {
  test(`connect once, switch all widgets and remount on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await gotoFixture(page, 'connect-and-switch')
    const connect = page.getByRole('button', { name: 'Connect Wallet', exact: true })
    await expect(connect).toBeVisible()
    await expect(page.getByText('Connect your wallet to continue.')).toBeVisible()
    await expect(page.getByText(/Citizen Claim v/)).toHaveCount(0)
    await screenshot(page, `connect-disconnected-${viewport.name}`)
    await connect.click()
    const claimVersion = page.getByTestId('widget-version').filter({ hasText: 'Citizen Claim v' })
    await expect(claimVersion).toBeVisible()
    const firstMount = await claimVersion.elementHandle()
    expect(firstMount).not.toBeNull()
    let previousMount = firstMount!
    await expect(page.getByRole('button', { name: 'Connect Wallet', exact: true })).toHaveCount(0)
    await screenshot(page, `connect-claim-${viewport.name}`)

    for (const [label, name] of [
      ['Reserve', 'GoodReserve'],
      ['Streaming', 'Streaming'],
      ['AI Credits', 'AI Credits'],
    ]) {
      await page.getByRole('navigation').getByRole('button', { name: label, exact: true }).click()
      const version = page.getByTestId('widget-version').filter({ hasText: `${name} v` })
      await expect(version).toBeVisible()
      expect(await previousMount.evaluate((element) => element.isConnected)).toBe(false)
      previousMount = (await version.elementHandle())!
      await expect(page.getByLabel('Fixture wallet connections')).toHaveText('1')
      await expect(page.getByRole('button', { name: 'Connect Wallet', exact: true })).toHaveCount(0)
      if (label === 'Reserve') await screenshot(page, `switch-reserve-${viewport.name}`)
    }

    expect(await firstMount!.evaluate((element) => element.isConnected)).toBe(false)
    await page.getByRole('navigation').getByRole('button', { name: 'Claim', exact: true }).click()
    await expect(claimVersion).toBeVisible()
    expect(await firstMount!.evaluate((element) => element.isConnected)).toBe(false)
    expect(await previousMount.evaluate((element) => element.isConnected)).toBe(false)
    await expect(page.getByLabel('Fixture wallet connections')).toHaveText('1')
    await expect(page.getByLabel('Blocked signing or transaction requests')).toHaveText('0')
    await screenshot(page, `switch-remounted-${viewport.name}`)
  })
}

test('native wallet renders without connection or disconnect controls', async ({ page }) => {
  await gotoFixture(page, 'native-wallet')
  await expect(page.getByTestId('widget-version').filter({ hasText: 'GoodReserve v' })).toBeVisible()
  await expect(page.getByRole('button', { name: /connect wallet|disconnect/i })).toHaveCount(0)
  await expect(page.getByLabel('Fixture wallet connections')).toHaveText('0')
  await expect(page.getByRole('navigation')).toHaveCount(0)
  await screenshot(page, 'native-connected-desktop')
})

test('non-native wallet explains unsupported disconnect', async ({ page }) => {
  await gotoFixture(page, 'disconnect-unavailable')
  await expect(page.getByTestId('widget-version').filter({ hasText: 'GoodReserve v' })).toBeVisible()
  await page.getByLabel('Wallet options').click()
  await expect(page.getByText('To disconnect, use your wallet.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Disconnect', exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Fixture wallet connections')).toHaveText('0')
})

test('network settings action delegates to the host without disconnecting', async ({ page }) => {
  await gotoFixture(page, 'network-settings-action')
  await expect(page.getByTestId('widget-version').filter({ hasText: 'GoodReserve v' })).toBeVisible()
  await page.getByLabel('Wallet options').click()
  await expect(page.getByRole('button', { name: 'Disconnect', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Network settings', exact: true }).click()
  await expect(page.getByLabel('Simulated network settings openings')).toHaveText('1')
  await expect(page.getByTestId('widget-version').filter({ hasText: 'GoodReserve v' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Connect Wallet', exact: true })).toHaveCount(0)
})

test('unsupported network prevents the selected widget from mounting', async ({ page }) => {
  await gotoFixture(page, 'unsupported-network')
  await expect(page.getByText('Not available on this network')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Switch network' })).toBeVisible()
  await expect(page.getByTestId('widget-version').filter({ hasText: 'GoodReserve v' })).toHaveCount(0)
  await expect(page.getByLabel('Blocked signing or transaction requests')).toHaveText('0')
  await screenshot(page, 'unsupported-network-desktop')
})

test('empty configuration explains that no widgets are enabled', async ({ page }) => {
  await gotoFixture(page, 'no-enabled-widgets')
  await expect(page.getByText('No widgets are enabled.')).toBeVisible()
  await expect(page.getByRole('navigation')).toHaveCount(0)
  await expect(page.getByLabel('Blocked signing or transaction requests')).toHaveText('0')
  await screenshot(page, 'no-enabled-widgets-desktop')
})

test('injected showcase explains how to add a missing browser wallet', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'ethereum', { configurable: true, value: undefined })
  })
  await page.goto(`${showcase}injected-wallet&viewMode=story`)
  await expect(page.getByRole('status')).toContainText('No injected wallet found')
  await expect(page.getByRole('status')).toContainText('Install or enable')
})

test('injected showcase connects through an EIP-1193 browser wallet', async ({ page }) => {
  await page.addInitScript(() => {
    let connected = false
    Object.defineProperty(window, 'ethereum', {
      configurable: true,
      value: {
        on() {},
        removeListener() {},
        async request({ method }: { method: string }) {
          if (method === 'eth_requestAccounts') connected = true
          if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
            return connected ? ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'] : []
          }
          if (method === 'eth_chainId') return '0xa4ec'
          throw new Error(`Test wallet rejected ${method}`)
        },
      },
    })
  })
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort()
  })
  await page.goto(`${showcase}injected-wallet&viewMode=story`)
  await page.getByRole('button', { name: 'Connect Wallet', exact: true }).click({ timeout: 20_000 })
  await expect(page.getByTestId('widget-version').filter({ hasText: 'Citizen Claim v' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Connect Wallet', exact: true })).toHaveCount(0)
})

test('WalletConnect showcase shows setup guidance or a real connect control', async ({ page }) => {
  await page.goto(`${showcase}wallet-connect&viewMode=story`)
  const guidance = page.getByRole('status')
  const connect = page.getByRole('button', { name: 'Connect Wallet', exact: true })
  await expect(guidance.or(connect)).toBeVisible()
  if (await guidance.isVisible()) {
    await expect(guidance).toContainText('VITE_REOWN_PROJECT_ID')
  } else {
    await expect(connect).toBeVisible()
    await connect.click()
    await expect.poll(() => page.locator('w3m-modal.open').count()).toBeGreaterThan(0)
  }
})
