import React from 'react'
import {
  AddressDisplay,
  Alert,
  Button,
  ButtonText,
  Card,
  Heading,
  Icon,
  Spinner,
  Stack,
  Text,
  XStack,
  YStack,
} from '@goodwidget/ui'
import type { ConnectAWalletWidgetAdapterResult } from '../widgetRuntimeContract'
import { AddressLinkForm } from './AddressLinkForm'
import { ChainLinkRow } from './ChainLinkRow'
import { PrimaryIdentityCard } from './PrimaryIdentityCard'
import { ActionButton, EmptyStateCard, WidgetContent } from './shared'
import { WalletGate } from './WalletGate'

const CHAIN_NAMES: Record<number, string> = {
  122: 'Fuse',
  42220: 'Celo',
  50: 'XDC',
}

interface ConnectAWalletWidgetViewProps {
  adapter: ConnectAWalletWidgetAdapterResult
  'data-testid'?: string
}

export function ConnectAWalletWidgetView({
  adapter,
  'data-testid': dataTestId = 'connect-a-wallet-widget',
}: ConnectAWalletWidgetViewProps) {
  const { state, actions } = adapter

  // Every widget in this repo renders its own "GoodDollar" + active-chain
  // header rather than relying on the host shell for it (see
  // StreamingWidgetView) — matches the #113 design reference's top bar.
  const header = (
    <YStack gap="$3" width="100%">
      <XStack justifyContent="space-between" alignItems="center" paddingHorizontal="$1">
        <Heading level={4} fontSize="$3">GoodDollar</Heading>
        {state.activeChainId && (
          <Stack
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$full"
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$backgroundHover"
          >
            <Text fontSize="$1" fontWeight="600" color="$color">
              {CHAIN_NAMES[state.activeChainId] ?? `Chain ${state.activeChainId}`}
            </Text>
          </Stack>
        )}
      </XStack>
      <YStack alignItems="center" width="100%" gap="$2">
        <Text fontSize="$2" fontWeight="600" color="$placeholderColor">
          Connect identity
        </Text>
        <Stack height={2} width="100%" backgroundColor="$primary" />
      </YStack>
    </YStack>
  )

  const infoCallout = (
    <XStack
      backgroundColor="$backgroundHover"
      padding="$4"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$borderColor"
      gap="$3"
      alignItems="flex-start"
    >
      <Icon name="info" size="sm" color="muted" marginTop="$0.5" />
      <YStack flex={1} gap="$1">
        <Text fontSize="$1" color="$placeholderColor" lineHeight="$3">
          You can connect multiple wallet addresses.
        </Text>
        <Text fontSize="$1" fontWeight="700" color="$color" lineHeight="$3">
          However, only one claim per day is available, shared between the connected accounts.
        </Text>
      </YStack>
    </XStack>
  )

  const footer = (
    <Text fontSize="$1" color="$placeholderColor" textAlign="center" paddingVertical="$2">
      Supported Networks: Celo, XDC, Fuse
    </Text>
  )

  if (!state.isWalletConnected) {
    return (
      <WidgetContent data-testid={dataTestId}>
        {header}
        <WalletGate
          isWalletConnected={state.isWalletConnected}
          isConnecting={state.status === 'connecting'}
          onConnect={actions.connectWallet}
        />
      </WidgetContent>
    )
  }

  const showForm = state.status !== 'error' && !(state.status === 'ready' && state.secondaryAddress)

  return (
    <WidgetContent data-testid={dataTestId}>
      {header}

      {infoCallout}

      <PrimaryIdentityCard walletAddress={state.walletAddress} />

      {!state.isActiveChainSupported && (
        <Alert
          type="warning"
          title="Unsupported network"
          message="Your wallet is on a network this widget doesn't support yet. Connecting or disconnecting a chain below will prompt a network switch automatically."
        />
      )}

      {state.status === 'error' && (
        <EmptyStateCard>
          <Heading level={6} fontSize="$1" textAlign="center">
            Couldn't load link status
          </Heading>
          <Alert type="error" message={state.error ?? 'Something went wrong.'} />
          <ActionButton onPress={actions.checkSecondaryAddress} size="sm">
            <ButtonText fontSize="$1">Retry</ButtonText>
          </ActionButton>
        </EmptyStateCard>
      )}

      {showForm && (
        <AddressLinkForm
          addressInput={state.secondaryAddressInput}
          isChecking={state.status === 'checking_address'}
          onChangeAddressInput={actions.setSecondaryAddressInput}
          onCheckAddress={actions.checkSecondaryAddress}
        />
      )}

      {state.status === 'checking_address' && (
        <EmptyStateCard>
          <Spinner size="md" />
        </EmptyStateCard>
      )}

      {state.status === 'ready' && state.secondaryAddress && (
        <>
          <XStack alignItems="center" justifyContent="space-between" marginBottom="$1">
            <Heading level={6} fontSize="$1">Linked address</Heading>
            <Button variant="text" size="sm" onPress={actions.changeSecondaryAddress}>
              <ButtonText fontSize="$1" color="$primary">Change address</ButtonText>
            </Button>
          </XStack>
          <XStack
            backgroundColor="$backgroundHover"
            padding="$3"
            borderRadius="$3"
            flexDirection="row"
            alignItems="center"
            gap="$4"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <YStack
              width={20}
              height={20}
              borderRadius="$full"
              backgroundColor="$successMuted"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
              marginLeft={3}
            >
              <Icon name="check" size="xs" color="success" />
            </YStack>
            <XStack flex={1} justifyContent="center">
              <AddressDisplay address={state.secondaryAddress} size="sm" copyable={false} truncate={true} />
            </XStack>
          </XStack>

          <Card padding="$0" borderRadius="$3" overflow="hidden" borderWidth={1} borderColor="$borderColor">
            {state.chainLinks.map((row) => (
              <ChainLinkRow
                key={row.chainId}
                row={row}
                onConnect={() => actions.connectChain(row.chainId)}
                onDisconnect={() => actions.disconnectChain(row.chainId)}
              />
            ))}
          </Card>
        </>
      )}

      {footer}
    </WidgetContent>
  )
}
