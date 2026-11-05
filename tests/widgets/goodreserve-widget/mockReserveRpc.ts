/**
 * mockReserveRpc.ts — deterministic JSON-RPC mock for the GoodReserve widget's read path.
 *
 * The widget builds its viem public client with the default RPC of each chain, so the
 * mock intercepts those hosts with `page.route` and answers the handful of `eth_call`s the
 * @goodsdks/good-reserve SDK makes (token decimals/balances, Mento exchange ids/pool, and
 * `getAmountOut` quotes). ABI encoding is done by hand (every value is a static 32-byte
 * word) so the tests need no extra dependencies.
 *
 * Every chain/environment pair has its own contract addresses, decimals, rate and exit
 * contribution, so a quote only comes out right when the widget talked to the contract set
 * of the expected environment. Calls to any address outside the known sets are recorded in
 * `unexpectedCalls` and rejected.
 *
 * Quote requests can be held and released on demand to reproduce out-of-order responses.
 */
import type { Page, Route } from '@playwright/test'

export type ReserveChainName = 'celo' | 'xdc'
export type ReserveEnvironmentName = 'production' | 'development'

export interface ReserveMockConfig {
  chain: ReserveChainName
  environment: ReserveEnvironmentName
  chainId: number
  broker: string
  exchangeProvider: string
  goodDollar: string
  stableToken: string
  stableDecimals: number
  /** G$ received per 1 stable token (buy); the sell quote is the inverse. */
  gdPerStable: bigint
  /** Raw Mento `exitContribution` (1e8 scale): 10_000_000 renders as 10.00%. */
  exitContributionRaw: bigint
  stableSymbol: string
}

// Addresses mirror RESERVE_CONTRACT_ADDRESSES in @goodsdks/good-reserve. XDC production has no
// entry because the SDK publishes no contracts for it (it is 'unavailable'). Rates, decimals and
// exit contributions are test fixtures chosen to differ per pair.
export const RESERVE_MOCK_CONFIGS: Record<
  'production-celo' | 'development-celo' | 'development-xdc',
  ReserveMockConfig
> = {
  'production-celo': {
    chain: 'celo',
    environment: 'production',
    chainId: 42220,
    broker: '0x88de45906D4F5a57315c133620cfa484cB297541',
    exchangeProvider: '0x2fFBB49055d487DdBBb0C052Cd7c2a02A7971e41',
    goodDollar: '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A',
    stableToken: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    stableDecimals: 18,
    gdPerStable: 100n,
    exitContributionRaw: 10_000_000n,
    stableSymbol: 'USDm',
  },
  'development-celo': {
    chain: 'celo',
    environment: 'development',
    chainId: 42220,
    broker: '0xE60cf1cb6a56131CE135c604D0BD67e84B57CA3C',
    exchangeProvider: '0x558eC7E55855FAC9403De3ADB3aa1e588234A92C',
    goodDollar: '0xFa51eFDc0910CCdA91732e6806912Fa12e2FD475',
    stableToken: '0xeed145D8d962146AFc568E9579948576f63D5Dc2',
    stableDecimals: 18,
    gdPerStable: 50n,
    exitContributionRaw: 2_500_000n,
    stableSymbol: 'USDm',
  },
  'development-xdc': {
    chain: 'xdc',
    environment: 'development',
    chainId: 50,
    broker: '0x6ef11986dc7ebde345134068877efecd18d7430c',
    exchangeProvider: '0x1fad5a713da1f51e2a1ac4ca2e1d621919f0aba0',
    goodDollar: '0xA13625A72Aef90645CfCe34e25c114629d7855e7',
    stableToken: '0xCCE5f6B605164B7784b4719829d84b0f7493b906',
    stableDecimals: 6,
    gdPerStable: 40n,
    exitContributionRaw: 1_000_000n,
    stableSymbol: 'USDC',
  },
}

const GD_DECIMALS = 18
const MOCK_WALLET_STABLE_BALANCE = 777n
const MOCK_WALLET_GD_BALANCE = 50_000n
const MOCK_EXCHANGE_ID = `0x${'ab'.repeat(32)}`

