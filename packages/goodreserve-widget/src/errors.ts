// Converts low-level reserve/viem errors into concise user-facing messages.
// Unmatched errors return a generic fallback (and are logged) so raw viem
// output — which can leak RPC URLs, contract addresses, or revert hex — is
// never surfaced directly in the UI.
//
// Coverage mirrors citizen-claim-widget's humanReadableError (network/timeout/
// rejection/revert-reason handling) so both widgets behave consistently.
export function mapReserveError(err: unknown, fallback: string): string {
  // Always log the raw error for diagnostics, regardless of how it maps.
  console.error('[GoodReserveWidget]', err)

  const message = err instanceof Error ? err.message : String(err ?? fallback)
  const lower = message.toLowerCase()

  // User rejected / canceled in wallet (EIP-1193 4001 / ethers ACTION_REJECTED).
  if (
    lower.includes('user rejected') ||
    lower.includes('user denied') ||
    lower.includes('4001') ||
    lower.includes('action_rejected')
  ) {
    return 'Transaction canceled in wallet.'
  }

  // Network-level failures (fetch/connection issues).
  if (
    lower.includes('failed to fetch') ||
    lower.includes('http request failed') ||
    lower.includes('fetch failed') ||
    lower.includes('networkerror') ||
    lower.includes('net::err_') ||
    lower.includes('econnrefused') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout')
  ) {
    return 'Unable to reach the network. Check your connection and try again.'
  }

  // Timeout.
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'The request timed out. Please try again.'
  }

  if (lower.includes('insufficient funds')) return 'Insufficient funds for token amount or gas.'
  if (lower.includes('allowance')) return 'Insufficient allowance. Approve and try again.'
  if (lower.includes('slippage')) return 'Slippage too high. Increase tolerance or reduce trade size.'

  // Contract revert — try to extract a clean, sanitized reason before falling
  // back to a generic message (never surface raw revert hex / addresses).
  if (lower.includes('revert')) {
    const reasonMatch = message.match(/reason:\s*(.+?)(?:\n|$)/i)
    if (reasonMatch) {
      const reason = reasonMatch[1]
        .replace(/[^\x20-\x7E]/g, '')
        .trim()
        .slice(0, 80)
      if (reason) return `Swap reverted: ${reason}`
    }
    return 'Quote or swap reverted on-chain. Try a smaller amount.'
  }

  if (lower.includes('unsupported chain')) return 'Switch to Celo or XDC to continue.'
  if (lower.includes('cannot find package') || lower.includes('module not found')) {
    return 'GoodReserve SDK package is unavailable in this environment.'
  }

  return fallback
}
