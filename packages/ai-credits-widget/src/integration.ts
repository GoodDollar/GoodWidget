export const aiCreditsIntegration = {
  id: 'ai-credits',
  chains: [42220],
  settlementChains: [8453],
  states: [
    'disconnected',
    'connecting',
    'purchase_setup',
    'quote_ready',
    'payment_pending',
    'payment_confirmed',
    'insufficient_g_balance',
    'payment_failed',
    'backend_unavailable',
    'unsupported_chain',
  ],
  events: ['pay-success', 'pay-error'],
} as const

export type AiCreditsIntegration = typeof aiCreditsIntegration
