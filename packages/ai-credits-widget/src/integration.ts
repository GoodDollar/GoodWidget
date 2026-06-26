export const aiCreditsIntegration = {
  id: 'ai-credits',
  /** Payer chain — Celo mainnet */
  chains: [42220],
  /** Settlement chain — Base mainnet (credits land here) */
  settlementChains: [8453],
  states: [
    'disconnected',
    'connected_empty',
    'quote_ready',
    'payment_pending',
    'payment_confirmed',
    'has_credits',
    'usage_empty',
    'usage_active',
    'insufficient_g_balance',
    'insufficient_ai_credits',
    'payment_failed',
    'backend_unavailable',
    'unsupported_chain',
  ],
  events: ['pay-success', 'pay-error'],
} as const

export type AiCreditsIntegration = typeof aiCreditsIntegration
