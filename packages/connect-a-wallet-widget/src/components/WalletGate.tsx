import React from 'react'
import { ConnectPrompt } from './ConnectPrompt'

interface WalletGateProps {
  isWalletConnected: boolean
  isConnecting: boolean
  onConnect: () => void
}

/**
 * Gates the widget on host-wallet connection only. Unsupported-chain
 * handling is intentionally NOT gated here — per Bounty Lead sign-off it is
 * a non-blocking warning shown alongside the per-chain rows, since a
 * connected wallet on an unsupported chain can still switch chains inline
 * from each row's connect/disconnect action.
 */
export function WalletGate({ isWalletConnected, isConnecting, onConnect }: WalletGateProps) {
  if (!isWalletConnected) {
    return <ConnectPrompt isConnecting={isConnecting} onConnect={onConnect} />
  }

  return null
}
