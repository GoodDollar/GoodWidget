import React from 'react'
import {
  Button,
  ButtonText,
  Card,
  Heading,
  Icon,
  Input,
  Separator,
  Spinner,
  Text,
  XStack,
  YStack,
  createComponent,
} from '@goodwidget/ui'
import type { ReserveSwapWidgetAdapterResult } from './widgetRuntimeContract'
import { CELO_CHAIN_ID, XDC_CHAIN_ID } from './constants'

// ---------------------------------------------------------------------------
// Named styled components — these participate in the component sub-theme system
// so integrators can target light_ReserveSwapShell, light_ReserveAmountCard, etc.
// Values are mapped onto existing GoodWalletV2 preset semantics rather than the
// raw Figma hex codes:
//   Figma #0c0e15 (card)        → $background
//   Figma #252730 (input cards) → $backgroundInput
//   Figma #33343c (token badge) → $backgroundInput
//   Figma #1e1f26 (FAQ surface) → $surface
//   Figma #1a85ff (CTA)         → $primary
//   Figma #8b91a0 (muted)       → $colorSoft
// ---------------------------------------------------------------------------

/** Outer swap card matching the dark reserve panel in the Figma reference. */
const SwapShell = createComponent(Card, {
  name: 'ReserveSwapShell',
  extends: 'Card',
  backgroundColor: '$background',
  borderColor: '$borderColor',
  padding: '$4',
  gap: '$3',
  borderRadius: '$6',
})

/** Swap-from / swap-to amount panels (Figma rounded input cards). */
const AmountCard = createComponent(Card, {
  name: 'ReserveAmountCard',
  extends: 'Card',
  backgroundColor: '$backgroundInput',
  borderWidth: 0,
  shadowOpacity: 0,
  padding: '$4',
  gap: '$1',
  borderRadius: '$4',
})

/** Circular token badge that fronts each amount panel. */
const TokenBadge = createComponent(XStack, {
  name: 'ReserveTokenBadge',
  width: 40,
  height: 40,
  borderRadius: '$full',
  backgroundColor: '$backgroundInput',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
})

/** Glowing circular success badge (Figma success hero icon). */
const SuccessIcon = createComponent(XStack, {
  name: 'ReserveSuccessIcon',
  width: 96,
  height: 96,
  borderRadius: '$full',
  backgroundColor: '$primary',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  shadowColor: '$primary',
  shadowRadius: 24,
  shadowOpacity: 1,
  shadowOffset: { width: 0, height: 0 },
})

const NETWORK_LABELS: Record<number, string> = {
  [CELO_CHAIN_ID]: 'CELO',
  [XDC_CHAIN_ID]: 'XDC',
}

// Resolves the readable network name for the supported reserve chains.
function networkLabel(chainId: number | null): string {
  return chainId !== null && NETWORK_LABELS[chainId] ? NETWORK_LABELS[chainId] : 'Unsupported'
}

interface ReserveSwapViewProps {
  adapter: ReserveSwapWidgetAdapterResult
}

// A single right-aligned key/value row inside the transaction details block.
function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <XStack justifyContent="space-between" alignItems="center">
      <Text variant="caption" tone="soft">
        {label}
      </Text>
      <Text variant="caption" color={valueColor ?? '$color'}>
        {value}
      </Text>
    </XStack>
  )
}

