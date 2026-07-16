import React from 'react'
import { Button, ButtonText, Card, Input, Spinner, Text, XStack, YStack } from '@goodwidget/ui'
import type { BuyGdWidgetAdapterResult } from './widgetRuntimeContract'

function OnramperFrame({ url }: { url: string }) {
  return (
    <Card bordered data-testid="BuyGdWidget-onramper-frame">
      <iframe
        data-testid="BuyGdWidget-onramper-iframe"
        src={url}
        title="Onramper fiat onramp"
        style={{ width: '100%', minHeight: 420, border: 0, borderRadius: 12 }}
      />
    </Card>
  )
}

export function BuyGdView({
  adapter,
  onramperUrl,
}: {
  adapter: BuyGdWidgetAdapterResult
  onramperUrl: string
}) {
  const { state, actions } = adapter

  return (
    <YStack data-testid="BuyGdWidget-root" width="100%" maxWidth={420} gap="$4">
      <Card bordered data-testid="BuyGdWidget-shell">
        <YStack gap="$3">
          <Text variant="title">Buy G$</Text>
          <Text secondary>Buy G$ with fiat using Onramper and finalize conversion on Celo.</Text>

          <XStack gap="$2" alignItems="center">
            <Input
              value={state.fiatAmount}
              onChangeText={actions.setFiatAmount}
              aria-label="Fiat amount"
              placeholder="100"
            />
            <Input
              value={state.currency}
              onChangeText={actions.setCurrency}
              aria-label="Fiat currency"
              placeholder="USD"
            />
          </XStack>

          <Input
            value={state.stableMinAmount}
            onChangeText={actions.setStableMinAmount}
            aria-label="Minimum stable amount"
            placeholder="0"
          />

          {state.status === 'no_wallet' && (
            <>
              <Text color="$warning">Connect a wallet to continue.</Text>
              <Button onPress={() => void actions.connect()} data-testid="BuyGdWidget-connect-cta">
                <ButtonText>Connect Wallet</ButtonText>
              </Button>
            </>
          )}

          {state.status !== 'no_wallet' && (
            <Button onPress={actions.openOnramper} data-testid="BuyGdWidget-open-onramper-cta">
              <ButtonText>Open Onramper</ButtonText>
            </Button>
          )}

          {state.status === 'onramper' && (
            <Button onPress={() => void actions.startBuy()} data-testid="BuyGdWidget-start-buy-cta">
              <ButtonText>I completed Onramper - convert to G$</ButtonText>
            </Button>
          )}

          {(state.status === 'loading' || state.status === 'transaction_pending') && (
            <XStack gap="$2" alignItems="center">
              <Spinner />
              <Text>
                {state.status === 'loading' ? 'Preparing transaction…' : 'Transaction pending…'}
              </Text>
            </XStack>
          )}

          {state.status === 'success' && (
            <YStack gap="$2" data-testid="BuyGdWidget-success-state">
              <Text color="$success">Success! G$ was sent to your wallet.</Text>
              {state.txHash && <Text secondary>Transaction: {state.txHash}</Text>}
            </YStack>
          )}

          {state.status === 'error' && (
            <YStack gap="$2" data-testid="BuyGdWidget-error-state">
              <Text color="$error">{state.error ?? 'Buy flow failed.'}</Text>
              <XStack gap="$2">
                <Button onPress={actions.retry} data-testid="BuyGdWidget-retry-cta">
                  <ButtonText>Retry</ButtonText>
                </Button>
                <Button onPress={() => void actions.refresh()} data-testid="BuyGdWidget-refresh-cta">
                  <ButtonText>Refresh</ButtonText>
                </Button>
              </XStack>
            </YStack>
          )}
        </YStack>
      </Card>

      {state.status === 'onramper' && <OnramperFrame url={onramperUrl} />}
    </YStack>
  )
}
