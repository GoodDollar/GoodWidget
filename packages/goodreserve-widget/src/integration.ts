import { CELO_CHAIN_ID, XDC_CHAIN_ID } from '@goodsdks/good-reserve'

export const goodReserveWidgetIntegration = {
  id: 'goodreserve-swap',
  sdk: '@goodsdks/good-reserve',
  uses: ['getBuyQuote', 'getSellQuote', 'buy', 'sell', 'getReserveStats'],
  chains: [CELO_CHAIN_ID, XDC_CHAIN_ID],
  states: [
    'no_provider',
    'unsupported_chain',
    'sdk_initializing',
    'idle',
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
