// Converts low-level reserve/viem errors into concise user-facing messages.
// Unmatched errors return a generic fallback (and are logged) so raw viem
// output — which can leak RPC URLs, contract addresses, or revert hex — is
// never surfaced directly in the UI.
//
// Coverage mirrors citizen-claim-widget's humanReadableError (network/timeout/
// rejection/revert-reason handling) so both widgets behave consistently. A
// future consolidation to a shared @goodwidget/core util is a maintainer
// decision; for now the duplication is intentional, small, and aligned.

type ErrorMatcher = {
  /** Substrings (lowercased) that, if any match the error message, trigger this rule. */
  match: readonly string[]
  /** User-facing message returned when this rule matches. */
  message: string
}

// Ordered most-specific first; the first match wins. The list is read-only so
// callers can't mutate it at runtime.
const RESERVE_ERROR_RULES: readonly ErrorMatcher[] = [
  // User rejected / canceled in wallet (EIP-1193 4001 / ethers ACTION_REJECTED).
  {
    match: ['user rejected', 'user denied', '4001', 'action_rejected'],
    message: 'Transaction canceled in wallet.',
  },
  // Network-level failures (fetch/connection issues).
  {
    match: [
      'failed to fetch',
      'http request failed',
      'fetch failed',
      'networkerror',
      'net::err_',
      'econnrefused',
      'econnreset',
      'etimedout',
    ],
    message: 'Unable to reach the network. Check your connection and try again.',
  },
  // Timeout.
  {
    match: ['timeout', 'timed out'],
    message: 'The request timed out. Please try again.',
  },
  // On-chain revert — extract a clean, sanitized reason before falling back to
  // a generic message (never surface raw revert hex / addresses).
  {
    match: ['revert'],
    message: 'Quote or swap reverted on-chain. Try a smaller amount.',
  },
  // Reserve-specific: wallet gas, ERC20 allowance, slippage, missing SDK.
  { match: ['insufficient funds'], message: 'Insufficient funds for token amount or gas.' },
  { match: ['allowance'], message: 'Insufficient allowance. Approve and try again.' },
  { match: ['slippage'], message: 'Slippage too high. Increase tolerance or reduce trade size.' },
  { match: ['unsupported chain'], message: 'Switch to Celo or XDC to continue.' },
  {
    match: ['cannot find package', 'module not found'],
    message: 'GoodReserve SDK package is unavailable in this environment.',
  },
]

// Extracts a sanitized revert reason (e.g. "execution reverted: amount too low")
// from a viem-style error message, capped at 80 chars with non-printables
// stripped. Returns null if no clean reason is found.
function extractRevertReason(message: string): string | null {
  const reasonMatch = message.match(/reason:\s*(.+?)(?:\n|$)/i)
  if (!reasonMatch) return null
  const reason = reasonMatch[1].replace(/[^\x20-\x7E]/g, '').trim().slice(0, 80)
  return reason || null
}

export function mapReserveError(err: unknown, fallback: string): string {
  // Always log the raw error for diagnostics, regardless of how it maps.
  console.error('[GoodReserveWidget]', err)

  const message = err instanceof Error ? err.message : String(err ?? fallback)
  const lower = message.toLowerCase()

  for (const rule of RESERVE_ERROR_RULES) {
    if (rule.match.some((needle) => lower.includes(needle))) {
      // Special-case revert: try to extract a clean reason, otherwise use the
      // generic revert message.
      if (rule.match[0] === 'revert') {
        const reason = extractRevertReason(message)
        if (reason) return `Swap reverted: ${reason}`
      }
      return rule.message
    }
  }

  return fallback
}
