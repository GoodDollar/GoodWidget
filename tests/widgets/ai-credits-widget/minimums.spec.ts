import { expect, test } from '@playwright/test'
import { toFunctionSelector, type Address, type PublicClient } from 'viem'
import { ProductionAiCreditsChainClient } from '../../../packages/ai-credits-widget/src/chainClient'
import {
  fetchVaultPaymentMinimums,
  validateVaultPaymentAmounts,
} from '../../../packages/ai-credits-widget/src/vaultMinimums'

const PAYER = '0x0000000000000000000000000000000000000011' as Address
const BUYER = '0x0000000000000000000000000000000000000022' as Address
const VAULT = '0x0000000000000000000000000000000000000033' as Address
const DEPOSITS = '0x0000000000000000000000000000000000000044' as Address

function celoClient(totalDeposited = 1n): PublicClient {
  return {
    readContract: async ({ functionName, args }: { functionName: string; args?: bigint[] }) => {
      if (functionName === 'totalDepositedGd') return totalDeposited
      if (functionName === 'gdUsdPerToken') return args![0]
      return 10n ** 18n
    },
  } as unknown as PublicClient
}

test('reads buyers.balance directly, ignoring reserved and other account fields', async () => {
  const reads: unknown[] = []
  const client = Object.create(ProductionAiCreditsChainClient.prototype) as ProductionAiCreditsChainClient
  Object.defineProperties(client, {
    depositsAddress: { value: DEPOSITS },
    baseClient: { value: Promise.resolve({
      readContract: async (request: unknown) => {
        reads.push(request)
        return [0n, 99n, 1n, 1n, PAYER, 7n]
      },
    }) },
  })
  expect(await client.getBuyerStoredBalance(BUYER)).toBe(0n)
  expect(reads).toEqual([expect.objectContaining({
    address: DEPOSITS,
    functionName: 'buyers',
    args: [BUYER],
  })])
})

test('repeat payer switching to a zero-balance buyer restores the deposit minimum', async () => {
  expect((await fetchVaultPaymentMinimums(celoClient(), VAULT, PAYER, 1n)).minDepositUsd).toBeNull()
  expect((await fetchVaultPaymentMinimums(celoClient(), VAULT, PAYER, 0n)).minDepositUsd).toBe('1.00')
  expect((await fetchVaultPaymentMinimums(celoClient(0n), VAULT, PAYER, 1n)).minDepositUsd).toBe('1.00')
})

test('zero-balance buyer rejects sub-dollar principal but accepts exactly one dollar', async () => {
  const params = {
    publicClient: celoClient(), vault: VAULT, payer: PAYER,
    buyerBalance: 0n, streamAmount: '0',
  }
  await expect(validateVaultPaymentAmounts({ ...params, depositAmount: '0.99' }))
    .rejects.toThrow('First deposit must be at least')
  await expect(validateVaultPaymentAmounts({ ...params, depositAmount: '1' })).resolves.toBeUndefined()
  await expect(validateVaultPaymentAmounts({ ...params, depositAmount: '1.01' })).resolves.toBeUndefined()
})

test('smallest positive stored balance permits a top-up, but zero at submit rejects it', async () => {
  const params = {
    publicClient: celoClient(), vault: VAULT, payer: PAYER,
    depositAmount: '0.01', streamAmount: '0',
  }
  await expect(validateVaultPaymentAmounts({ ...params, buyerBalance: 1n })).resolves.toBeUndefined()
  await expect(validateVaultPaymentAmounts({ ...params, buyerBalance: 0n }))
    .rejects.toThrow('First deposit must be at least')
  await expect(validateVaultPaymentAmounts({ ...params, publicClient: celoClient(0n), buyerBalance: 1n }))
    .rejects.toThrow('First deposit must be at least')
})

test('zero buyer balance does not impose a lump-sum deposit on stream-only changes', async () => {
  const params = {
    publicClient: celoClient(), vault: VAULT, payer: PAYER,
    buyerBalance: 0n, depositAmount: '0',
  }
  await expect(validateVaultPaymentAmounts({ ...params, streamAmount: '1' })).resolves.toBeUndefined()
  await expect(validateVaultPaymentAmounts({ ...params, streamAmount: '0', currentStreamAmount: '1' }))
    .resolves.toBeUndefined()
})

