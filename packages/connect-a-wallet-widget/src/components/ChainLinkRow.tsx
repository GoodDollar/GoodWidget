import React from 'react'
import {
  AddressDisplay,
  Badge,
  BadgeText,
  ButtonText,
  ChainBadge,
  Spinner,
  Text,
  XStack,
  createComponent,
} from '@goodwidget/ui'
import type { ConnectAWalletChainLinkState } from '../widgetRuntimeContract'
import { chainLinkRowPresentation } from './format'
import { ActionButton, ChainRowCard } from './shared'

interface ChainLinkRowProps {
  row: ConnectAWalletChainLinkState
  address: `0x${string}`
  onConnect: () => void
  onDisconnect: () => void
}

const ChainAvatar = createComponent(XStack, {
  name: 'ChainAvatar',
  width: 28,
  height: 28,
  borderRadius: '$full',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$infoMuted',
})

/**
 * One row per supported chain. Always renders exactly one of Connect /
 * Disconnect (never hidden) with a Spinner while a status is in flight, per
 * Bounty Lead sign-off on the human-reviewer checklist.
 */
export function ChainLinkRow({ row, address, onConnect, onDisconnect }: ChainLinkRowProps) {
  const { actionLabel, isBusy, isDisabled } = chainLinkRowPresentation(row.status)
  const handlePress = actionLabel === 'Connect' ? onConnect : onDisconnect
  const isDisconnectAction = actionLabel === 'Disconnect'

  return (
    <ChainRowCard>
      <XStack alignItems="center" gap="$2">
        <ChainAvatar>
          <Text fontWeight="700" fontSize="$2" color="$primary">
            {row.chainName.charAt(0).toUpperCase()}
          </Text>
        </ChainAvatar>
        <ChainBadge chainId={row.chainId} name={row.chainName} />
      </XStack>
      <AddressDisplay address={address} size="sm" />
      <Badge type={row.status === 'connected' ? 'success' : 'info'}>
        <BadgeText>{row.status === 'checking' ? 'checking…' : row.status.replace('_', ' ')}</BadgeText>
      </Badge>
      <ActionButton
        onPress={handlePress}
        disabled={isDisabled}
        variant={isDisconnectAction ? 'outline' : 'primary'}
        borderColor={isDisconnectAction ? '$error' : undefined}
      >
        {isBusy ? (
          <Spinner size="sm" />
        ) : (
          <ButtonText color={isDisconnectAction ? '$error' : undefined}>{actionLabel}</ButtonText>
        )}
      </ActionButton>
    </ChainRowCard>
  )
}
