import { expect, type Page } from '@playwright/test'
import type { EIP1193Provider } from '@goodwidget/core'

export const HOST = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
export const SECONDARY = '0x1111111111111111111111111111111111111111'
export const HASH = `0x${'a'.repeat(64)}`
const STORY = '/iframe.html?id=qa-connectawalletwidget-interactions--wallet-flow&viewMode=story'

interface WalletFixture {
  accounts: string[]
  chainId: number
  rejectConnect: boolean
  rejectSwitch: boolean
  rejectTransaction: boolean
  holdTransaction: boolean
  rejectPendingTransaction: () => void
  calls: { method: string; params?: unknown }[]
  events: { type: string; detail: unknown }[]
  emit: (event: string, value: unknown) => void
}

declare global {
  interface Window {
    cawWallet: WalletFixture
    cawProvider: EIP1193Provider
  }
}

export async function openWalletFlow(page: Page, story = STORY, injectProvider = true) {
  const rpc = {
    reads: [] as number[],
    failChain: 0,
    reverted: false,
    holdReceipt: false,
    receiptRequested: false,
    releaseReceipt: () => {},
    holdReads: false,
    releaseReads: [] as (() => void)[],
  }
  await page.addInitScript(({ host, hash, injectProvider }) => {
    const listeners = new Map<string, Set<(value: unknown) => void>>()
    const wallet: WalletFixture = {
      accounts: [], chainId: 42220,
      rejectConnect: false, rejectSwitch: false, rejectTransaction: false,
      holdTransaction: false, rejectPendingTransaction: () => {},
      calls: [], events: [],
      emit(event, value) {
        if (event === 'accountsChanged') wallet.accounts = value as string[]
        listeners.get(event)?.forEach((listener) => listener(value))
      },
    }
    window.cawWallet = wallet
    for (const type of ['caw-link-success', 'caw-unlink-success', 'caw-link-error']) {
      window.addEventListener(type, (event) => wallet.events.push({ type, detail: (event as CustomEvent).detail }))
    }
    window.cawProvider = {
      on(event: string, listener: (value: unknown) => void) {
        if (!listeners.has(event)) listeners.set(event, new Set())
        listeners.get(event)!.add(listener)
      },
      removeListener(event: string, listener: (value: unknown) => void) {
        listeners.get(event)?.delete(listener)
      },
      async request({ method, params }: { method: string; params?: { chainId?: string }[] }) {
        wallet.calls.push({ method, params })
        const reject = () => { throw Object.assign(new Error('User rejected request'), { code: 4001 }) }
        switch (method) {
          case 'eth_accounts': return wallet.accounts
          case 'eth_requestAccounts':
            if (wallet.rejectConnect) reject()
            wallet.emit('accountsChanged', [host])
            return wallet.accounts
          case 'eth_chainId': return `0x${wallet.chainId.toString(16)}`
          case 'wallet_switchEthereumChain':
            if (wallet.rejectSwitch) reject()
            wallet.chainId = Number(params?.[0].chainId)
            wallet.emit('chainChanged', `0x${wallet.chainId.toString(16)}`)
            return null
          case 'eth_sendTransaction':
            if (wallet.holdTransaction) await new Promise<void>((_resolve, reject) => {
              wallet.rejectPendingTransaction = () => reject(Object.assign(new Error('User rejected request'), { code: 4001 }))
            })
            if (wallet.rejectTransaction) reject()
            return hash
          default: throw new Error(`Unexpected wallet RPC: ${method}`)
        }
      },
    } as EIP1193Provider
    if (injectProvider) Object.defineProperty(window, 'ethereum', {
      configurable: true, value: window.cawProvider,
    })
  }, { host: HOST, hash: HASH, injectProvider })

  await page.route(/^https:\/\/(rpc\.fuse\.io|forno\.celo\.org|rpc\.ankr\.com\/xdc)/, async (route) => {
    const url = route.request().url()
    const chainId = url.includes('fuse') ? 122 : url.includes('celo') ? 42220 : 50
    const request = route.request().postDataJSON()
    const calls = Array.isArray(request) ? request : [request]
    if (rpc.holdReceipt && calls.some((call) => call.method === 'eth_getTransactionReceipt')) {
      rpc.receiptRequested = true
      await new Promise<void>((resolve) => { rpc.releaseReceipt = resolve })
    }
    if (rpc.holdReads && calls.some((call) => call.method === 'eth_call')) {
      await new Promise<void>((resolve) => { rpc.releaseReads.push(resolve) })
    }
    const reply = (call: { id: number; method: string }) => {
      if (call.method === 'eth_call') {
        rpc.reads.push(chainId)
        if (rpc.failChain === chainId) return { jsonrpc: '2.0', id: call.id, error: { code: -32000, message: 'RPC unavailable' } }
      }
      let result: unknown
      switch (call.method) {
        // Give each chain a distinct initial status; contract simulation has no return values.
        case 'eth_call': result = `0x${(chainId === 42220 ? HOST.slice(2) : '0').padStart(64, '0')}`; break
        case 'eth_chainId': result = `0x${chainId.toString(16)}`; break
        case 'eth_blockNumber': result = '0x10'; break
        case 'eth_getTransactionReceipt':
          result = {
            transactionHash: HASH, transactionIndex: '0x0', blockHash: `0x${'b'.repeat(64)}`,
            blockNumber: '0x10', from: HOST, to: SECONDARY, cumulativeGasUsed: '0x5208',
            gasUsed: '0x5208', effectiveGasPrice: '0x1', contractAddress: null, logs: [],
            logsBloom: `0x${'0'.repeat(512)}`, status: rpc.reverted ? '0x0' : '0x1', type: '0x0',
          }
          break
        default: throw new Error(`Unexpected HTTP RPC: ${call.method}`)
      }
      return { jsonrpc: '2.0', id: call.id, result }
    }
    await route.fulfill({ json: Array.isArray(request) ? request.map(reply) : reply(request) })
  })
  await page.goto(story)
  await expect(page.getByRole('button', { name: 'Connect Wallet', exact: true })).toBeVisible()
  return rpc
}

export async function connectAndCheck(page: Page) {
  await page.getByRole('button', { name: 'Connect Wallet', exact: true }).click()
  await page.getByRole('textbox', { name: 'Wallet address' }).fill(SECONDARY)
  await page.getByRole('button', { name: 'Check address', exact: true }).click()
  await expect(page.getByTestId('chain-row-122').getByRole('button', { name: 'Connect', exact: true })).toBeEnabled()
}

export async function screenshot(page: Page, name: string) {
  const confirmation = page.getByRole('heading', { name: 'Security Confirmation' })
  if (await confirmation.count()) {
    // The shared dialog uses spring-driven opacity, which screenshot's CSS
    // animation disabling cannot fast-forward. Capture the settled dialog.
    await expect.poll(() => confirmation.evaluate((heading) => {
      for (let node: Element | null = heading; node; node = node.parentElement) {
        if (Number(getComputedStyle(node).opacity) < 1) return false
      }
      return true
    })).toBe(true)
  }
  await page.screenshot({
    path: `tests/widgets/connect-a-wallet-widget/test-results/${name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
}
