import type { ConnectAWalletChainLinkStatus } from '../widgetRuntimeContract'

/**
 * Per-chain row button label and busy state. Extracted because every
 * ChainLinkRow needs the same status → (label, busy, disabled) mapping, and
 * getting it wrong would violate the "always show Connect or Disconnect,
 * never hide it" requirement confirmed by the Bounty Lead.
 */
export function chainLinkRowPresentation(status: ConnectAWalletChainLinkStatus): {
  actionLabel: 'Connect' | 'Disconnect'
  isBusy: boolean
  isDisabled: boolean
} {
  switch (status) {
    case 'connected':
      return { actionLabel: 'Disconnect', isBusy: false, isDisabled: false }
    case 'disconnecting':
      return { actionLabel: 'Disconnect', isBusy: true, isDisabled: true }
    case 'connecting':
      return { actionLabel: 'Connect', isBusy: true, isDisabled: true }
    case 'checking':
      return { actionLabel: 'Connect', isBusy: true, isDisabled: true }
    case 'not_connected':
    default:
      return { actionLabel: 'Connect', isBusy: false, isDisabled: false }
  }
}
