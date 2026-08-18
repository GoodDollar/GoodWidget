import React, { useState } from 'react'
import { ButtonText, Icon, Spinner, Stack, Text, XStack, YStack } from '@goodwidget/ui'
import type { ConnectAWalletChainLinkState } from '../widgetRuntimeContract'
import { chainLinkRowPresentation } from './format'
import { ActionButton } from './shared'

interface ChainLinkRowProps {
  row: ConnectAWalletChainLinkState
  onConnect: () => void
  onDisconnect: () => void
}

/**
 * One row per supported chain. Always renders exactly one of Connect /
 * Disconnect (never hidden) with a Spinner while a status is in flight, per
 * Bounty Lead sign-off on the human-reviewer checklist.
 */
export function ChainLinkRow({ row, onConnect, onDisconnect }: ChainLinkRowProps) {
  const { actionLabel, isBusy, isDisabled } = chainLinkRowPresentation(row.status)
  const handlePress = actionLabel === 'Connect' ? onConnect : onDisconnect
  const [disconnectHovered, setDisconnectHovered] = useState(false)

  // Map status to dot color and display text
  let dotColor = '$placeholderColor'
  let statusText = 'Not Connected'

  if (row.status === 'connected') {
    dotColor = '$success'
    statusText = 'Connected'
  } else if (row.status === 'connecting') {
    statusText = 'Connecting...'
  } else if (row.status === 'disconnecting') {
    statusText = 'Disconnecting...'
  } else if (row.status === 'checking') {
    statusText = 'Checking...'
  }

  const isDisconnect = actionLabel === 'Disconnect'

  return (
    <XStack
      padding="$4"
      alignItems="center"
      justifyContent="space-between"
      gap="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      flexWrap="wrap"
    >
      <XStack alignItems="center" gap="$2" flex={1} minWidth={0}>
        <Stack
          width={32}
          height={32}
          borderRadius="$full"
          backgroundColor="$backgroundPress"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <Text fontWeight="700" fontSize="$1" color="$color">
            {row.chainName.charAt(0)}
          </Text>
        </Stack>

        <YStack gap="$0.5" flex={1} minWidth={0}>
          <Text fontWeight="700" fontSize="$1" color="$color" numberOfLines={1}>
            {row.chainName}
          </Text>
          <XStack alignItems="center" gap="$1">
            <Stack width={5} height={5} borderRadius={3} backgroundColor={dotColor} flexShrink={0} />
            <Text fontSize="$1" fontWeight="600" color="$placeholderColor">
              {statusText}
            </Text>
          </XStack>
        </YStack>
      </XStack>

      {isBusy ? (
        <ActionButton
          disabled
          variant={isDisconnect ? 'outline' : 'primary'}
          borderColor={isDisconnect ? '$error' : undefined}
          paddingHorizontal="$3.5"
          flexShrink={0}
        >
          <Spinner size="sm" />
        </ActionButton>
      ) : isDisconnect ? (
        <ActionButton
          onPress={handlePress}
          disabled={isDisabled}
          variant="outline"
          borderColor="$error"
          hoverStyle={{ backgroundColor: '$error' }}
          onHoverIn={() => setDisconnectHovered(true)}
          onHoverOut={() => setDisconnectHovered(false)}
          paddingHorizontal="$2.5"
          paddingVertical="$1.5"
          flexShrink={0}
        >
          <XStack alignItems="center" gap="$1">
            <Icon name="unlink" size="xs" color={disconnectHovered ? 'white' : 'error'} />
            <ButtonText fontSize="$1" color={disconnectHovered ? '$white' : '$error'}>
              Disconnect
            </ButtonText>
          </XStack>
        </ActionButton>
      ) : (
        <ActionButton
          onPress={handlePress}
          disabled={isDisabled}
          variant="primary"
          paddingHorizontal="$2.5"
          paddingVertical="$1.5"
          flexShrink={0}
        >
          <XStack alignItems="center" gap="$1">
            <Icon name="link" size="xs" color="white" />
            <ButtonText fontSize="$1" color="$white">Connect</ButtonText>
          </XStack>
        </ActionButton>
      )}
    </XStack>
  )
}
