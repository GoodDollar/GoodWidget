import type { BuyGdWidgetState } from '@goodwidget/buy-gd-widget'

export const buyGdWidgetMockStates: Record<string, Partial<BuyGdWidgetState>> = {
  noWallet: {
    status: 'no_wallet',
    hasProvider: false,
    chainId: null,
    address: null,
  },
  idle: {
    status: 'idle',
    hasProvider: true,
    chainId: 42220,
    address: '0x1111111111111111111111111111111111111111',
    fiatAmount: '100',
    stableMinAmount: '0',
    currency: 'USD',
  },
  loading: {
    status: 'loading',
    hasProvider: true,
    chainId: 42220,
    address: '0x1111111111111111111111111111111111111111',
  },
  onramper: {
    status: 'onramper',
    hasProvider: true,
    chainId: 42220,
    address: '0x1111111111111111111111111111111111111111',
    fiatAmount: '120',
    currency: 'EUR',
  },
  transactionPending: {
    status: 'transaction_pending',
    hasProvider: true,
    chainId: 42220,
    address: '0x1111111111111111111111111111111111111111',
    txHash: '0xabc1230000000000000000000000000000000000000000000000000000000000',
  },
  success: {
    status: 'success',
    hasProvider: true,
    chainId: 42220,
    address: '0x1111111111111111111111111111111111111111',
    txHash: '0xabc1230000000000000000000000000000000000000000000000000000000000',
  },
  error: {
    status: 'error',
    hasProvider: true,
    chainId: 42220,
    address: '0x1111111111111111111111111111111111111111',
    error: 'Onramper payout failed. Retry the buy flow.',
  },
}
