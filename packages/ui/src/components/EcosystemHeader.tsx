import React from 'react'
import type { ReactNode } from 'react'
import { Stack, XStack, YStack } from 'tamagui'
import { ChainBadge } from '../components-test/ChainBadge'
import { Spinner } from '../components-test/Spinner'
import { Button, ButtonText } from './Button'
import { Icon } from './Icon'
import { Text } from './Text'

export interface EcosystemHeaderProps {
  title?: string
  address?: string | null
  chainId?: number
  chainName?: string
  onConnect?: () => void
  hideConnect?: boolean
  connecting?: boolean
  connectLabel?: string
  onWalletAction?: () => void
  walletActionLabel?: string
  walletControls?: ReactNode
  'data-testid'?: string
}

export function EcosystemHeader({
  title = 'GoodDollar Ecosystem', address, chainId, chainName, onConnect, hideConnect = false,
  connecting = false, connectLabel = 'Connect Wallet', onWalletAction,
  walletActionLabel = 'Wallet options', walletControls, 'data-testid': testId,
}: EcosystemHeaderProps) {
  const shortAddress = address && address.length > 10
    ? `${address.slice(0, 5)}…${address.slice(-3)}`
    : address
  return (
    <YStack width="100%" data-testid={testId}>
      <XStack minHeight={64} alignItems="center" justifyContent="space-between" gap="$2" paddingHorizontal="$4" paddingVertical="$2">
        <Text fontFamily="$heading" fontSize="$3" flexShrink={1} numberOfLines={2}>{title}</Text>
        <XStack alignItems="center" gap="$2" flexShrink={0}>
          {address ? (
            <>
              {chainId != null && <ChainBadge chainId={chainId} name={chainName} />}
              {walletControls ?? <XStack
                {...(onWalletAction ? {
                  tag: 'button' as const, type: 'button' as const, role: 'button' as const,
                  'aria-label': walletActionLabel, onPress: onWalletAction,
                } : { accessibilityLabel: `Connected wallet ${address}` })}
                alignItems="center"
                gap="$1"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$full"
                borderWidth={1}
                borderColor="$borderColor"
                backgroundColor="$backgroundTransparent"
                cursor={onWalletAction ? 'pointer' : undefined}
                focusStyle={{ outlineStyle: 'solid', outlineWidth: 2, outlineColor: '$borderColorFocus' }}
              >
                <Stack width={6} height={6} borderRadius="$full" backgroundColor="$success" />
                <Text fontSize="$1" numberOfLines={1}>{shortAddress}</Text>
                {onWalletAction && <Icon name="chevron-down" size="2xs" color="muted" />}
              </XStack>}
            </>
          ) : !hideConnect ? (
            <Button size="sm" onPress={onConnect} disabled={connecting || !onConnect} aria-busy={connecting}>
              {connecting && <Spinner size="sm" />}
              <ButtonText>{connectLabel}</ButtonText>
            </Button>
          ) : null}
        </XStack>
      </XStack>
      <Stack height={1} backgroundColor="$borderColor" />
    </YStack>
  )
}
