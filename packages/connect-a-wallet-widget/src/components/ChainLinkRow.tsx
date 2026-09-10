import React from 'react'
import { AddressDisplay, Badge, BadgeText, ButtonText, ChainBadge, Spinner } from '@goodwidget/ui'
import type { ConnectAWalletChainLinkState } from '../widgetRuntimeContract'
import { chainLinkRowPresentation } from './format'
import { ActionButton, ChainRowCard } from './shared'

interface ChainLinkRowProps {
  row: ConnectAWalletChainLinkState
  address: `0x${string}`
  onConnect: () => void
  onDisconnect: () => void
}

/**
 * One row per supported chain. Always renders exactly one of Connect /
 * Disconnect (never hidden) with a Spinner while a status is in flight, per
 * Bounty Lead sign-off on the human-reviewer checklist.
 */
export function ChainLinkRow({ row, address, onConnect, onDisconnect }: ChainLinkRowProps) {
  const { actionLabel, isBusy, isDisabled } = chainLinkRowPresentation(row.status)
  const handlePress = actionLabel === 'Connect' ? onConnect : onDisconnect

  return (
    <ChainRowCard>
      <ChainBadge chainId={row.chainId} name={row.chainName} />
      <AddressDisplay address={address} size="sm" />
      <Badge type={row.status === 'connected' ? 'success' : 'info'}>
        <BadgeText>{row.status === 'checking' ? 'checking…' : row.status.replace('_', ' ')}</BadgeText>
      </Badge>
      <ActionButton
        onPress={handlePress}
        disabled={isDisabled}
        variant={actionLabel === 'Disconnect' ? 'outline' : 'primary'}
      >
        {isBusy ? <Spinner size="sm" /> : <ButtonText>{actionLabel}</ButtonText>}
      </ActionButton>
    </ChainRowCard>
  )
}
