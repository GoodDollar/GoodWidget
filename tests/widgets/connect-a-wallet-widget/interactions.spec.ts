import { test, expect } from '@playwright/test'
import { connectAndCheck, HASH, openWalletFlow, screenshot, SECONDARY } from './walletFixture'

test('missing provider is safe and explains why connection is unavailable', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/iframe.html?id=qa-connectawalletwidget-interactions--no-provider&viewMode=story')
  await page.getByRole('button', { name: 'Connect Wallet', exact: true }).click()
  await expect(page.getByText('No wallet provider available. Connect a wallet in the host app.')).toBeVisible()
  expect(errors).toEqual([])
})

test('host wallet selector opens without a provider and supports cancellation and deferred connection', async ({ page }) => {
  await openWalletFlow(page, '/iframe.html?id=qa-connectawalletwidget-interactions--host-connect&viewMode=story', false)
  const connect = page.getByRole('button', { name: 'Connect Wallet', exact: true })
  await connect.click()
  await expect(page.getByRole('dialog', { name: 'Host wallet selector' })).toBeVisible()
  await expect(page.getByText('No wallet provider available. Connect a wallet in the host app.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Cancel wallet selection' }).click()
  await expect(connect).toBeEnabled()
  await connect.click()
  await page.evaluate(() => Object.defineProperty(window, 'ethereum', { configurable: true, value: window.cawProvider }))
  await page.getByRole('button', { name: 'Select wallet', exact: true }).click()
  await page.getByRole('textbox', { name: 'Wallet address' }).fill(SECONDARY)
  await page.getByRole('button', { name: 'Check address', exact: true }).click()
  await expect(page.getByTestId('chain-row-122').getByRole('button', { name: 'Connect', exact: true })).toBeEnabled()
})

test('host connection rejection without a provider reports the rejection and releases controls', async ({ page }) => {
  await page.goto('/iframe.html?id=qa-connectawalletwidget-interactions--host-connect-rejected&viewMode=story')
  const connect = page.getByRole('button', { name: 'Connect Wallet', exact: true })
  await connect.click()
  await expect(page.getByText('Rejected by wallet.', { exact: true })).toBeVisible()
  await expect(connect).toBeEnabled()
  await expect(page.getByText('No wallet provider available. Connect a wallet in the host app.')).toHaveCount(0)
})

test('wallet cancellation can be retried; invalid-address feedback clears on edit', async ({ page }) => {
  const rpc = await openWalletFlow(page)
  await page.evaluate(() => { window.cawWallet.rejectConnect = true })
  await page.getByRole('button', { name: 'Connect Wallet', exact: true }).click()
  await expect(page.getByText('Rejected by wallet.', { exact: true })).toBeVisible()
  await page.evaluate(() => { window.cawWallet.rejectConnect = false })
  await page.getByRole('button', { name: 'Connect Wallet', exact: true }).click()
  const input = page.getByRole('textbox', { name: 'Wallet address' })
  await input.fill('invalid-address')
  await page.getByRole('button', { name: 'Check address', exact: true }).click()
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Enter a valid wallet address.')).toBeVisible()
  expect(rpc.reads).toEqual([])
  await screenshot(page, 'caw-10-invalid-address')
  await input.fill(SECONDARY)
  await expect(page.getByText('Enter a valid wallet address.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Check address', exact: true }).click()
  await expect(page.getByTestId('chain-row-122')).toBeVisible()
})

test('status reads reach each chain over HTTP without using wallet RPC', async ({ page }) => {
  const rpc = await openWalletFlow(page)
  await connectAndCheck(page)
  expect(new Set(rpc.reads)).toEqual(new Set([122, 42220, 50]))
  await expect(page.getByTestId('chain-row-122').getByText('Not Connected', { exact: true })).toBeVisible()
  await expect(page.getByTestId('chain-row-42220').getByText('Connected', { exact: true })).toBeVisible()
  await expect(page.getByTestId('chain-row-50').getByText('Not Connected', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.cawWallet.calls.filter((call) => call.method === 'eth_call'))).toEqual([])
})

test('one failed chain read shows retry instead of a false disconnected status', async ({ page }) => {
  const rpc = await openWalletFlow(page)
  rpc.failChain = 50
  await page.getByRole('button', { name: 'Connect Wallet', exact: true }).click()
  await page.getByRole('textbox', { name: 'Wallet address' }).fill(SECONDARY)
  await page.getByRole('button', { name: 'Check address', exact: true }).click()
  await expect(page.getByText('Unable to check status on XDC. Please retry.')).toBeVisible()
  await expect(page.getByTestId('chain-row-50')).toHaveCount(0)
  rpc.failChain = 0
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByTestId('chain-row-50').getByRole('button', { name: 'Connect', exact: true })).toBeEnabled()
})