test.describe('buyer minimum real adapter', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://chainlist.org/rpcs.json', (route) => route.fulfill({ json: [] }))
    await page.route('https://ai-credits-minimums.invalid/rpc', async (route) => {
      const request = route.request().postDataJSON()
      const respond = (call: { id: number; method: string; params?: [{ data?: string }] }) => {
        const data = call.params?.[0]?.data ?? ''
        let value = 0n
        if (data.startsWith(toFunctionSelector('balanceOf(address)'))) value = 1000n * 10n ** 18n
        if (data.startsWith(toFunctionSelector('decimals()'))) value = 18n
        if (data.startsWith(toFunctionSelector('totalDepositedGd(address)'))) value = 1n
        if (data.startsWith(toFunctionSelector('minFirstDepositUsd()')) ||
            data.startsWith(toFunctionSelector('minMonthlyStreamUsd()'))) value = 10n ** 18n
        if (data.startsWith(toFunctionSelector('gdUsdPerToken(uint128)'))) value = BigInt(`0x${data.slice(10)}`)
        return { jsonrpc: '2.0', id: call.id, result: `0x${value.toString(16).padStart(64, '0')}` }
      }
      await route.fulfill({ json: Array.isArray(request) ? request.map(respond) : respond(request) })
    })
    await page.goto('/iframe.html?id=qa-aicreditswidget-buyer-minimums--buyer-switching&viewMode=story')
    const root = page.getByTestId('AiCreditsWidget-buyer-minimums')
    await expect(root).toBeVisible()
    await root.getByText('Buy Credits', { exact: true }).click()
    await expect(root.getByRole('button', { name: 'Buy AI Credits', exact: true })).toBeEnabled()
  })

  test('switching buyers restores the minimum and exact dollar principal passes', async ({ page }) => {
    const root = page.getByTestId('AiCreditsWidget-buyer-minimums')
    const deposit = root.getByRole('textbox').first()
    const pay = root.getByRole('button', { name: 'Buy AI Credits', exact: true })
    await deposit.fill('0.5')
    await expect(pay).toBeEnabled()
    await page.getByRole('button', { name: 'Select empty buyer', exact: true }).click()
    await expect(pay).toBeDisabled()
    await expect(root.getByText(/First deposit must be at least (US\$|\$)1\.00\./)).toBeVisible()
    await page.screenshot({ path: 'tests/widgets/ai-credits-widget/test-results/acw-buyer-zero-minimum-desktop.png', fullPage: true })
    await deposit.fill('1')
    await expect(pay).toBeEnabled()
    await deposit.fill('0.5')
    await page.getByRole('button', { name: 'Select funded buyer', exact: true }).click()
    await expect(pay).toBeEnabled()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: 'tests/widgets/ai-credits-widget/test-results/acw-buyer-funded-mobile.png', fullPage: true })
  })

  test('fresh submit guard rejects a balance emptied after initial loading', async ({ page }) => {
    await page.getByRole('button', { name: 'Empty stored balance', exact: true }).click()
    await page.getByRole('button', { name: 'Submit directly', exact: true }).click()
    await expect(page.getByTestId('BuyerMinimums-result')).toContainText('First deposit must be at least')
    await expect(page.getByTestId('BuyerMinimums-result')).toContainText('wallet submissions: 0')
    await page.screenshot({ path: 'tests/widgets/ai-credits-widget/test-results/acw-buyer-submit-zero.png', fullPage: true })
  })

  test('failed balance reads block deposits and retry recovers', async ({ page }) => {
    const root = page.getByTestId('AiCreditsWidget-buyer-minimums')
    const pay = root.getByRole('button', { name: 'Buy AI Credits', exact: true })
    await page.getByRole('button', { name: 'Fail balance read', exact: true }).click()
    await expect(pay).toBeDisabled()
    await expect(root.getByText('Could not check buyer balance. Refresh to try again.').first()).toBeVisible()
    await page.getByRole('button', { name: 'Submit directly', exact: true }).click()
    await expect(page.getByTestId('BuyerMinimums-result')).toContainText('wallet submissions: 0')
    await page.screenshot({ path: 'tests/widgets/ai-credits-widget/test-results/acw-buyer-balance-error.png', fullPage: true })
    await page.getByRole('button', { name: 'Retry balance read', exact: true }).click()
    await expect(pay).toBeEnabled()
  })

  test('buyer changes during preflight abort before wallet submission', async ({ page }) => {
    await page.getByRole('button', { name: 'Delay balance reads', exact: true }).click()
    await page.getByRole('button', { name: 'Submit directly', exact: true }).click()
    await page.getByRole('button', { name: 'Select empty buyer', exact: true }).click()
    await expect(page.getByTestId('BuyerMinimums-result')).toContainText('Buyer or wallet changed')
    await expect(page.getByTestId('BuyerMinimums-result')).toContainText('wallet submissions: 0')
    await page.screenshot({ path: 'tests/widgets/ai-credits-widget/test-results/acw-buyer-preflight-changed.png', fullPage: true })
  })

  test('late funded-buyer responses cannot waive the selected empty buyer minimum', async ({ page }) => {
    const root = page.getByTestId('AiCreditsWidget-buyer-minimums')
    const pay = root.getByRole('button', { name: 'Buy AI Credits', exact: true })
    await root.getByRole('textbox').first().fill('0.5')
    await expect(pay).toBeEnabled()
    await page.getByRole('button', { name: 'Delay balance reads', exact: true }).click()
    await page.getByRole('button', { name: 'Select empty buyer', exact: true }).click()
    await page.getByRole('button', { name: 'Select funded buyer', exact: true }).click()
    await page.getByRole('button', { name: 'Select empty buyer', exact: true }).click()
    await expect(pay).toBeDisabled()
    await expect(root.getByText(/First deposit must be at least (US\$|\$)1\.00\./)).toBeVisible()
    await expect(pay).toBeDisabled()
    await page.screenshot({ path: 'tests/widgets/ai-credits-widget/test-results/acw-buyer-stale-response.png', fullPage: true })
  })
})