// 4-byte selectors of the SDK's read calls (keccak of the canonical signatures).
const SELECTORS = {
  totalSupply: '0x18160ddd',
  decimals: '0x313ce567',
  balanceOf: '0x70a08231',
  getExchangeIds: '0xdc162e36',
  getPoolExchange: '0x278488a4',
  getAmountOut: '0xa20f2305',
} as const

// Hosts of viem's default RPC for each chain.
const RPC_URL_PATTERNS: Record<ReserveChainName, string> = {
  celo: 'https://forno.celo.org/**',
  xdc: 'https://rpc.xdcrpc.com/**',
}

export interface RecordedEthCall {
  chain: ReserveChainName
  to: string
  selector: string
}

export interface HeldQuote {
  /** Resolves once the widget has sent the held request. */
  requested: Promise<void>
  /** Lets the held response go out; resolves after it has been fulfilled. */
  release: () => Promise<void>
}

export interface ReserveRpcMock {
  calls: RecordedEthCall[]
  unexpectedCalls: RecordedEthCall[]
  /** Withholds the `getAmountOut` response for one chain + input amount until released. */
  holdQuote: (chain: ReserveChainName, amountInBaseUnits: bigint) => HeldQuote
}

const toWord = (value: bigint): string => value.toString(16).padStart(64, '0')
const addressToWord = (address: string): string =>
  address.toLowerCase().replace('0x', '').padStart(64, '0')
const wordAt = (data: string, index: number): string =>
  data.slice(10 + index * 64, 10 + (index + 1) * 64)
const isSameAddress = (left: string, right: string): boolean =>
  left.toLowerCase() === right.toLowerCase()

/** Scales a whole-token amount to base units for the given decimals. */
export function toBaseUnits(wholeTokens: bigint, decimals: number): bigint {
  return wholeTokens * 10n ** BigInt(decimals)
}

function encodeAmountOut(config: ReserveMockConfig, data: string): string {
  const tokenIn = `0x${wordAt(data, 2).slice(24)}`
  const amountIn = BigInt(`0x${wordAt(data, 4)}`)
  const decimalsGap = 10n ** BigInt(GD_DECIMALS - config.stableDecimals)
  const isBuy = isSameAddress(tokenIn, config.stableToken)
  const amountOut = isBuy
    ? amountIn * config.gdPerStable * decimalsGap
    : amountIn / (config.gdPerStable * decimalsGap)
  return `0x${toWord(amountOut)}`
}

function encodeEthCallResult(config: ReserveMockConfig, to: string, data: string): string | null {
  const selector = data.slice(0, 10)
  const isStable = isSameAddress(to, config.stableToken)
  const isGoodDollar = isSameAddress(to, config.goodDollar)

  if ((isStable || isGoodDollar) && selector === SELECTORS.decimals) {
    return `0x${toWord(BigInt(isStable ? config.stableDecimals : GD_DECIMALS))}`
  }
  if (isGoodDollar && selector === SELECTORS.totalSupply) {
    return `0x${toWord(toBaseUnits(1_000_000n, GD_DECIMALS))}`
  }
  if ((isStable || isGoodDollar) && selector === SELECTORS.balanceOf) {
    return isStable
      ? `0x${toWord(toBaseUnits(MOCK_WALLET_STABLE_BALANCE, config.stableDecimals))}`
      : `0x${toWord(toBaseUnits(MOCK_WALLET_GD_BALANCE, GD_DECIMALS))}`
  }
  if (isSameAddress(to, config.exchangeProvider) && selector === SELECTORS.getExchangeIds) {
    // bytes32[] with a single exchange id: offset, length, element.
    return `0x${toWord(32n)}${toWord(1n)}${MOCK_EXCHANGE_ID.slice(2)}`
  }
  if (isSameAddress(to, config.exchangeProvider) && selector === SELECTORS.getPoolExchange) {
    // (reserveAsset, tokenAddress, tokenSupply, reserveBalance, reserveRatio, exitContribution)
    return `0x${addressToWord(config.stableToken)}${addressToWord(config.goodDollar)}${toWord(
      toBaseUnits(1_000_000n, GD_DECIMALS),
    )}${toWord(toBaseUnits(100_000n, config.stableDecimals))}${toWord(40_000_000n)}${toWord(
      config.exitContributionRaw,
    )}`
  }
  if (isSameAddress(to, config.broker) && selector === SELECTORS.getAmountOut) {
    return encodeAmountOut(config, data)
  }
  return null
}

