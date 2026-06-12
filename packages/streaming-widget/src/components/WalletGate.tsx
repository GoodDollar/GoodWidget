import React from 'react'
import { Button, ButtonText, Heading, Text, XStack } from '@goodwidget/ui'
import { STREAMING_CHAINS } from '../widgetRuntimeContract'
import { EmptyStateCard } from './shared'

interface WalletGateProps {
  isConnected: boolean
  isWrongChain: boolean
  onConnect: () => void
  onSwitchChain: (chainId: number) => void
}

export function WalletGate({
  isConnected,
  isWrongChain,
  onConnect,
  onSwitchChain,
}: WalletGateProps) {
  if (!isConnected) {
    return (
      <EmptyStateCard>
        <Heading level={4} textAlign="center">
          Wallet not connected
        </Heading>
        <Text secondary center>
          Connect your wallet to view streams, pools, and balances.
        </Text>
        <Button onPress={onConnect}>
          <ButtonText>Connect Wallet</ButtonText>
        </Button>
      </EmptyStateCard>
    )
  }

  if (isWrongChain) {
    return (
      <EmptyStateCard>
        <Heading level={4} textAlign="center">
          Unsupported network
        </Heading>
        <Text secondary center>
          Switch to Celo or Base to use the streaming widget.
        </Text>
        <XStack gap="$2">
          <Button onPress={() => onSwitchChain(STREAMING_CHAINS.CELO)}>
            <ButtonText>Switch to Celo</ButtonText>
          </Button>
          <Button onPress={() => onSwitchChain(STREAMING_CHAINS.BASE)}>
            <ButtonText>Switch to Base</ButtonText>
          </Button>
        </XStack>
      </EmptyStateCard>
    )
  }

  return null
}
