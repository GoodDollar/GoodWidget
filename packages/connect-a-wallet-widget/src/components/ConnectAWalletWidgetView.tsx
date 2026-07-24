import React from 'react'
import { Alert, ButtonText, Heading, Spinner } from '@goodwidget/ui'
import type { ConnectAWalletWidgetAdapterResult } from '../widgetRuntimeContract'
import { AddressLinkForm } from './AddressLinkForm'
import { ChainLinkRow } from './ChainLinkRow'
import { ActionButton, EmptyStateCard, WidgetContent } from './shared'
import { WalletGate } from './WalletGate'

interface ConnectAWalletWidgetViewProps {
  adapter: ConnectAWalletWidgetAdapterResult
  'data-testid'?: string
}

export function ConnectAWalletWidgetView({
  adapter,
  'data-testid': dataTestId = 'connect-a-wallet-widget',
}: ConnectAWalletWidgetViewProps) {
  const { state, actions } = adapter

  if (!state.isWalletConnected) {
    return (
      <WidgetContent data-testid={dataTestId}>
        <WalletGate
          isWalletConnected={state.isWalletConnected}
          isConnecting={state.status === 'connecting'}
          onConnect={actions.connectWallet}
        />
      </WidgetContent>
    )
  }

  return (
    <WidgetContent data-testid={dataTestId}>
      {!state.isActiveChainSupported && (
        <Alert
          type="warning"
          title="Unsupported network"
          message="Your wallet is on a network this widget doesn't support yet. Connecting or disconnecting a chain below will prompt a network switch automatically."
        />
      )}

      {state.status === 'error' && (
        <EmptyStateCard>
          <Heading level={5} textAlign="center">
            Couldn't load link status
          </Heading>
          <Alert type="error" message={state.error ?? 'Something went wrong.'} />
          <ActionButton onPress={actions.checkSecondaryAddress}>
            <ButtonText>Retry</ButtonText>
          </ActionButton>
        </EmptyStateCard>
      )}

      {state.status !== 'error' && (
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
          {state.chainLinks.map((row) => (
            <ChainLinkRow
              key={row.chainId}
              row={row}
              address={state.secondaryAddress as `0x${string}`}
              onConnect={() => actions.connectChain(row.chainId)}
              onDisconnect={() => actions.disconnectChain(row.chainId)}
            />
          ))}
        </>
      )}
    </WidgetContent>
  )
}
