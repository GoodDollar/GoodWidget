import React, { useState } from 'react'
import {
  Button,
  ButtonText,
  Card,
  Drawer,
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
// Figma reference palette (file xsk5EiF6CvStA9mtdbA9OR, page GoodReserve).
// The GoodWalletV2 preset tokens do not match these exact values (e.g. its
// $background is #13151C, $backgroundInput is #333333, $colorSoft is #CCC), and
// altering preset tokens is an "ask first" change that would affect every
// widget. So the reserve widget pins the Figma palette here and applies it
// through widget-scoped named components (component sub-themes), keeping raw hex
// out of the JSX and leaving the shared preset untouched.
// ---------------------------------------------------------------------------
const FIGMA = {
  card: '#0C0E15', // outer swap shell + confirm details table
  inputCard: '#252730', // swap-from / swap-to panels
  badge: '#33343C', // circular token badge + swap-direction button
  surface: '#1E1F26', // FAQ / confirm sheet / summary card
  surfaceInner: '#191B22', // confirm "minimum received" inner highlight
  heading: '#4090FF', // blue heading + MAX + direction icon
  text: '#E2E2EC', // primary text
  textMuted: '#8B91A0', // labels / subtitle
  textSecondary: '#C1C6D6', // success "final amount received" label
  accentSoft: '#AAC7FF', // "view on explorer" / slide thumb
  positive: '#43E350', // price impact
  cta: '#1A85FF', // primary action
  handle: '#414754', // drawer pull handle
} as const

// ---------------------------------------------------------------------------
// Named styled components — these participate in the component sub-theme system
// so integrators can still target light_ReserveSwapShell, light_ReserveAmountCard,
// etc. Colors are the exact Figma values above (widget-scoped, not preset tokens).
// ---------------------------------------------------------------------------

/** Outer swap card matching the dark reserve panel in the Figma reference. */
const SwapShell = createComponent(Card, {
  name: 'ReserveSwapShell',
  extends: 'Card',
  backgroundColor: FIGMA.card,
  borderColor: '$borderColor',
  padding: '$4',
  gap: '$3',
  borderRadius: '$6',
})

/** Swap-from / swap-to amount panels (Figma rounded input cards). */
const AmountCard = createComponent(Card, {
  name: 'ReserveAmountCard',
  extends: 'Card',
  backgroundColor: FIGMA.inputCard,
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
  backgroundColor: FIGMA.badge,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
})

/** Circular swap-direction (flip) button between the amount cards. */
const SwapDirectionButton = createComponent(XStack, {
  name: 'ReserveSwapDirectionButton',
  width: 40,
  height: 40,
  borderRadius: '$full',
  backgroundColor: FIGMA.badge,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  cursor: 'pointer',
  alignSelf: 'center' as const,
})

/** Glowing circular success badge (Figma success hero icon). */
const SuccessIcon = createComponent(XStack, {
  name: 'ReserveSuccessIcon',
  width: 96,
  height: 96,
  borderRadius: '$full',
  backgroundColor: FIGMA.cta,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  shadowColor: FIGMA.cta,
  shadowRadius: 24,
  shadowOpacity: 1,
  shadowOffset: { width: 0, height: 0 },
})

/** Small blue "to" token badge used in the confirm-drawer hero (Figma). */
const SuccessIconSmall = createComponent(XStack, {
  name: 'ReserveConfirmToBadge',
  width: 40,
  height: 40,
  borderRadius: '$full',
  backgroundColor: FIGMA.cta,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
})

const NETWORK_LABELS: Record<number, string> = {
  [CELO_CHAIN_ID]: 'CELO',
  [XDC_CHAIN_ID]: 'XDC',
}

// Resolves the readable network name for the supported reserve chains.
function networkLabel(chainId: number | null): string {
  return chainId !== null && NETWORK_LABELS[chainId] ? NETWORK_LABELS[chainId] : 'Unsupported'
}

// Keeps only digits and a single decimal point so the value is always safe to
// pass to viem's parseUnits (which throws on "1.2.3", "1e6", separators, etc.).
function sanitizeAmount(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}

interface ReserveSwapViewProps {
  adapter: ReserveSwapWidgetAdapterResult
}

// A single right-aligned key/value row inside the transaction details block.
// Figma: label 12/600 #8B91A0, value 16/500 #E2E2EC (price impact uses green).
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
      <Text fontSize={12} fontWeight="600" color={FIGMA.textMuted}>
        {label}
      </Text>
      <Text fontSize={16} fontWeight="500" color={valueColor ?? FIGMA.text}>
        {value}
      </Text>
    </XStack>
  )
}

