export const buyGdWidgetIntegration = {
  id: 'buy-gd',
  capabilitySource: 'buyGdCapabilities',
  uses: ['onramper', 'createAndSwap', 'swapStatus'],
  chains: [42220],
  states: ['idle', 'loading', 'onramper', 'transaction_pending', 'success', 'error', 'no_wallet'],
  events: ['buy-success', 'buy-error'],
} as const

export type BuyGdWidgetIntegration = typeof buyGdWidgetIntegration
