// Chain ids and SDK support derivation come from @goodsdks/good-reserve (re-
// exported here so callers don't need to depend on the SDK directly for type-
// only references). Re-exporting keeps the widget's public surface stable while
// making the SDK the single source of truth for these values.
export { CELO_CHAIN_ID, XDC_CHAIN_ID, getReserveChainFromId } from '@goodsdks/good-reserve'

// Stable token decimals and G$ decimals used by reserve quotes. These are
// fallbacks only — the SDK's getReserveStats() returns real values at runtime
// for both XDC (USDC = 6) and Celo (USDm = 18).
export const DEFAULT_STABLE_DECIMALS = 18
export const DEFAULT_GD_DECIMALS = 2

// Debounce used for quote requests while user edits amount.
export const QUOTE_DEBOUNCE_MS = 400

// How long a fetched quote is considered fresh enough to submit on-chain.
// Reserve prices move; a stale quote's minReturn could no longer be safe.
export const QUOTE_TTL_MS = 60_000

// Default slippage persisted in widget-local state.
export const DEFAULT_SLIPPAGE_PERCENT = 0.1