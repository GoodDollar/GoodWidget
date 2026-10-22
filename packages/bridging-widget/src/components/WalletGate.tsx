import React from 'react'
import { ButtonText, Heading, Text, XStack } from '@goodwidget/ui'
import { BRIDGING_CHAINS } from '../widgetRuntimeContract'
import { ActionButton, EmptyStateCard } from './shared'

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
          Connect your wallet to bridge G$ between chains.
        </Text>
        <ActionButton onPress={onConnect}>
          <ButtonText>Connect Wallet</ButtonText>
        </ActionButton>
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
          Switch to a supported chain to use the bridging widget.
        </Text>
        <XStack gap="$2" flexWrap="wrap" justifyContent="center">
          <ActionButton onPress={() => onSwitchChain(BRIDGING_CHAINS.CELO)}>
            <ButtonText>Celo</ButtonText>
          </ActionButton>
          <ActionButton onPress={() => onSwitchChain(BRIDGING_CHAINS.ETHEREUM)}>
            <ButtonText>Ethereum</ButtonText>
          </ActionButton>
          <ActionButton onPress={() => onSwitchChain(BRIDGING_CHAINS.FUSE)}>
            <ButtonText>Fuse</ButtonText>
          </ActionButton>
          <ActionButton onPress={() => onSwitchChain(BRIDGING_CHAINS.XDC)}>
            <ButtonText>XDC</ButtonText>
          </ActionButton>
        </XStack>
      </EmptyStateCard>
    )
  }

  return null
}
