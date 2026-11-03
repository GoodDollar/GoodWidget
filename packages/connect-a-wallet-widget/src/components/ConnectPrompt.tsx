import React from 'react'
import { ButtonText, Heading, Spinner, Text } from '@goodwidget/ui'
import { ActionButton, EmptyStateCard } from './shared'

interface ConnectPromptProps {
  isConnecting: boolean
  onConnect: () => void
}

export function ConnectPrompt({ isConnecting, onConnect }: ConnectPromptProps) {
  return (
    <EmptyStateCard>
      <Heading level={4} textAlign="center">
        Wallet not connected
      </Heading>
      <Text secondary center>
        Connect your wallet to link additional addresses to your GoodID.
      </Text>
      <ActionButton onPress={onConnect} disabled={isConnecting}>
        {isConnecting ? <Spinner size="sm" /> : <ButtonText>Connect Wallet</ButtonText>}
      </ActionButton>
    </EmptyStateCard>
  )
}