// Collapsible disclosure with a chevron toggle (Figma: Transaction Details + FAQ
// both expand/collapse). Default-open so detail is visible without interaction.
function CollapsibleSection({
  title,
  testID,
  defaultOpen = true,
  children,
}: {
  title: string
  testID?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <YStack testID={testID} gap="$2">
      <XStack
        justifyContent="space-between"
        alignItems="center"
        cursor="pointer"
        onPress={() => setOpen((v) => !v)}
      >
        <Text fontSize={12} fontWeight="600" color={FIGMA.textMuted}>
          {title}
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size="xs" color="muted" />
      </XStack>
      {open && children}
    </YStack>
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

  // While the SDK/runtime mounts, show a centered loading state rather than a
  // half-populated swap card.
  if (state.status === 'sdk_initializing') {
    return (
      <YStack
        testID="GoodReserveWidget-root"
        width="100%"
        maxWidth={390}
        alignSelf="center"
      >
        <SwapShell alignItems="center" justifyContent="center" gap="$3" paddingVertical="$8">
          <Spinner size="lg" />
          <Text tone="soft">Connecting to the reserve…</Text>
        </SwapShell>
      </YStack>
    )
  }

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
          {/* Figma success order: title → summary card → explorer link → icon. */}
          <Heading level={3} fontSize={26} fontWeight="700" color={FIGMA.text}>
            Swap Successful
          </Heading>

          <Card
            testID="GoodReserveWidget-success"
            backgroundColor={FIGMA.surface}
            borderWidth={0}
            width="100%"
            padding="$4"
            gap="$2"
            alignItems="center"
          >
            <Text fontSize={16} fontWeight="400" color={FIGMA.textSecondary}>
              Final amount received
            </Text>
            <Text fontSize={21} fontWeight="700" color="#FFFFFF">
              {state.quote?.outputAmount ?? state.tokenOutBalance} {state.tokenOutSymbol}
            </Text>
          </Card>

          {state.txHash && (
            <XStack gap="$1" alignItems="center">
              <Text fontSize={12} fontWeight="600" color={FIGMA.accentSoft}>
                View on Explorer
              </Text>
              <Icon name="external-link" size="2xs" color="primary" />
            </XStack>
          )}

          <SuccessIcon>
            <Icon name="check" size="xl" color="text" />
          </SuccessIcon>

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

  const stableSymbol = state.tokenInSymbol === 'G$' ? state.tokenOutSymbol : state.tokenInSymbol

  return (
    <YStack
      testID="GoodReserveWidget-root"
      width="100%"
      maxWidth={390}
      alignSelf="center"
      gap="$3"
    >
      {/* Header sits ABOVE the dark card (Figma): network pill, blue title, copy. */}
      <YStack alignItems="center" gap="$2">
        <XStack
          borderWidth={1}
          borderColor="rgba(26,133,255,0.30)"
          borderRadius="$full"
          paddingHorizontal="$3"
          paddingVertical="$1"
          alignItems="center"
          gap="$1"
        >
          <Text fontSize={12} fontWeight="600" color={FIGMA.textMuted}>
            Swap on {network}
          </Text>
        </XStack>
        <Heading level={3} fontSize={28} fontWeight="700" color={FIGMA.heading}>
          Swap on {network}
        </Heading>
        <Text center fontSize={14} fontWeight="500" color={FIGMA.textMuted}>
          Buy or sell GoodDollars on {network} using the GoodDollar Reserve.
        </Text>
      </YStack>

      <SwapShell>
        {/* Swap from */}
        <AmountCard>
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={12} fontWeight="600" color={FIGMA.textMuted}>
              Swap from
            </Text>
            <XStack gap="$2" alignItems="center">
              <Text fontSize={12} fontWeight="600" color={FIGMA.textMuted}>
                Balance: {state.tokenInBalance}
              </Text>
              <Text
                testID="GoodReserveWidget-max"
                fontSize={12}
                fontWeight="600"
                color={FIGMA.heading}
                cursor="pointer"
                onPress={actions.setMaxAmount}
              >
                MAX
              </Text>
            </XStack>
          </XStack>
          <XStack justifyContent="space-between" alignItems="center" gap="$3">
            <XStack gap="$2" alignItems="center" flexShrink={0}>
              <TokenBadge>
                <Text fontSize={16} fontWeight="700" color={FIGMA.text}>
                  $
                </Text>
              </TokenBadge>
              <Text fontSize={21} fontWeight="700" color={FIGMA.text}>
                {state.tokenInSymbol}
              </Text>
            </XStack>
            <Input
              flex={1}
              borderWidth={0}
              backgroundColor="$backgroundTransparent"
              fontSize={34}
              fontWeight="700"
              color={FIGMA.text}
              // Web: the @goodwidget/ui Input is a Tamagui `tag:'input'` Stack which
              // does not translate RN's onChangeText to the DOM, so wire the native
              // onChange and sanitize to a single decimal number at the boundary.
              // textAlign is applied via style (DOM-valid) rather than the RN prop,
              // which Tamagui would otherwise emit as an invalid `textalign` attr.
              inputMode="decimal"
              style={{ textAlign: 'right' }}
              value={state.inputAmount}
              placeholder="0.00"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                actions.setInputAmount(sanitizeAmount(event.target.value))
              }
            />
          </XStack>
        </AmountCard>

        {/* Single circular swap-direction (flip) button between the cards. */}
        <SwapDirectionButton
          testID="GoodReserveWidget-swap-direction"
          onPress={() => actions.setDirection(state.direction === 'buy' ? 'sell' : 'buy')}
        >
          <Icon name="arrow-down" size="sm" color="primary" />
        </SwapDirectionButton>

        {/* Swap to */}
        <AmountCard>
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={12} fontWeight="600" color={FIGMA.textMuted}>
              Swap to
            </Text>
            <Text fontSize={12} fontWeight="600" color={FIGMA.textMuted}>
              Balance: {state.tokenOutBalance}
            </Text>
          </XStack>
          <XStack justifyContent="space-between" alignItems="center" gap="$3">
            <XStack gap="$2" alignItems="center" flexShrink={0}>
              <TokenBadge>
                <Text fontSize={16} fontWeight="700" color={FIGMA.text}>
                  $
                </Text>
              </TokenBadge>
              <Text fontSize={21} fontWeight="700" color={FIGMA.text}>
                {state.tokenOutSymbol}
              </Text>
            </XStack>
            {state.status === 'quote_loading' ? (
              <Spinner size="sm" />
            ) : (
              <Text fontSize={34} fontWeight="700" color={state.quote ? FIGMA.text : FIGMA.textMuted}>
                {state.quote?.outputAmount ?? '0.00'}
              </Text>
            )}
          </XStack>
        </AmountCard>

        {/* Transaction details — collapsible (Figma chevron disclosure) */}
        <CollapsibleSection title="Transaction Details">
          <YStack gap="$2">
            <DetailRow label="SLIPPAGE TOLERANCE" value={`${state.slippagePercent}%`} />
            <DetailRow
              label="PRICE"
              value={`${state.quote?.price ?? '0.00000'} G$ PER ${stableSymbol.toUpperCase()}`}
            />
            <DetailRow
              label="PRICE IMPACT"
              value={state.quote?.priceImpactPercent ?? '~0.00%'}
              valueColor={FIGMA.positive}
            />
            <DetailRow
              label="EXIT CONTRIBUTION"
              value={state.quote?.exitContributionPercent ?? '0%'}
            />
            <DetailRow
              label="MINIMUM RECEIVED"
              value={`${state.quote?.minimumReceived ?? '0.00'} ${state.tokenOutSymbol}`}
            />
          </YStack>
        </CollapsibleSection>

        {state.warning && (
          <Text testID="GoodReserveWidget-warning" color="$warning">
            {state.warning}
          </Text>
        )}

        {(state.status === 'swap_error' || state.status === 'quote_error') && state.error && (
          <Text testID="GoodReserveWidget-error" color="$error">
            {state.error}
          </Text>
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

        {/* Settings / slippage icon button at the bottom of the card (Figma). */}
        <SwapDirectionButton
          testID="GoodReserveWidget-settings"
          onPress={actions.openSlippage}
        >
          <Icon name="settings" size="sm" color="primary" />
        </SwapDirectionButton>
      </SwapShell>

      {/* FAQ block — collapsible, two items (Figma). */}
      <Card testID="GoodReserveWidget-faq" backgroundColor={FIGMA.surface} padding="$4" borderRadius="$2">
        <CollapsibleSection title="FAQ">
          <YStack gap="$3">
            <YStack gap="$1">
              <Text fontSize={14} fontWeight="500" color={FIGMA.textMuted}>
                What is {stableSymbol}?
              </Text>
              <Text fontSize={16} fontWeight="400" color={FIGMA.text}>
                A stablecoin used as reserve collateral on {network}.
              </Text>
            </YStack>
            <YStack gap="$1">
              <Text fontSize={14} fontWeight="500" color={FIGMA.textMuted}>
                How does the reserve work?
              </Text>
              <Text fontSize={16} fontWeight="400" color={FIGMA.text}>
                The GoodDollar Reserve is an automated market maker that prices G$ against the
                reserve token, so you can buy or sell at any time.
              </Text>
            </YStack>
          </YStack>
        </CollapsibleSection>
      </Card>

      {/* Slippage selection as a bottom-sheet Drawer. */}
      <Drawer open={state.status === 'slippage_selection'} onClose={actions.closeSlippage} height="half">
        <YStack testID="GoodReserveWidget-slippage-sheet" gap="$4" width="100%">
          <XStack justifyContent="space-between" alignItems="center">
            <Heading level={4} color={FIGMA.text}>
              Slippage Tolerance
            </Heading>
            <XStack cursor="pointer" onPress={actions.closeSlippage}>
              <Icon name="x" size="sm" color="muted" />
            </XStack>
          </XStack>
          <XStack gap="$2" flexWrap="wrap">
            {[0.1, 0.5, 1].map((option) => (
              <Button
                key={option}
                flex={1}
                variant={state.slippagePercent === option ? 'primary' : 'secondary'}
                onPress={() => actions.setSlippagePercent(option)}
              >
                <ButtonText>{option}%</ButtonText>
              </Button>
            ))}
          </XStack>
          <Button fullWidth height={54} borderRadius="$full" onPress={actions.closeSlippage}>
            <ButtonText>Done</ButtonText>
          </Button>
        </YStack>
      </Drawer>

      {/* Confirmation as an anchored bottom-sheet Drawer (Figma). */}
      <Drawer open={state.status === 'confirm_dialog'} onClose={actions.closeConfirm} height="half">
        <YStack testID="GoodReserveWidget-confirm-dialog" gap="$4" width="100%">
          <XStack justifyContent="space-between" alignItems="center">
            <Heading level={4} color={FIGMA.text}>
              Confirm Swap
            </Heading>
            <XStack cursor="pointer" onPress={actions.closeConfirm}>
              <Icon name="x" size="sm" color="muted" />
            </XStack>
          </XStack>

          {/* Token hero: from badge → arrow → to badge */}
          <XStack alignItems="center" justifyContent="center" gap="$3">
            <TokenBadge>
              <Text fontSize={16} fontWeight="700" color={FIGMA.text}>
                $
              </Text>
            </TokenBadge>
            <Icon name="arrow-right" size="sm" color="primary" />
            <SuccessIconSmall>
              <Text fontSize={16} fontWeight="700" color="#FFFFFF">
                $
              </Text>
            </SuccessIconSmall>
          </XStack>

          {/* Minimum received highlight */}
          <YStack
            backgroundColor={FIGMA.surfaceInner}
            borderRadius="$3"
            padding="$4"
            alignItems="center"
            gap="$1"
          >
            <Text fontSize={14} fontWeight="400" color={FIGMA.textSecondary}>
              Minimum Received
            </Text>
            <Text fontSize={50} fontWeight="800" color={FIGMA.text}>
              {state.quote?.minimumReceived ?? '0.00'}
            </Text>
            <Text fontSize={17} fontWeight="600" color={FIGMA.text}>
              {state.tokenOutSymbol}
            </Text>
          </YStack>

          {/* Details table */}
          <YStack backgroundColor={FIGMA.card} borderRadius="$2" padding="$4" gap="$2">
            <DetailRow
              label="Exchange Rate"
              value={`1 ${state.tokenInSymbol} = ${state.quote?.price ?? '0'} ${state.tokenOutSymbol}`}
            />
            <DetailRow label="Max Slippage" value={`${state.slippagePercent}%`} />
            <DetailRow label="Network Fee" value="~0.001 CELO" />
            <DetailRow label="You Pay" value={`${state.inputAmount} ${state.tokenInSymbol}`} />
          </YStack>

          <Separator />

          <XStack gap="$2">
            <Button flex={1} variant="secondary" onPress={actions.closeConfirm}>
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button
              flex={2}
              height={54}
              borderRadius="$full"
              testID="GoodReserveWidget-confirm-cta"
              onPress={actions.executeSwap}
            >
              <ButtonText>Confirm Swap</ButtonText>
            </Button>
          </XStack>
        </YStack>
      </Drawer>
    </YStack>
  )
}