/** Installs the mock for both chains' default RPC hosts on the given page. */
export async function installReserveRpcMock(page: Page): Promise<ReserveRpcMock> {
  const calls: RecordedEthCall[] = []
  const unexpectedCalls: RecordedEthCall[] = []
  const heldQuotes = new Map<
    string,
    { released: Promise<void>; markRequested: () => void; markFulfilled: () => void }
  >()

  const quoteKey = (chain: ReserveChainName, amountIn: bigint) => `${chain}:${amountIn}`

  async function answerRpcRequest(
    chain: ReserveChainName,
    rpcRequest: { id: number; method: string; params?: unknown[] },
  ): Promise<Record<string, unknown>> {
    const chainConfigs = Object.values(RESERVE_MOCK_CONFIGS).filter(
      (config) => config.chain === chain,
    )
    const respond = (result: unknown) => ({ jsonrpc: '2.0', id: rpcRequest.id, result })
    const reject = (message: string) => ({
      jsonrpc: '2.0',
      id: rpcRequest.id,
      error: { code: -32000, message },
    })

    if (rpcRequest.method === 'eth_chainId')
      return respond(`0x${chainConfigs[0].chainId.toString(16)}`)
    if (rpcRequest.method !== 'eth_call')
      return reject(`mock RPC: unsupported method ${rpcRequest.method}`)

    const { to, data } = (rpcRequest.params?.[0] ?? {}) as {
      to: string
      data?: string
      input?: string
    }
    const callData = data ?? (rpcRequest.params?.[0] as { input?: string }).input ?? '0x'
    const recorded: RecordedEthCall = { chain, to, selector: callData.slice(0, 10) }
    calls.push(recorded)

    const config = chainConfigs.find((candidate) =>
      [
        candidate.broker,
        candidate.exchangeProvider,
        candidate.goodDollar,
        candidate.stableToken,
      ].some((address) => isSameAddress(address, to)),
    )
    // A broker/provider address is only unique per environment within one chain, so an
    // unknown address means the widget used a contract set the test did not expect.
    const result = config ? encodeEthCallResult(config, to, callData) : null
    if (result === null) {
      unexpectedCalls.push(recorded)
      return reject(`mock RPC: unexpected eth_call to ${to} (${recorded.selector})`)
    }

    if (recorded.selector === SELECTORS.getAmountOut) {
      const held = heldQuotes.get(quoteKey(chain, BigInt(`0x${wordAt(callData, 4)}`)))
      if (held) {
        held.markRequested()
        await held.released
        held.markFulfilled()
      }
    }
    return respond(result)
  }

  for (const chain of Object.keys(RPC_URL_PATTERNS) as ReserveChainName[]) {
    await page.route(RPC_URL_PATTERNS[chain], async (route: Route) => {
      const payload = route.request().postDataJSON()
      const responses = Array.isArray(payload)
        ? await Promise.all(payload.map((entry) => answerRpcRequest(chain, entry)))
        : await answerRpcRequest(chain, payload)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(responses),
      })
    })
  }

  return {
    calls,
    unexpectedCalls,
    holdQuote(chain, amountInBaseUnits) {
      let markRequested!: () => void
      let markFulfilled!: () => void
      let releaseHeldResponse!: () => void
      const requested = new Promise<void>((resolve) => (markRequested = resolve))
      const fulfilled = new Promise<void>((resolve) => (markFulfilled = resolve))
      const released = new Promise<void>((resolve) => (releaseHeldResponse = resolve))
      heldQuotes.set(quoteKey(chain, amountInBaseUnits), { released, markRequested, markFulfilled })
      return {
        requested,
        release: async () => {
          releaseHeldResponse()
          await fulfilled
        },
      }
    },
  }
}
