export const goodReserveWidgetIntegration = {
  id: 'goodreserve-swap',
  sdk: '@goodsdks/good-reserve',
  capabilitySource: 'goodReserveSdkCapabilities',
  uses: ['getBuyQuote', 'getSellQuote', 'buy', 'sell', 'getReserveStats'],
  chains: [42220, 50],
  states: [
    'no_provider',
    'unsupported_chain',
    'sdk_initializing',
    'idle_buy',
    'amount_editing',
    'quote_loading',
    'quote_ready',
    'quote_error',
    'insufficient_balance',
    'slippage_selection',
    'confirm_dialog',
    'swap_pending',
    'swap_success',
    'swap_error',
  ],
  events: ['swap-success', 'swap-error'],
} as const

export type GoodReserveWidgetIntegration = typeof goodReserveWidgetIntegration
