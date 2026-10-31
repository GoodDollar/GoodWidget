import type { BridgeRequirement, BridgeRequirementType } from '@goodsdks/bridging-sdk'

// Converts low-level bridge/viem errors into concise user-facing messages.
// Unmatched errors return a generic fallback (and are logged) so raw viem
// output — which can leak RPC URLs, contract addresses, or revert hex — is
// never surfaced directly in the UI. Mirrors goodreserve-widget's errors.ts;
// duplicated rather than shared per that file's own note on a future
// @goodwidget/core consolidation being a maintainer decision.

type ErrorMatcher = {
  match: readonly string[]
  message: string
}

const BRIDGE_ERROR_RULES: readonly ErrorMatcher[] = [
  {
    match: ['user rejected', 'user denied', '4001', 'action_rejected'],
    message: 'Transaction canceled in wallet.',
  },
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
  {
    match: ['timeout', 'timed out'],
    message: 'The request timed out. Please try again.',
  },
  { match: ['insufficient funds'], message: 'Insufficient funds for the transfer or gas.' },
  { match: ['allowance'], message: 'Insufficient allowance. Approve and try again.' },
  { match: ['unsupported chain', 'wrong chain'], message: 'Switch to a supported chain to continue.' },
]

export function mapBridgeError(err: unknown, fallback: string, context: 'other' | 'transaction' = 'other'): string {
  console.error('[BridgingWidget]', err)

  const message = err instanceof Error ? err.message : String(err ?? fallback)
  const lower = message.toLowerCase()

  for (const rule of BRIDGE_ERROR_RULES) {
    if (rule.match.some((needle) => lower.includes(needle))) return rule.message
  }

  if (context === 'transaction' && lower.includes('revert')) {
    return 'Bridge transaction reverted on-chain. Try a smaller amount.'
  }

  return fallback
}

// A quote can surface several unmet requirements at once (e.g. both below the
// minimum and over the daily limit); this priority order picks the one worth
// showing first — a blocked route or wrong chain masks every other reason,
// since fixing the amount wouldn't help until the route itself is valid.
const REQUIREMENT_PRIORITY: readonly BridgeRequirementType[] = [
  'wrong_chain',
  'route_unavailable',
  'below_min_amount',
  'exceeds_limit',
  'insufficient_token_balance',
  'insufficient_native_balance',
  'insufficient_allowance',
]

export function primaryRequirementMessage(requirements: BridgeRequirement[]): string | null {
  if (requirements.length === 0) return null

  for (const type of REQUIREMENT_PRIORITY) {
    const match = requirements.find((requirement) => requirement.type === type)
    if (match) return match.message
  }

  return requirements[0].message
}
