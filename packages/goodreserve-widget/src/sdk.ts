// ---------------------------------------------------------------------------
// Typed seam for @goodsdks/good-reserve.
//
// Source of truth (mirrored verbatim):
//   GoodSDKs PR #35 — "Feat/good reserve sdk"
//   https://github.com/GoodDollar/GoodSDKs/pull/35
//   merged 2026-04-02  (merge commit 53fa2f56947e10e29864c0ab4f22733ca54d3b3a)
//   good-reserve head on main: fcd7b278558db9624f2b67a7cbe22c09f662bd32
//   files mirrored: packages/good-reserve/src/{viem-reserve-sdk,index,
//   capabilities,constants}.ts
//   Demo cross-reference (shows the same types in use, including the PPM
//   /10_000 scaling for reserveRatio/exitContribution pool fields):
//   https://github.com/GoodDollar/GoodSDKs/blob/main/apps/demo-reserve-swap/
//   src/components/ReserveSwap.tsx
//
// The package is an optionalDependency: it is not yet published to npm (and so
// is not present in this monorepo's lockfile). A static `import` would break
// `pnpm install`/build until it ships, so we use a typed lazy `import()` guarded
// by a try/catch. The types below are NOT a loose `any`/`unknown` shadow — they
// mirror the PR #35 public surface verbatim, so every adapter call site is
// type-checked against the actual SDK contract.
//
// When @goodsdks/good-reserve is published, the dynamic specifier resolves to
// the real module and these declarations can be replaced by a direct
// `import type { GoodReserveSDK, ReserveStats } from '@goodsdks/good-reserve'`
// — and the publish checklist below should be followed.
//
// Publish checklist (once the SDK ships to npm):
//   1. Pin the version in package.json optionalDependencies (e.g. "^0.1.0")
//      instead of the current "*" placeholder, matching how citizen-claim-widget
//      pins "@goodsdks/citizen-sdk".
//   2. Replace the mirrored types below with `import type` from the package.
// ---------------------------------------------------------------------------

/** Mirrors `ReserveStats` from PR #35 (`viem-reserve-sdk.ts`). */
export interface ReserveStats {
  goodDollarTotalSupply: bigint
  stableTokenDecimals: number
  goodDollarDecimals: number
  poolReserveBalance: bigint | null
  poolTokenSupply: bigint | null
  /** Mento reserve ratio in parts-per-million (0..1_000_000). */
  reserveRatio: number | null
  /** Mento exit contribution in parts-per-million (0..1_000_000). */
  exitContribution: number | null
}

/** Mirrors `ReserveTransactionResult` from PR #35. `receipt` is viem's TransactionReceipt. */
export interface ReserveTransactionResult {
  hash: `0x${string}`
  receipt: { transactionHash: `0x${string}` } & Record<string, unknown>
}

/** Optional submitted-hash callback, matching the SDK's 4th `onHash` argument. */
export type OnHash = (hash: `0x${string}`) => void

/**
 * Public instance surface of `GoodReserveSDK` (PR #35), narrowed to the methods
 * this widget uses. Argument order matches the SDK exactly:
 *  - getBuyQuote(tokenIn, amountIn)
 *  - getSellQuote(gdAmount, sellTo)   ← note: amount-first, token-second
 *  - buy(tokenIn, amountIn, minReturn, onHash?)
 *  - sell(sellTo, gdAmount, minReturn, onHash?)
 */
export interface GoodReserveSDKLike {
  getStableTokenAddress: () => `0x${string}`
  getGoodDollarAddress: () => `0x${string}`
  getReserveStats: () => Promise<ReserveStats>
  getBuyQuote: (tokenIn: `0x${string}`, amountIn: bigint) => Promise<bigint>
  getSellQuote: (gdAmount: bigint, sellTo: `0x${string}`) => Promise<bigint>
  buy: (
    tokenIn: `0x${string}`,
    amountIn: bigint,
    minReturn: bigint,
    onHash?: OnHash,
  ) => Promise<ReserveTransactionResult>
  sell: (
    sellTo: `0x${string}`,
    gdAmount: bigint,
    minReturn: bigint,
    onHash?: OnHash,
  ) => Promise<ReserveTransactionResult>
}

/** Mirrors the SDK constructor `new GoodReserveSDK(publicClient, walletClient, env)`. */
export type GoodReserveSDKConstructor = new (
  publicClient: unknown,
  walletClient: unknown,
  env: 'production' | 'development',
) => GoodReserveSDKLike

interface GoodReserveModule {
  GoodReserveSDK: GoodReserveSDKConstructor
}

// The specifier is held in a variable so bundlers treat it as a dynamic, code-split
// import rather than a hard dependency to resolve at build time. This keeps the
// build green while the package is an unpublished optionalDependency.
const SDK_SPECIFIER = '@goodsdks/good-reserve'

// Test/demo injection seam. When set, takes precedence over the real dynamic
// import so deterministic, CI-safe flows can exercise the full adapter
// (quote → confirm → buy/sell → success) without the published SDK or live
// RPCs. Production code never sets this.
let injectedConstructor: GoodReserveSDKConstructor | null = null

/** Inject a fake `GoodReserveSDK` constructor (tests/demos only). */
export function __setGoodReserveSdkConstructorForTesting(
  ctor: GoodReserveSDKConstructor | null,
): void {
  injectedConstructor = ctor
}

/**
 * Lazily loads the real `GoodReserveSDK` constructor. Returns `null` when the
 * package is not installed/published yet (the optionalDependency case), so the
 * adapter can surface an actionable message instead of crashing.
 */
export async function loadGoodReserveSdkConstructor(): Promise<GoodReserveSDKConstructor | null> {
  if (injectedConstructor) return injectedConstructor
  try {
    const mod = (await import(/* @vite-ignore */ SDK_SPECIFIER)) as Partial<GoodReserveModule>
    const ctor = mod.GoodReserveSDK
    return typeof ctor === 'function' ? ctor : null
  } catch {
    // Not installed/published yet, or failed to load — treated as "unavailable".
    return null
  }
}
