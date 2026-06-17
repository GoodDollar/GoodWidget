import React, { useState } from 'react'
import {
  Anchor,
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
import { CELO_CHAIN_ID, SUPPORTED_RESERVE_CHAINS, XDC_CHAIN_ID } from './constants'
import { sanitizeAmount } from './amount'

// ---------------------------------------------------------------------------
// Named styled components participate in the component sub-theme system: each
// resolves its surface ($background) and its primary foreground ($color) from a
// registered dark_Reserve* theme (defined in the preset), so a host override of
// a sub-theme's surface/primary-text moves them together.
//
// Secondary text shades (muted labels, the blue heading, the accent link) are
// driven by dedicated $reserve* tokens rather than per-component sub-theme keys,
// so they are overridable at the token layer (not per sub-theme). No raw hex is
// used in the view; all colors are tokens or sub-theme keys.
//
// The widget is dark-only (GoodWalletV2 has no light design); see
// widgetRuntimeContract.ts — defaultTheme is fixed to 'dark'.
// ---------------------------------------------------------------------------

/** Outer swap card matching the dark reserve panel in the Figma reference. */
const SwapShell = createComponent(Card, {
  name: 'ReserveSwapShell',
  extends: 'Card',
  backgroundColor: '$background',
  color: '$color',
  borderColor: '$borderColor',
  padding: '$4',
  gap: '$3',
  borderRadius: '$6',
})

/** Swap-from / swap-to amount panels (Figma rounded input cards). */
const AmountCard = createComponent(Card, {
  name: 'ReserveAmountCard',
  extends: 'Card',
  backgroundColor: '$background',
  color: '$color',
  borderWidth: 0,
  shadowOpacity: 0,
  padding: '$4',
  gap: '$1',
  borderRadius: '$4',
})

/** Generic raised surface (success summary card, FAQ card). */
const ReserveSurface = createComponent(Card, {
  name: 'ReserveSurface',
  extends: 'Card',
  backgroundColor: '$background',
  color: '$color',
  borderWidth: 0,
  borderRadius: '$3',
})

/** Inner highlight surface (confirm "minimum received"). */
const ReserveSurfaceInner = createComponent(YStack, {
  name: 'ReserveSurfaceInner',
  backgroundColor: '$background',
  borderRadius: '$3',
})

/** Confirm details table surface. */
const ReserveDetailsTable = createComponent(YStack, {
  name: 'ReserveDetailsTable',
  backgroundColor: '$background',
  borderRadius: '$2',
})

/** Circular token badge that fronts each amount panel. */
const TokenBadge = createComponent(XStack, {
  name: 'ReserveTokenBadge',
  width: 40,
  height: 40,
  borderRadius: '$full',
  backgroundColor: '$background',
  color: '$color',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
})

/** Circular swap-direction (flip) button between the amount cards. */
const SwapDirectionButton = createComponent(XStack, {
  name: 'ReserveSwapDirectionButton',
  width: 40,
  height: 40,
  borderRadius: '$full',
  backgroundColor: '$background',
  color: '$color',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  cursor: 'pointer',
  alignSelf: 'center' as const,
})

/** Circular settings/slippage button at the bottom of the swap card. */
const SettingsButton = createComponent(XStack, {
  name: 'ReserveSettingsButton',
  width: 40,
  height: 40,
  borderRadius: '$full',
  backgroundColor: '$background',
  color: '$color',
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
  backgroundColor: '$background',
  color: '$color',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  shadowColor: '$shadowColor',
  shadowRadius: 24,
  shadowOpacity: 1,
  shadowOffset: { width: 0, height: 0 },
})

/** Small flat "to" token badge in the confirm-drawer hero (distinct from the
 *  glowing success hero — its own sub-theme so overrides don't collide). */
const ConfirmToBadge = createComponent(XStack, {
  name: 'ReserveConfirmToBadge',
  width: 40,
  height: 40,
  borderRadius: '$full',
  backgroundColor: '$background',
  color: '$color',
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

// Block-explorer transaction URLs for the supported reserve chains. The XDC
// explorer (explorer.xdc.org/tx/<hash>) matches the SDK author's own demo
// (apps/demo-reserve-swap/src/components/TransactionHistory.tsx) so we follow
// the same source of truth. See sdk.ts for the PR #35 commit reference.
function explorerTxUrl(chainId: number | null, txHash: string): string {
  return chainId === XDC_CHAIN_ID
    ? `https://explorer.xdc.org/tx/${txHash}`
    : `https://celoscan.io/tx/${txHash}`
}

interface ReserveSwapViewProps {
  adapter: ReserveSwapWidgetAdapterResult
  /** Chain proposed by the unsupported-chain CTA. Defaults to Celo. */
  preferredChainId?: number
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
      <Text fontSize={12} fontWeight="600" color={'$reserveTextMuted'}>
        {label}
      </Text>
      <Text fontSize={16} fontWeight="500" color={valueColor ?? '$reserveText'}>
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
        <Text fontSize={12} fontWeight="600" color={'$reserveTextMuted'}>
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
export function ReserveSwapView({ adapter, preferredChainId }: ReserveSwapViewProps) {
  const { state, actions } = adapter
  const network = networkLabel(state.chainId)

  // Clamp the unsupported-chain switch target to a supported reserve chain so a
  // bad preferredChainId can't route the user to e.g. Ethereum and bounce back.
  const switchTarget =
    preferredChainId != null && SUPPORTED_RESERVE_CHAINS.includes(preferredChainId as never)
      ? preferredChainId
      : CELO_CHAIN_ID

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
          <Heading level={3} fontSize={26} fontWeight="700" color={'$reserveText'}>
            Swap Successful
          </Heading>

          <ReserveSurface
            testID="GoodReserveWidget-success"
            width="100%"
            padding="$4"
            gap="$2"
            alignItems="center"
          >
            <Text fontSize={16} fontWeight="400" color={'$reserveTextSecondary'}>
              Estimated received
            </Text>
            <Text fontSize={21} fontWeight="700" color="$white">
              {state.lastSwapOutput ?? state.quote?.outputAmount ?? '—'} {state.tokenOutSymbol}
            </Text>
          </ReserveSurface>

          {state.txHash && (
            <Anchor
              href={explorerTxUrl(state.chainId, state.txHash)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <XStack gap="$1" alignItems="center">
                <Text fontSize={12} fontWeight="600" color={'$reserveAccentSoft'}>
                  View on Explorer
                </Text>
                <Icon name="external-link" size="2xs" color="primary" />
              </XStack>
            </Anchor>
          )}

          <SuccessIcon>
            <Icon name="check" size="xl" color="text" />
          </SuccessIcon>

          <Button
            fullWidth
            height={54}
            borderRadius="$full"
            // Reset to a clean buy idle state to start another swap.
            onPress={() => actions.setDirection('buy')}
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
          borderColor="$primaryMuted"
          borderRadius="$full"
          paddingHorizontal="$3"
          paddingVertical="$1"
          alignItems="center"
          gap="$1"
        >
          <Text fontSize={12} fontWeight="600" color={'$reserveTextMuted'}>
            {network}
          </Text>
        </XStack>
        <Heading level={3} fontSize={28} fontWeight="700" color={'$reserveHeading'}>
          Swap on {network}
        </Heading>
        <Text center fontSize={14} fontWeight="500" color={'$reserveTextMuted'}>
          Buy or sell GoodDollars on {network} using the GoodDollar Reserve.
        </Text>
      </YStack>

      <SwapShell>
        {/* Swap from */}
        <AmountCard>
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={12} fontWeight="600" color={'$reserveTextMuted'}>
              Swap from
            </Text>
            <XStack gap="$2" alignItems="center">
              <Text fontSize={12} fontWeight="600" color={'$reserveTextMuted'}>
                Balance: {state.tokenInBalance}
              </Text>
              <Text
                testID="GoodReserveWidget-max"
                fontSize={12}
                fontWeight="600"
                color={'$reserveHeading'}
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
                <Text fontSize={16} fontWeight="700" color="$color">
                  $
                </Text>
              </TokenBadge>
              <Text fontSize={21} fontWeight="700" color={'$reserveText'}>
                {state.tokenInSymbol}
              </Text>
            </XStack>
            <Input
              flex={1}
              borderWidth={0}
              backgroundColor="$backgroundTransparent"
              fontSize={34}
              fontWeight="700"
              color={'$reserveText'}
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
            <Text fontSize={12} fontWeight="600" color={'$reserveTextMuted'}>
              Swap to
            </Text>
            <Text fontSize={12} fontWeight="600" color={'$reserveTextMuted'}>
              Balance: {state.tokenOutBalance}
            </Text>
          </XStack>
          <XStack justifyContent="space-between" alignItems="center" gap="$3">
            <XStack gap="$2" alignItems="center" flexShrink={0}>
              <TokenBadge>
                <Text fontSize={16} fontWeight="700" color="$color">
                  $
                </Text>
              </TokenBadge>
              <Text fontSize={21} fontWeight="700" color={'$reserveText'}>
                {state.tokenOutSymbol}
              </Text>
            </XStack>
            {state.status === 'quote_loading' ? (
              <Spinner size="sm" />
            ) : (
              <Text fontSize={34} fontWeight="700" color={state.quote ? '$reserveText' : '$reserveTextMuted'}>
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
              value={`1 ${state.tokenInSymbol} = ${state.quote?.price ?? '0.00000'} ${state.tokenOutSymbol}`}
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
          <YStack gap="$2">
            <Text testID="GoodReserveWidget-error" color="$error">
              {state.error}
            </Text>
            <Button
              testID="GoodReserveWidget-retry"
              variant="secondary"
              fullWidth
              onPress={actions.refresh}
            >
              <ButtonText>Retry</ButtonText>
            </Button>
          </YStack>
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
              await actions.switchChain(switchTarget)
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
        <SettingsButton testID="GoodReserveWidget-settings" onPress={actions.openSlippage}>
          <Icon name="settings" size="sm" color="primary" />
        </SettingsButton>
      </SwapShell>

      {/* FAQ block — collapsible, two items (Figma). */}
      <ReserveSurface testID="GoodReserveWidget-faq" padding="$4">
        <CollapsibleSection title="FAQ">
          <YStack gap="$3">
            <YStack gap="$1">
              <Text fontSize={14} fontWeight="500" color={'$reserveTextMuted'}>
                What is {stableSymbol}?
              </Text>
              <Text fontSize={16} fontWeight="400" color={'$reserveText'}>
                A stablecoin used as reserve collateral on {network}.
              </Text>
            </YStack>
            <YStack gap="$1">
              <Text fontSize={14} fontWeight="500" color={'$reserveTextMuted'}>
                How does the reserve work?
              </Text>
              <Text fontSize={16} fontWeight="400" color={'$reserveText'}>
                The GoodDollar Reserve is an automated market maker that prices G$ against the
                reserve token, so you can buy or sell at any time.
              </Text>
            </YStack>
          </YStack>
        </CollapsibleSection>
      </ReserveSurface>

      {/* Slippage selection as a bottom-sheet Drawer. */}
      <Drawer open={state.status === 'slippage_selection'} onClose={actions.closeSlippage} height="half">
        <YStack testID="GoodReserveWidget-slippage-sheet" gap="$4" width="100%">
          <XStack justifyContent="space-between" alignItems="center">
            <Heading level={4} color={'$reserveText'}>
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

      {/* Confirmation as an anchored bottom-sheet Drawer (Figma). Uses full
          height so the hero + 50px highlight + details table are not clipped. */}
      <Drawer open={state.status === 'confirm_dialog'} onClose={actions.closeConfirm} height="full">
        <YStack testID="GoodReserveWidget-confirm-dialog" gap="$4" width="100%">
          <XStack justifyContent="space-between" alignItems="center">
            <Heading level={4} color={'$reserveText'}>
              Confirm Swap
            </Heading>
            <XStack cursor="pointer" onPress={actions.closeConfirm}>
              <Icon name="x" size="sm" color="muted" />
            </XStack>
          </XStack>

          {/* Token hero: from badge → arrow → to badge */}
          <XStack alignItems="center" justifyContent="center" gap="$3">
            <TokenBadge>
              <Text fontSize={16} fontWeight="700" color="$color">
                $
              </Text>
            </TokenBadge>
            <Icon name="arrow-right" size="sm" color="primary" />
            <ConfirmToBadge>
              <Text fontSize={16} fontWeight="700" color="$color">
                $
              </Text>
            </ConfirmToBadge>
          </XStack>

          {/* Minimum received highlight */}
          <ReserveSurfaceInner padding="$4" alignItems="center" gap="$1">
            <Text fontSize={14} fontWeight="400" color={'$reserveTextSecondary'}>
              Minimum Received
            </Text>
            <Text fontSize={50} fontWeight="800" color={'$reserveText'}>
              {state.quote?.minimumReceived ?? '0.00'}
            </Text>
            <Text fontSize={17} fontWeight="600" color={'$reserveText'}>
              {state.tokenOutSymbol}
            </Text>
          </ReserveSurfaceInner>

          {/* Details table */}
          <ReserveDetailsTable padding="$4" gap="$2">
            <DetailRow
              label="Exchange Rate"
              value={`1 ${state.tokenInSymbol} = ${state.quote?.price ?? '0'} ${state.tokenOutSymbol}`}
            />
            <DetailRow label="Max Slippage" value={`${state.slippagePercent}%`} />
            <DetailRow label="You Pay" value={`${state.inputAmount} ${state.tokenInSymbol}`} />
          </ReserveDetailsTable>

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
