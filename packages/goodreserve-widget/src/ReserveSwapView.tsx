import React from 'react'
import {
  Button,
  ButtonText,
  Card,
  Heading,
  Input,
  Text,
  XStack,
  YStack,
  createComponent,
} from '@goodwidget/ui'
import type { ReserveSwapWidgetAdapterResult } from './widgetRuntimeContract'
import { CELO_CHAIN_ID } from './constants'

const SwapShell = createComponent(Card, {
  name: 'ReserveSwapShell',
  extends: 'Card',
  padding: '$4',
  gap: '$3',
  borderRadius: '$4',
})

const AmountCard = createComponent(Card, {
  name: 'ReserveAmountCard',
  extends: 'Card',
  padding: '$3',
  gap: '$2',
  borderRadius: '$3',
})

interface ReserveSwapViewProps {
  adapter: ReserveSwapWidgetAdapterResult
}

// Renders the reserve swap states with GoodWalletV2-like structure for amount cards and CTA.
export function ReserveSwapView({ adapter }: ReserveSwapViewProps) {
  const { state, actions } = adapter

  const ctaDisabled =
    state.status === 'quote_loading' ||
    state.status === 'swap_pending' ||
    state.status === 'insufficient_balance' ||
    !state.inputAmount ||
    !state.quote

  const ctaLabel =
    state.status === 'swap_pending'
      ? 'Swapping...'
      : state.status === 'unsupported_chain'
        ? 'Switch Network'
        : state.status === 'no_provider'
          ? 'Connect Wallet'
          : 'Review Swap'

  return (
    <YStack data-testid="GoodReserveWidget-root" width={360} gap="$3">
      <SwapShell>
        <YStack alignItems="center" gap="$2">
          <Text variant="label">GoodReserve</Text>
          <Text variant="caption" secondary>
            Swap on {state.chainId === CELO_CHAIN_ID ? 'CELO' : 'XDC'}
          </Text>
          <Heading level={3}>Swap on CELO</Heading>
          <Text center secondary>
            Buy or sell GoodDollars using the reserve. Review quote, slippage, and liquidity before
            confirming.
          </Text>
        </YStack>

        <XStack gap="$2">
          <Button
            variant={state.direction === 'buy' ? 'primary' : 'secondary'}
            onPress={() => actions.setDirection('buy')}
          >
            <ButtonText>Buy</ButtonText>
          </Button>
          <Button
            variant={state.direction === 'sell' ? 'primary' : 'secondary'}
            onPress={() => actions.setDirection('sell')}
          >
            <ButtonText>Sell</ButtonText>
          </Button>
          <Button variant="ghost" onPress={actions.openSlippage}>
            <ButtonText>{state.slippagePercent}%</ButtonText>
          </Button>
        </XStack>

        <AmountCard>
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="label">Swap from</Text>
            <Button variant="ghost" size="sm" onPress={actions.setMaxAmount}>
              <ButtonText>MAX</ButtonText>
            </Button>
          </XStack>
          <XStack justifyContent="space-between" alignItems="center">
            <Text>{state.tokenInSymbol}</Text>
            <Text secondary>Balance: {state.tokenInBalance}</Text>
          </XStack>
          <Input
            keyboardType="decimal-pad"
            value={state.inputAmount}
            placeholder="0.00"
            onChangeText={actions.setInputAmount}
          />
        </AmountCard>

        <AmountCard>
          <Text variant="label">Swap to</Text>
          <XStack justifyContent="space-between" alignItems="center">
            <Text>{state.tokenOutSymbol}</Text>
            <Text secondary>{state.quote?.outputAmount ?? '0.00'}</Text>
          </XStack>
        </AmountCard>

        <YStack gap="$1">
          <XStack justifyContent="space-between">
            <Text variant="caption" secondary>
              Slippage tolerance
            </Text>
            <Text variant="caption">{state.slippagePercent}%</Text>
          </XStack>
          <XStack justifyContent="space-between">
            <Text variant="caption" secondary>
              Price
            </Text>
            <Text variant="caption">{state.quote?.price ?? '0.00000'} G$ per {state.tokenInSymbol}</Text>
          </XStack>
          <XStack justifyContent="space-between">
            <Text variant="caption" secondary>
              Price impact
            </Text>
            <Text variant="caption">{state.quote?.priceImpactPercent ?? '~0.00%'}</Text>
          </XStack>
          <XStack justifyContent="space-between">
            <Text variant="caption" secondary>
              Exit contribution
            </Text>
            <Text variant="caption">{state.quote?.exitContributionPercent ?? '0%'}</Text>
          </XStack>
          <XStack justifyContent="space-between">
            <Text variant="caption" secondary>
              Minimum received
            </Text>
            <Text variant="caption">{state.quote?.minimumReceived ?? '0.00'} {state.tokenOutSymbol}</Text>
          </XStack>
        </YStack>

        {state.warning && (
          <Text data-testid="GoodReserveWidget-warning" color="$warning">
            {state.warning}
          </Text>
        )}

        {state.error && (
          <Text data-testid="GoodReserveWidget-error" color="$error">
            {state.error}
          </Text>
        )}

        {state.status === 'swap_success' && state.txHash && (
          <Text data-testid="GoodReserveWidget-success" color="$success">
            Swap succeeded. Tx: {state.txHash}
          </Text>
        )}

        {state.status === 'slippage_selection' && (
          <XStack data-testid="GoodReserveWidget-slippage-sheet" gap="$2">
            {[0.1, 0.5, 1].map((option) => (
              <Button
                key={option}
                variant={state.slippagePercent === option ? 'primary' : 'secondary'}
                onPress={() => actions.setSlippagePercent(option)}
              >
                <ButtonText>{option}%</ButtonText>
              </Button>
            ))}
            <Button variant="ghost" onPress={actions.closeSlippage}>
              <ButtonText>Done</ButtonText>
            </Button>
          </XStack>
        )}

        {state.status === 'confirm_dialog' && (
          <Card data-testid="GoodReserveWidget-confirm-dialog" padding="$3">
            <YStack gap="$2">
              <Text variant="label">Confirm Swap</Text>
              <Text>
                {state.inputAmount} {state.tokenInSymbol} → {state.quote?.outputAmount ?? '0.00'}{' '}
                {state.tokenOutSymbol}
              </Text>
              <XStack gap="$2">
                <Button onPress={actions.executeSwap}>
                  <ButtonText>Confirm</ButtonText>
                </Button>
                <Button variant="secondary" onPress={actions.closeConfirm}>
                  <ButtonText>Cancel</ButtonText>
                </Button>
              </XStack>
            </YStack>
          </Card>
        )}

        <Button
          data-testid="GoodReserveWidget-primary-cta"
          disabled={ctaDisabled && state.status !== 'unsupported_chain' && state.status !== 'no_provider'}
          onPress={async () => {
            if (state.status === 'no_provider') {
              await actions.connect()
              return
            }
            if (state.status === 'unsupported_chain') {
              await actions.switchChain(CELO_CHAIN_ID)
              return
            }
            actions.openConfirm()
          }}
        >
          <ButtonText>{ctaLabel}</ButtonText>
        </Button>
      </SwapShell>

      <Card data-testid="GoodReserveWidget-faq" padding="$3">
        <YStack gap="$2">
          <Text variant="label">FAQ</Text>
          <Text secondary>What is USDm? A stable token used as reserve collateral on Celo.</Text>
        </YStack>
      </Card>
    </YStack>
  )
}
