// Converts low-level reserve/viem errors into concise user-facing messages.
export function mapReserveError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : String(err ?? fallback)
  const lower = message.toLowerCase()

  if (lower.includes('user rejected')) return 'Transaction canceled in wallet.'
  if (lower.includes('insufficient funds')) return 'Insufficient funds for token amount or gas.'
  if (lower.includes('allowance')) return 'Insufficient allowance. Approve and try again.'
  if (lower.includes('slippage')) return 'Slippage too high. Increase tolerance or reduce trade size.'
  if (lower.includes('revert')) return 'Quote or swap reverted on-chain. Try a smaller amount.'
  if (lower.includes('unsupported chain')) return 'Switch to Celo or XDC to continue.'
  if (lower.includes('cannot find package') || lower.includes('module not found')) {
    return 'GoodReserve SDK package is unavailable in this environment.'
  }

  return message || fallback
}
