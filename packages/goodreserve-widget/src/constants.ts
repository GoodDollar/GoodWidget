// Supported reserve chains for this widget.
export const CELO_CHAIN_ID = 42220
export const XDC_CHAIN_ID = 50

// Stable token decimals and G$ decimals used by reserve quotes.
export const DEFAULT_STABLE_DECIMALS = 18
export const DEFAULT_GD_DECIMALS = 2

// Debounce used for quote requests while user edits amount.
export const QUOTE_DEBOUNCE_MS = 400

// How long a fetched quote is considered fresh enough to submit on-chain.
// Reserve prices move; a stale quote's minReturn could no longer be safe.
export const QUOTE_TTL_MS = 60_000

// Default slippage persisted in widget-local state.
export const DEFAULT_SLIPPAGE_PERCENT = 0.1

// Reserve chain guard list.
export const SUPPORTED_RESERVE_CHAINS = [CELO_CHAIN_ID, XDC_CHAIN_ID] as const
