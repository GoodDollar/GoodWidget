import React from 'react'
import { WalletChip } from '@goodwidget/ui'
import type { WalletChipProps } from '@goodwidget/ui'
import { useWallet } from './hooks'

export interface WalletControlsProps
  extends Pick<WalletChipProps, 'disabled' | 'size' | 'unavailableMessage'> {
  /** Runs after the session ends, for widgets that reset local view state. */
  onDisconnected?: () => void
}

/**
 * Wallet chip wired to the provider: address, disconnect, and whether
 * disconnecting is even possible all come from context, so a widget renders
 * `<WalletControls />` and passes nothing.
 *
 * This replaces the `hasDisconnectOverride` boolean that widgets used to thread
 * down from their host — `canDisconnect` now travels with the wallet state that
 * determines it.
 *
 * Renders nothing while disconnected; a connect affordance is the widget's own,
 * since where and how to prompt differs per widget.
 */
export function WalletControls({ onDisconnected, ...chipProps }: WalletControlsProps) {
  const { address, disconnect, canDisconnect, disconnectLabel, disconnectIcon } = useWallet()

  if (!address) return null

  return (
    <WalletChip
      {...chipProps}
      address={address}
      canDisconnect={canDisconnect}
      disconnectLabel={disconnectLabel}
      disconnectIcon={disconnectIcon}
      onDisconnect={
        canDisconnect
          ? async () => {
              await disconnect()
              onDisconnected?.()
            }
          : undefined
      }
    />
  )
}