for (const flow of [
  { chain: 122, name: 'Fuse', action: 'Connect', next: 'Disconnect', event: 'caw-link-success', success: 'Linked on Fuse' },
  { chain: 42220, name: 'Celo', action: 'Disconnect', next: 'Connect', event: 'caw-unlink-success', success: 'Unlinked on Celo' },
]) {
  test(`${flow.action}: late rejection from an unmounted widget leaves the replacement dialog usable`, async ({ page }) => {
    await openWalletFlow(page, '/iframe.html?id=qa-connectawalletwidget-interactions--replacement&viewMode=story')
    await connectAndCheck(page)
    await page.evaluate(() => { window.cawWallet.holdTransaction = true })
    const action = page.getByTestId(`chain-row-${flow.chain}`).getByRole('button', { name: flow.action, exact: true })
    await action.click()
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect.poll(() => page.evaluate(() => window.cawWallet.calls.filter((call) => call.method === 'eth_sendTransaction').length)).toBe(1)
    await page.getByRole('button', { name: 'Replace widget', exact: true }).click()
    await page.getByRole('textbox', { name: 'Wallet address' }).fill(SECONDARY)
    await page.getByRole('button', { name: 'Check address', exact: true }).click()
    await action.click()
    await expect(page.getByRole('heading', { name: 'Security Confirmation' })).toBeVisible()
    await page.evaluate(() => window.cawWallet.rejectPendingTransaction())
    await expect(page.getByText(/Rejected by wallet\./)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Security Confirmation' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(action).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Change address', exact: true })).toBeEnabled()
    await page.evaluate(() => { window.cawWallet.holdTransaction = false })
    await action.click()
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(page.getByText(flow.success, { exact: true })).toBeVisible()
  })

  test(`${flow.action}: confirmation, successful receipt, status and callback`, async ({ page }) => {
    await openWalletFlow(page)
    await connectAndCheck(page)
    const row = page.getByTestId(`chain-row-${flow.chain}`)
    await row.getByRole('button', { name: flow.action, exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Security Confirmation' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Change address', exact: true, includeHidden: true })).toBeDisabled()
    await expect(page.getByTestId('chain-row-50').getByRole('button', { includeHidden: true })).toBeDisabled()
    await screenshot(page, `caw-${flow.chain}-confirmation`)
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(row.getByRole('button', { name: flow.next, exact: true })).toBeEnabled()
    await expect(page.getByText(flow.success, { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Change address', exact: true })).toBeEnabled()
    const events = await page.evaluate(() => window.cawWallet.events)
    expect(events).toEqual([{ type: flow.event, detail: { address: SECONDARY, chainId: flow.chain, transactionHash: HASH } }])
    expect(await page.evaluate(() => window.cawWallet.chainId)).toBe(flow.chain)
    await expect(page.getByRole('heading', { name: 'Security Confirmation' })).toHaveCount(0)
    await screenshot(page, `caw-${flow.chain}-success`)
  })

  test(`${flow.action}: cancelling the security dialog restores controls without signing`, async ({ page }) => {
    await openWalletFlow(page)
    await connectAndCheck(page)
    const action = page.getByTestId(`chain-row-${flow.chain}`).getByRole('button', { name: flow.action, exact: true })
    await action.click()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(action).toBeEnabled()
    await expect(page.getByText(/Cancelled by user\./)).toBeVisible()
    expect(await page.evaluate(() => window.cawWallet.calls.filter((call) => call.method === 'eth_sendTransaction'))).toEqual([])
    await expect(page.getByRole('button', { name: 'Change address', exact: true })).toBeEnabled()
    await action.click()
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(page.getByText(flow.success, { exact: true })).toBeVisible()
  })

  test(`${flow.action}: wallet rejection restores prior status and emits an error`, async ({ page }) => {
    await openWalletFlow(page)
    await connectAndCheck(page)
    await page.evaluate(() => { window.cawWallet.rejectTransaction = true })
    const action = page.getByTestId(`chain-row-${flow.chain}`).getByRole('button', { name: flow.action, exact: true })
    await action.click()
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(action).toBeEnabled()
    await expect(page.getByText(/Rejected by wallet\./)).toBeVisible()
    expect(await page.evaluate(() => window.cawWallet.events)).toEqual([{
      type: 'caw-link-error', detail: { address: SECONDARY, chainId: flow.chain, message: 'Rejected by wallet.' },
    }])
    await expect(page.getByRole('button', { name: 'Change address', exact: true })).toBeEnabled()
  })

  test(`${flow.action}: a reverted receipt never reports success`, async ({ page }) => {
    const rpc = await openWalletFlow(page)
    rpc.reverted = true
    await connectAndCheck(page)
    const action = page.getByTestId(`chain-row-${flow.chain}`).getByRole('button', { name: flow.action, exact: true })
    await action.click()
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(action).toBeEnabled()
    await expect(page.getByText(/Failed to (link|unlink) on/)).toBeVisible()
    expect(await page.evaluate(() => window.cawWallet.events.map((event) => event.type))).toEqual(['caw-link-error'])
  })
}

test('rapid competing actions cannot replace the dialog or change its address', async ({ page }) => {
  await openWalletFlow(page)
  await connectAndCheck(page)
  await page.evaluate(() => {
    const first = document.querySelector<HTMLButtonElement>('[data-testid="chain-row-122"] button')!
    const second = document.querySelector<HTMLButtonElement>('[data-testid="chain-row-50"] button')!
    const change = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Change address')!
    first.click()
    first.click()
    second.click()
    change.click()
  })
  await expect(page.getByRole('heading', { name: 'Security Confirmation' })).toHaveCount(1)
  expect(await page.evaluate(() => window.cawWallet.calls.filter((call) => call.method === 'wallet_switchEthereumChain'))).toHaveLength(1)
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('chain-row-122').getByRole('button', { name: 'Connect', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Change address', exact: true })).toBeEnabled()
})

test('rejected network switch releases busy state without opening a security dialog', async ({ page }) => {
  await openWalletFlow(page)
  await connectAndCheck(page)
  await page.evaluate(() => { window.cawWallet.rejectSwitch = true })
  const action = page.getByTestId('chain-row-50').getByRole('button', { name: 'Connect', exact: true })
  await action.click()
  await expect(page.getByText(/Rejected by wallet\./)).toBeVisible()
  await expect(action).toBeEnabled()
  await expect(page.getByRole('heading', { name: 'Security Confirmation' })).toHaveCount(0)
})

test('disconnecting during confirmation cancels it without signing', async ({ page }) => {
  await openWalletFlow(page)
  await connectAndCheck(page)
  await page.getByTestId('chain-row-122').getByRole('button', { name: 'Connect', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Security Confirmation' })).toBeVisible()
  await page.evaluate(() => window.cawWallet.emit('accountsChanged', []))
  await expect(page.getByRole('heading', { name: 'Security Confirmation' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Connect Wallet', exact: true })).toBeEnabled()
  expect(await page.evaluate(() => window.cawWallet.calls.filter((call) => call.method === 'eth_sendTransaction'))).toEqual([])
  await connectAndCheck(page)
})

test('busy guard stays active after confirmation until the receipt arrives', async ({ page }) => {
  const rpc = await openWalletFlow(page)
  rpc.holdReceipt = true
  await connectAndCheck(page)
  await page.getByTestId('chain-row-122').getByRole('button', { name: 'Connect', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect.poll(() => rpc.receiptRequested).toBe(true)
  await expect(page.getByRole('heading', { name: 'Security Confirmation' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Change address', exact: true })).toBeDisabled()
  for (const chain of [122, 42220, 50]) {
    await expect(page.getByTestId(`chain-row-${chain}`).getByRole('button')).toBeDisabled()
  }
  await screenshot(page, 'caw-11-transaction-pending')
  rpc.holdReceipt = false
  rpc.releaseReceipt()
  await expect(page.getByTestId('chain-row-122').getByRole('button', { name: 'Disconnect', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Change address', exact: true })).toBeEnabled()
})

test('late status responses cannot populate a different wallet session', async ({ page }) => {
  const rpc = await openWalletFlow(page)
  rpc.holdReads = true
  await page.getByRole('button', { name: 'Connect Wallet', exact: true }).click()
  await page.getByRole('textbox', { name: 'Wallet address' }).fill(SECONDARY)
  await page.getByRole('button', { name: 'Check address', exact: true }).click()
  await expect.poll(() => rpc.releaseReads.length).toBe(3)
  await page.evaluate(() => window.cawWallet.emit('accountsChanged', ['0x2222222222222222222222222222222222222222']))
  rpc.holdReads = false
  rpc.releaseReads.forEach((release) => release())
  await expect(page.getByRole('textbox', { name: 'Wallet address' })).toBeEnabled()
  await expect(page.getByRole('textbox', { name: 'Wallet address' })).toHaveValue('')
  await expect(page.getByTestId('chain-row-122')).toHaveCount(0)
})

for (const width of [390, 1280]) {
  test(`interactive flow is usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await openWalletFlow(page)
    await connectAndCheck(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await screenshot(page, `caw-flow-${width}-ready`)
    await page.getByTestId('chain-row-50').getByRole('button', { name: 'Connect', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Security Confirmation' })).toBeVisible()
    await screenshot(page, `caw-flow-${width}-confirmation`)
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Change address', exact: true })).toBeEnabled()
  })
}
