import type { ReserveSwapWidgetAdapterState } from '@goodwidget/goodreserve-widget'

// Deterministic reserve widget state fixtures used by Storybook and CI tests.
//
// Amounts deliberately carry full 18-decimal tails, because that is what
// formatUnits hands the adapter in production. Pre-rounded fixtures are what let
// the raw-precision display bug ship unnoticed, so the stories are only
// trustworthy design references if they carry the same ugly values the reserve
// really returns. The widget formats these for display; see formatTokenAmount.
export const reserveWidgetMockStates: Record<string, Partial<ReserveSwapWidgetAdapterState>> = {
  noProvider: {
    status: 'no_provider',
    hasProvider: false,
    chainId: null,
    address: null,
  },
  unsupportedChain: {
    status: 'unsupported_chain',
    hasProvider: true,
    chainId: 8453,
    address: '0x1111111111111111111111111111111111111111',
  },
  sdkInitializing: {
    status: 'sdk_initializing',
    hasProvider: true,
    chainId: 42220,
    address: '0x1111111111111111111111111111111111111111',
  },
  idleBuy: {
    status: 'idle',
    chainId: 42220,
    address: '0x1111111111111111111111111111111111111111',
    hasProvider: true,
    tokenInSymbol: 'USDm',
    tokenOutSymbol: 'G$',
    tokenInBalance: '120.457812345678901234',
    tokenOutBalance: '10340.223456789012345678',
    inputAmount: '',
    direction: 'buy',
  },
  amountEditing: {
    status: 'amount_editing',
    chainId: 42220,
    hasProvider: true,
    inputAmount: '25',
    tokenInBalance: '120.457812345678901234',
    tokenOutBalance: '10340.223456789012345678',
  },
  quoteLoading: {
    status: 'quote_loading',
    chainId: 42220,
    hasProvider: true,
    inputAmount: '25',
    tokenInBalance: '120.457812345678901234',
    tokenOutBalance: '10340.223456789012345678',
  },
  quoteReady: {
    status: 'quote_ready',
    chainId: 42220,
    hasProvider: true,
    inputAmount: '25',
    tokenInBalance: '120.457812345678901234',
    quote: {
      outputAmount: '108.249999999999994315',
      price: '4.33000',
      minimumReceived: '108.141749999999994372',
      priceImpactPercent: 'N/A',
      // Live Celo pool value: raw uint32 10_000_000 scaled by MAX_WEIGHT 1e8.
      exitContributionPercent: '10.00%',
    },
  },
  quoteError: {
    status: 'quote_error',
    chainId: 42220,
    hasProvider: true,
    inputAmount: '25',
    error: 'Reserve quote failed. Try again in a moment.',
  },
  // Stale-quote recovery: the confirm drawer sat open past the quote TTL, so the
  // widget bounced back and is re-quoting automatically. The notice must survive
  // the refetch rather than leaving the user on a dead disabled CTA.
  quoteRefreshing: {
    status: 'quote_loading',
    chainId: 42220,
    hasProvider: true,
    inputAmount: '25',
    tokenInBalance: '120.457812345678901234',
    warning: 'Quote refreshed — review the new amount before confirming.',
  },
  insufficientBalance: {
    status: 'insufficient_balance',
    chainId: 42220,
    hasProvider: true,
    inputAmount: '9999',
    tokenInBalance: '120.457812345678901234',
    warning: 'Input exceeds your available token balance.',
  },
  slippageSelection: {
    status: 'slippage_selection',
    chainId: 42220,
    hasProvider: true,
    slippagePercent: 0.5,
  },
  confirmDialog: {
    status: 'confirm_dialog',
    chainId: 42220,
    hasProvider: true,
    inputAmount: '25',
    quote: {
      outputAmount: '108.249999999999994315',
      price: '4.33000',
      minimumReceived: '108.141749999999994372',
      priceImpactPercent: 'N/A',
      exitContributionPercent: '10.00%',
    },
  },
  // ERC20 approval awaiting signature — the first of the two wallet prompts a
  // swap needs when the spender is not yet approved.
  approvalPending: {
    status: 'approval_pending',
    chainId: 42220,
    hasProvider: true,
    inputAmount: '25',
    tokenInSymbol: 'USDm',
    tokenOutSymbol: 'G$',
    quote: {
      outputAmount: '108.249999999999994315',
      price: '4.33000',
      minimumReceived: '108.141749999999994372',
      priceImpactPercent: 'N/A',
      exitContributionPercent: '10.00%',
    },
  },
  swapPending: {
    status: 'swap_pending',
    chainId: 42220,
    hasProvider: true,
    inputAmount: '25',
    quote: {
      outputAmount: '108.249999999999994315',
      price: '4.33000',
      minimumReceived: '108.141749999999994372',
      priceImpactPercent: 'N/A',
      exitContributionPercent: '10.00%',
    },
  },
  swapSuccess: {
    status: 'swap_success',
    chainId: 42220,
    hasProvider: true,
    tokenOutSymbol: 'G$',
    tokenOutBalance: '12500.987654321098765432',
    // Post-swap reality: quote is cleared and the received amount is preserved
    // in lastSwapOutput (distinct from the wallet balance).
    lastSwapOutput: '10230.456789012345678901',
    quote: null,
    txHash: '0xabc1230000000000000000000000000000000000000000000000000000000000',
  },
  swapError: {
    status: 'swap_error',
    chainId: 42220,
    hasProvider: true,
    error: 'Swap reverted due to reserve limits.',
  },
  sellQuoteReady: {
    status: 'quote_ready',
    chainId: 42220,
    hasProvider: true,
    direction: 'sell',
    tokenInSymbol: 'G$',
    tokenOutSymbol: 'USDm',
    tokenInBalance: '300.123456789012345678',
    tokenOutBalance: '84.005678901234567890',
    inputAmount: '40',
    quote: {
      outputAmount: '8.923099999999999876',
      price: '0.22308',
      minimumReceived: '8.914176899999999877',
      priceImpactPercent: 'N/A',
      exitContributionPercent: '10.00%',
    },
  },
  // Buy-ready state on XDC (chain 50) — exercises the dynamic network label and
  // the USDC stable-token symbol used on XDC.
  xdcQuoteReady: {
    status: 'quote_ready',
    chainId: 50,
    hasProvider: true,
    direction: 'buy',
    tokenInSymbol: 'USDC',
    tokenOutSymbol: 'G$',
    tokenInBalance: '500.123456',
    tokenOutBalance: '0.00',
    inputAmount: '50',
    quote: {
      outputAmount: '216.499999999999988630',
      price: '4.33000',
      minimumReceived: '216.283499999999988619',
      priceImpactPercent: 'N/A',
      exitContributionPercent: '10.00%',
    },
  },
}
