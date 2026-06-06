import type {
  GoodReserveSDKConstructor,
  GoodReserveSDKLike,
  ReserveStats,
  ReserveTransactionResult,
} from '@goodwidget/goodreserve-widget'
import type { EIP1193Provider } from '@goodwidget/core'

// ---------------------------------------------------------------------------
// Deterministic, CI-safe test doubles for the GoodReserve flow.
//
// These exercise the REAL adapter (quote → confirm → buy/sell → success) via
// the SDK injection seam, with no published @goodsdks/good-reserve package and
// no live RPC. The fake encodes the verified PR #35 contract: getBuyQuote/
// getSellQuote arg order, the buy(tokenIn, amountIn, minReturn, onHash) /
// sell(sellTo, gdAmount, minReturn, onHash) signatures, and the
// { hash, receipt } result shape.
// ---------------------------------------------------------------------------

const STABLE_TOKEN = '0x765DE816845861e75A25fCA122bb6898B8B1282a' as const
const GD_TOKEN = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A' as const

// erc20 balanceOf(account) selector + a fixed balance, so the adapter's
// balance reads resolve deterministically through eth_call.
const BALANCE_OF_SELECTOR = '0x70a08231'
// 120 * 1e18 (stable, 18 decimals) — comfortably above the 25 test input.
const STABLE_BALANCE_WEI = (120n * 10n ** 18n).toString(16).padStart(64, '0')

const SUBMITTED_HASH =
  '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as const

/** Fake GoodReserveSDK implementing the PR #35 public surface deterministically. */
export const FakeGoodReserveSDK: GoodReserveSDKConstructor = class FakeGoodReserveSDK
  implements GoodReserveSDKLike
{
  // Matches the real `new GoodReserveSDK(publicClient, walletClient, env)`.
  constructor(
    _publicClient: unknown,
    _walletClient: unknown,
    _env: 'production' | 'development',
  ) {}

  getStableTokenAddress(): `0x${string}` {
    return STABLE_TOKEN
  }

  getGoodDollarAddress(): `0x${string}` {
    return GD_TOKEN
  }

  async getReserveStats(): Promise<ReserveStats> {
    return {
      goodDollarTotalSupply: 0n,
      stableTokenDecimals: 18,
      goodDollarDecimals: 2,
      poolReserveBalance: null,
      poolTokenSupply: null,
      reserveRatio: 500_000, // PPM → 50%
      exitContribution: 5_000, // PPM → 0.50% (verifies the C1 scaling fix)
    }
  }

  // getBuyQuote(tokenIn, amountIn) → G$ out. ~4.33 G$ per stable for the demo.
  async getBuyQuote(_tokenIn: `0x${string}`, amountIn: bigint): Promise<bigint> {
    // amountIn is 18-dec stable; output is 2-dec G$. 25e18 → 10825 (108.25 G$).
    return (amountIn * 433n) / 10n ** 18n
  }

  // getSellQuote(gdAmount, sellTo) → stable out.
  async getSellQuote(gdAmount: bigint, _sellTo: `0x${string}`): Promise<bigint> {
    // gdAmount is 2-dec G$; output is 18-dec stable.
    return (gdAmount * 10n ** 18n) / 433n
  }

  async buy(
    _tokenIn: `0x${string}`,
    _amountIn: bigint,
    _minReturn: bigint,
    onHash?: (hash: `0x${string}`) => void,
  ): Promise<ReserveTransactionResult> {
    onHash?.(SUBMITTED_HASH)
    return { hash: SUBMITTED_HASH, receipt: { transactionHash: SUBMITTED_HASH } }
  }

  async sell(
    _sellTo: `0x${string}`,
    _gdAmount: bigint,
    _minReturn: bigint,
    onHash?: (hash: `0x${string}`) => void,
  ): Promise<ReserveTransactionResult> {
    onHash?.(SUBMITTED_HASH)
    return { hash: SUBMITTED_HASH, receipt: { transactionHash: SUBMITTED_HASH } }
  }
}

type EventCallback = (...args: unknown[]) => void

/**
 * Minimal deterministic EIP-1193 provider for the live-adapter story. Reports a
 * connected account on Celo and answers eth_call balanceOf with a fixed balance.
 * No network access — every method resolves locally.
 */
export function createReserveTestProvider(
  account = '0x1111111111111111111111111111111111111111',
  chainId = 42220,
): EIP1193Provider {
  let activeChainId = chainId
  const listeners: Record<string, EventCallback[]> = {}

  return {
    on(event: string, fn: EventCallback) {
      ;(listeners[event] ??= []).push(fn)
    },
    removeListener(event: string, fn: EventCallback) {
      listeners[event] = (listeners[event] ?? []).filter((cb) => cb !== fn)
    },
    async request({ method, params }: { method: string; params?: unknown[] }): Promise<unknown> {
      switch (method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return [account]
        case 'eth_chainId':
          return `0x${activeChainId.toString(16)}`
        case 'net_version':
          return String(activeChainId)
        case 'wallet_switchEthereumChain': {
          const requested = (params?.[0] as { chainId?: string } | undefined)?.chainId
          if (requested) {
            activeChainId = Number.parseInt(requested, 16)
            for (const cb of listeners['chainChanged'] ?? []) cb(requested)
          }
          return null
        }
        case 'eth_call': {
          const call = (params?.[0] as { data?: string } | undefined) ?? {}
          // balanceOf(account) → fixed balance; anything else → 0.
          if (call.data?.startsWith(BALANCE_OF_SELECTOR)) {
            return `0x${STABLE_BALANCE_WEI}`
          }
          return `0x${''.padStart(64, '0')}`
        }
        default:
          return null
      }
    },
  } as EIP1193Provider
}
