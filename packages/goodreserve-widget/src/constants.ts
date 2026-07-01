// Chain ids and SDK support derivation come from @goodsdks/good-reserve (re-
// exported here so callers don't need to depend on the SDK directly for type-
// only references). Re-exporting keeps the widget's public surface stable while
// making the SDK the single source of truth for these values.
import { CELO_CHAIN_ID, XDC_CHAIN_ID, getReserveChainFromId } from '@goodsdks/good-reserve'
export { CELO_CHAIN_ID, XDC_CHAIN_ID, getReserveChainFromId }

// G$ decimals fallback used before the SDK's getReserveStats() returns.
// G$: 18 decimal places on all supported Reserve chains (Celo, XDC).
// (G$ uses 2 decimals on Fuse only, but the GoodReserve is not deployed on Fuse).
export const DEFAULT_GD_DECIMALS = 18

// Chain-aware stable token decimals fallback.
// Celo  → USDm  → 18 decimals
// XDC   → USDC  →  6 decimals (verified on-chain: xdcscan.com)
// The canonical value is always read from SDK stats at runtime via getReserveStats().
export const getStableDecimals = (chainId: number | null): number =>
  chainId === XDC_CHAIN_ID ? 6 : 18

// Debounce used for quote requests while user edits amount.
export const QUOTE_DEBOUNCE_MS = 400

// How long a fetched quote is considered fresh enough to submit on-chain.
// Reserve prices move; a stale quote's minReturn could no longer be safe.
export const QUOTE_TTL_MS = 60_000

// Default slippage persisted in widget-local state.
export const DEFAULT_SLIPPAGE_PERCENT = 0.1