// Renders the reserve swap states with the GoodWalletV2 / Figma structure:
// header → from/to amount cards → transaction details → primary CTA → FAQ.
// Confirmation, pending, success and error states overlay the same shell.
export function ReserveSwapView({ adapter }: ReserveSwapViewProps) {
  const { state, actions } = adapter
  const network = networkLabel(state.chainId)

  const hasAmount = Boolean(state.inputAmount) && Number(state.inputAmount) > 0
  const isBlocked =
    state.status === 'no_provider' ||
    state.status === 'unsupported_chain' ||
    state.status === 'swap_pending'

  const ctaDisabled =
    !isBlocked &&
    (state.status === 'quote_loading' ||
      state.status === 'insufficient_balance' ||
      !hasAmount ||
      !state.quote)

  const ctaLabel =
    state.status === 'swap_pending'
      ? 'Swapping…'
      : state.status === 'no_provider'
        ? 'Connect Wallet'
        : state.status === 'unsupported_chain'
          ? 'Switch Network'
          : state.status === 'insufficient_balance'
            ? 'Insufficient Balance'
            : !hasAmount
              ? 'Enter Amount'
              : state.status === 'quote_loading'
                ? 'Fetching Quote…'
                : 'Review Swap'

  // Success state renders a dedicated celebration screen (Figma success frame):
  // glowing check hero → title → summary card → explorer link → primary CTA.
  if (state.status === 'swap_success') {
    return (
      <YStack
        testID="GoodReserveWidget-root"
        width="100%"
        maxWidth={390}
        alignSelf="center"
        gap="$6"
        alignItems="center"
      >
        <SwapShell width="100%" alignItems="center" gap="$5" paddingVertical="$7">
          <SuccessIcon>
            <Icon name="check" size="xl" color="text" />
          </SuccessIcon>

          <Heading level={5}>Swap Successful</Heading>

          <Card
            testID="GoodReserveWidget-success"
            backgroundColor="$surface"
            borderWidth={0}
            width="100%"
            padding="$4"
            gap="$2"
            alignItems="center"
          >
            <Text tone="soft">Final amount received</Text>
            <Text fontSize={21} fontWeight="700">
              {state.quote?.outputAmount ?? state.tokenOutBalance} {state.tokenOutSymbol}
            </Text>
          </Card>

          {state.txHash && (
            <XStack gap="$1" alignItems="center">
              <Text variant="caption" color="$primaryLight">
                View on Explorer
              </Text>
              <Icon name="external-link" size="2xs" color="primary" />
            </XStack>
          )}

          <Button
            fullWidth
            height={54}
            borderRadius="$full"
            onPress={() => actions.setDirection(state.direction)}
          >
            <ButtonText>Do another swap</ButtonText>
          </Button>
        </SwapShell>
      </YStack>
    )
  }

  return (
    <YStack
      testID="GoodReserveWidget-root"
      width="100%"
      maxWidth={390}
      alignSelf="center"
      gap="$3"
    >
      <SwapShell>
        {/* Header: network pill, blue title, supporting copy */}
        <YStack alignItems="center" gap="$2">
          <Button variant="pill" onPress={actions.openSlippage}>
            <ButtonText fontSize="$1" color="$colorSoft">
              Swap on {network}
            </ButtonText>
          </Button>
          <Heading level={4} color="$primary">
            Swap on {network}
          </Heading>
          <Text center tone="soft">
            Buy or sell GoodDollars on {network} using the GoodDollar Reserve. Take note of
            indicators below for price, slippage, and liquidity.
          </Text>
        </YStack>

        {/* Direction toggle */}
        <XStack gap="$2">
          <Button
            flex={1}
            variant={state.direction === 'buy' ? 'primary' : 'secondary'}
            onPress={() => actions.setDirection('buy')}
          >
            <ButtonText>Buy</ButtonText>
          </Button>
          <Button
            flex={1}
            variant={state.direction === 'sell' ? 'primary' : 'secondary'}
            onPress={() => actions.setDirection('sell')}
          >
            <ButtonText>Sell</ButtonText>
          </Button>
        </XStack>

        {/* Swap from */}
        <AmountCard>
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="caption" tone="soft">
              Swap from
            </Text>
            <XStack gap="$2" alignItems="center">
              <Text variant="caption" tone="soft">
                Balance: {state.tokenInBalance}
              </Text>
              <Button variant="pill" size="sm" onPress={actions.setMaxAmount}>
                <ButtonText fontSize="$1" color="$primary">
                  MAX
                </ButtonText>
              </Button>
            </XStack>
          </XStack>
          <XStack justifyContent="space-between" alignItems="center" gap="$3">
            <XStack gap="$2" alignItems="center" flexShrink={0}>
              <TokenBadge>
                <Text fontWeight="700">$</Text>
              </TokenBadge>
              <Text fontSize={21} fontWeight="700">
                {state.tokenInSymbol}
              </Text>
            </XStack>
            <Input
              flex={1}
              borderWidth={0}
              backgroundColor="$backgroundTransparent"
              textAlign="right"
              fontSize={28}
              fontWeight="700"
              keyboardType="decimal-pad"
              value={state.inputAmount}
              placeholder="0.00"
              onChangeText={actions.setInputAmount}
            />
          </XStack>
        </AmountCard>

        {/* Swap to */}
        <AmountCard>
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="caption" tone="soft">
              Swap to
            </Text>
            <Text variant="caption" tone="soft">
              Balance: {state.tokenOutBalance}
            </Text>
          </XStack>
          <XStack justifyContent="space-between" alignItems="center" gap="$3">
            <XStack gap="$2" alignItems="center" flexShrink={0}>
              <TokenBadge>
                <Text fontWeight="700">$</Text>
              </TokenBadge>
              <Text fontSize={21} fontWeight="700">
                {state.tokenOutSymbol}
              </Text>
            </XStack>
            {state.status === 'quote_loading' ? (
              <Spinner size="sm" />
            ) : (
              <Text fontSize={28} fontWeight="700" tone={state.quote ? 'default' : 'soft'}>
                {state.quote?.outputAmount ?? '0.00'}
              </Text>
            )}
          </XStack>
        </AmountCard>

        {/* Transaction details */}
        <YStack gap="$2" paddingHorizontal="$1">
          <Text variant="caption" tone="soft">
            Transaction Details
          </Text>
          <DetailRow label="SLIPPAGE TOLERANCE" value={`${state.slippagePercent}%`} />
          <DetailRow
            label="PRICE"
            value={`${state.quote?.price ?? '0.00000'} G$ per ${state.tokenInSymbol}`}
          />
          <DetailRow
            label="PRICE IMPACT"
            value={state.quote?.priceImpactPercent ?? '~0.00%'}
            valueColor="$success"
          />
          <DetailRow label="EXIT CONTRIBUTION" value={state.quote?.exitContributionPercent ?? '0%'} />
          <DetailRow
            label="MINIMUM RECEIVED"
            value={`${state.quote?.minimumReceived ?? '0.00'} ${state.tokenOutSymbol}`}
          />
        </YStack>

        {state.warning && (
          <Text testID="GoodReserveWidget-warning" color="$warning">
            {state.warning}
          </Text>
        )}

        {state.status === 'swap_error' && state.error && (
          <Text testID="GoodReserveWidget-error" color="$error">
            {state.error}
          </Text>
        )}

        {state.status === 'quote_error' && state.error && (
          <Text testID="GoodReserveWidget-error" color="$error">
            {state.error}
          </Text>
        )}

        {/* Slippage selection sheet */}
        {state.status === 'slippage_selection' && (
          <XStack testID="GoodReserveWidget-slippage-sheet" gap="$2" flexWrap="wrap">
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

        {/* Primary CTA — connect / switch / review / pending */}
        <Button
          testID="GoodReserveWidget-primary-cta"
          fullWidth
          height={54}
          borderRadius="$3"
          disabled={ctaDisabled}
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
          {state.status === 'swap_pending' ? (
            <XStack gap="$2" alignItems="center">
              <Spinner size="sm" color="$white" />
              <ButtonText>{ctaLabel}</ButtonText>
            </XStack>
          ) : (
            <ButtonText>{ctaLabel}</ButtonText>
          )}
        </Button>
      </SwapShell>

      {/* Confirmation drawer — uses a press-to-confirm button (slide-to-confirm
          in the reference is intentionally simplified per maintainer note). */}
      {state.status === 'confirm_dialog' && (
        <Card
          testID="GoodReserveWidget-confirm-dialog"
          backgroundColor="$surface"
          padding="$4"
          gap="$3"
        >
          <Heading level={4}>Confirm Swap</Heading>

          <Card backgroundColor="$background" borderWidth={0} padding="$4" gap="$1">
            <Text tone="soft">Minimum Received</Text>
            <Text fontSize={34} fontWeight="800">
              {state.quote?.minimumReceived ?? '0.00'}
            </Text>
            <Text fontWeight="600">{state.tokenOutSymbol}</Text>
          </Card>

          <YStack gap="$2">
            <DetailRow
              label="Exchange Rate"
              value={`1 ${state.tokenInSymbol} = ${state.quote?.price ?? '0'} ${state.tokenOutSymbol}`}
            />
            <DetailRow label="Max Slippage" value={`${state.slippagePercent}%`} />
            <DetailRow
              label="You Pay"
              value={`${state.inputAmount} ${state.tokenInSymbol}`}
            />
          </YStack>

          <Separator />

          <XStack gap="$2">
            <Button flex={1} variant="secondary" onPress={actions.closeConfirm}>
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button
              flex={2}
              testID="GoodReserveWidget-confirm-cta"
              onPress={actions.executeSwap}
            >
              <ButtonText>Confirm Swap</ButtonText>
            </Button>
          </XStack>
        </Card>
      )}

      {/* FAQ block */}
      <Card testID="GoodReserveWidget-faq" backgroundColor="$surface" padding="$4" gap="$2">
        <Text fontWeight="600">FAQ</Text>
        <Text variant="caption" tone="soft">
          What is {state.tokenInSymbol === 'G$' ? state.tokenOutSymbol : state.tokenInSymbol}?
        </Text>
        <Text tone="soft">
          A stablecoin used as reserve collateral. The GoodDollar Reserve operates as an automated
          market maker that prices G$ against the reserve token.
        </Text>
      </Card>
    </YStack>
  )
}
