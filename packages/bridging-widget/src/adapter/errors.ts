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
    match: ['network switch canceled', 'network switch cancelled'],
    message: 'Network switch canceled in wallet.',
  },
  {
    match: ['user rejected', 'user denied', '4001', 'action_rejected'],
    message: 'Transaction canceled in wallet.',
  },
  {
    match: ['insufficient funds', 'exceeds the balance of the account', 'insufficient native balance'],
    message: 'Insufficient native balance for the bridge fee and transaction gas.',
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
  { match: ['allowance'], message: 'Insufficient allowance. Approve and try again.' },
  { match: ['unsupported chain', 'wrong chain'], message: 'Switch to a supported chain to continue.' },
]

export function isUserRejectedError(err: unknown): boolean {
  const code = typeof err === 'object' && err !== null && 'code' in err ? err.code : null
  const message = err instanceof Error ? err.message : String(err ?? '')
  const lower = message.toLowerCase()
  return code === 4001 || code === '4001' || code === 'ACTION_REJECTED' ||
    ['user rejected', 'user denied', 'action_rejected'].some((needle) => lower.includes(needle))
}

export function mapBridgeError(
  err: unknown,
  fallback: string,
  context: 'other' | 'transaction' = 'other',
  step: 'approving' | 'bridging' | null = null,
): string {
  console.error('[BridgingWidget]', err)
  if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'BRIDGE_CONFIRMATION_UNAVAILABLE') {
    return 'Bridge transaction was sent, but confirmation is unavailable. Check the source transaction before trying again.'
  }
  if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'BRIDGE_QUOTE_CHANGED') {
    return 'Bridge fees changed. Review the updated quote before confirming again.'
  }

  const messages: string[] = []
  const seen = new Set<unknown>()
  let current: unknown = err
  for (let depth = 0; current && depth < 8 && !seen.has(current); depth++) {
    seen.add(current)
    if (typeof current !== 'object') {
      messages.push(String(current))
      break
    }
    for (const key of ['message', 'shortMessage', 'details'] as const) {
      if (key in current && typeof current[key] === 'string') messages.push(current[key])
    }
    current = 'cause' in current ? current.cause : null
  }
  const lower = messages.join(' ').toLowerCase()

  for (const rule of BRIDGE_ERROR_RULES) {
    if (rule.match.some((needle) => lower.includes(needle))) return rule.message
  }

  if (context === 'transaction' && lower.includes('revert')) {
    if (step === 'approving') return 'Token approval failed on-chain. Please approve and try again.'
    if (step === 'bridging') return 'Bridge transaction reverted on-chain. Try a smaller amount.'
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
