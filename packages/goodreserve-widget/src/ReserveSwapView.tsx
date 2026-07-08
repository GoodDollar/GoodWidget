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
import type {
  ReserveSwapWidgetAdapterActions,
  ReserveSwapWidgetAdapterResult,
  ReserveSwapWidgetAdapterState,
} from './widgetRuntimeContract'
import { CELO_CHAIN_ID, getReserveChainFromId, XDC_CHAIN_ID } from './constants'


// ---------------------------------------------------------------------------
// Widget-scoped named components.
//
// Colors are sourced from:
//   1. Preset design tokens (e.g. `$primary`, `$surface`, `$textColor`) — preferred
//      for anything that has a semantic match in GoodWalletV2.
//   2. Widget-local theme tokens registered via config.ts (e.g. `$reserveCard`,
//      `$reserveTextMuted`) — used only where Figma specifies a reserve-specific
//      shade with no preset equivalent.
//
// Hardcoded hex is NOT used in JSX. Font sizes / weights use numeric literals
// where they express intentional one-off Figma values; sizing tokens are used
// for spacing/radius.
//
// Integrators can override any named-component sub-theme or $reserve* token via:
//   <GoodReserveWidget themeOverrides={{ themes: { light: { reserveCard: '...' } } }} />
// ---------------------------------------------------------------------------

/** Outer swap card — uses $reserveCard from the widget config theme extension. */
const SwapShell = createComponent(Card, {
  name: 'ReserveSwapShell',
  extends: 'Card',
  backgroundColor: '$reserveCard',
  color: '$textColor',
  borderColor: '$reserveBadge',
  padding: '$4',
  gap: '$3',
  borderRadius: '$6',
})

/** Swap-from / swap-to amount panels. */
const AmountCard = createComponent(Card, {
  name: 'ReserveAmountCard',
  extends: 'Card',
  backgroundColor: '$reserveInputCard',
  color: '$textColor',
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
  backgroundColor: '$surface',
  color: '$textColor',
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
  backgroundColor: '$reserveCard',
  borderRadius: '$2',
})

/** Circular token badge that fronts each amount panel. */
const TokenBadge = createComponent(XStack, {
  name: 'ReserveTokenBadge',
  width: 40,
  height: 40,
  borderRadius: '$full',
  backgroundColor: '$reserveBadge',
  color: '$textColor',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
})

/** Circular swap-direction (flip) button between the amount cards. */
const SwapDirectionButton = createComponent(XStack, {
  name: 'ReserveSwapDirectionButton',
  width: 40,
  height: 40,
  borderRadius: '$full',
  backgroundColor: '$reserveBadge',
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
  backgroundColor: '$reserveBadge',
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
  backgroundColor: '$primary',
  color: 'white',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  shadowColor: '$shadowColor',
  shadowRadius: 24,
  shadowOpacity: 1,
  shadowOffset: { width: 0, height: 0 },
})

/** Small flat "to" token badge in the confirm-drawer hero. */
const ConfirmToBadge = createComponent(XStack, {
  name: 'ReserveConfirmToBadge',
  width: 40,
  height: 40,
  borderRadius: '$full',
  backgroundColor: '$color',
  color: '$textColor',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
})

const NETWORK_LABELS: Record<number, string> = {
  [CELO_CHAIN_ID]: 'CELO',
  [XDC_CHAIN_ID]: 'XDC',
}

function networkLabel(chainId: number | null): string {
  return chainId !== null && NETWORK_LABELS[chainId] ? NETWORK_LABELS[chainId] : 'Unsupported'
}

// Block-explorer transaction URLs for the supported reserve chains.
// XDC uses xdcscan.com/tx/<hash> — the Etherscan-style explorer registered in
// viem's xdc chain definition (chainId 50) as the canonical XDC explorer.
function explorerTxUrl(chainId: number | null, txHash: string): string {
  return chainId === XDC_CHAIN_ID
    ? `https://xdcscan.com/tx/${txHash}`
    : `https://celoscan.io/tx/${txHash}`
}

interface ReserveSwapViewProps {
  adapter: ReserveSwapWidgetAdapterResult
  /** Chain proposed by the unsupported-chain CTA. Defaults to Celo. */
  preferredChainId?: number
}

// A single right-aligned key/value row inside the transaction details block.
// label: 12/600 muted, value: 16/500 default text.
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
      <Text fontSize={16} fontWeight="500" color={valueColor ?? '$textColor'}>
        {value}
      </Text>
    </XStack>
  )
}

// Collapsible disclosure with a chevron toggle.
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

// ReserveSwapView is a thin dispatcher routing to per-state subcomponents.
export function ReserveSwapView({ adapter, preferredChainId }: ReserveSwapViewProps) {
  const { state, actions } = adapter
  const network = networkLabel(state.chainId)

  // Clamp the unsupported-chain switch target to a supported reserve chain.
  const switchTarget =
    preferredChainId != null && getReserveChainFromId(preferredChainId) !== null
      ? preferredChainId
      : CELO_CHAIN_ID

  if (state.status === 'sdk_initializing') {
    return <SdkInitializingView />
  }

  if (state.status === 'swap_success') {
    return (
      <SwapSuccessView
        state={state}
        actions={actions}
        lastSwapOutput={state.lastSwapOutput ?? state.quote?.outputAmount ?? '—'}
      />
    )
  }

  return (
    <MainSwapView
      state={state}
      actions={actions}
      network={network}
      switchTarget={switchTarget}
    />
  )
}

// SDK loading spinner — shown while the SDK/runtime mounts.
function SdkInitializingView() {
  return (
    <YStack testID="GoodReserveWidget-root" width="100%" maxWidth={390} alignSelf="center">
      <SwapShell alignItems="center" justifyContent="center" gap="$3" paddingVertical="$8">
        <Spinner size="lg" />
        <Text tone="soft">
          <Text>Connecting to the reserve…</Text>
        </Text>
      </SwapShell>
    </YStack>
  )
}

function SwapSuccessView({
  state,
  actions,
  lastSwapOutput,
}: {
  state: ReserveSwapWidgetAdapterState
  actions: ReserveSwapWidgetAdapterActions
  lastSwapOutput: string
}) {
  const formattedOutput = isNaN(Number(lastSwapOutput))
    ? lastSwapOutput
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(Number(lastSwapOutput))

  return (
    <YStack testID="GoodReserveWidget-root" width="100%" maxWidth={390} alignSelf="center" gap="$6" alignItems="center" flex={1}>
      <SwapShell width="100%" alignItems="center" gap="$5" paddingVertical="$8" flex={1}>
        <SuccessIcon marginTop="$4">
          <Icon name="check" size="xl" color="inherit" />
        </SuccessIcon>

        <Heading level={3} fontSize={26} fontWeight="700" color="$textColor" textAlign="center">
          Swap Successful
        </Heading>

        <ReserveSurface testID="GoodReserveWidget-success" width="100%" padding="$5" gap="$2" alignItems="center">
          <Text fontSize={14} fontWeight="500" color="$reserveTextSecondary">
            Final amount received
          </Text>
          <Text fontSize={24} fontWeight="800" color="$textColor">
            {formattedOutput} {state.tokenOutSymbol}
          </Text>
        </ReserveSurface>

        {state.txHash && (
          <Anchor href={explorerTxUrl(state.chainId, state.txHash)} target="_blank" rel="noopener noreferrer" textDecorationLine="none">
            <XStack gap="$2" alignItems="center">
              <Text fontSize={12} fontWeight="600" color="$reserveTextSecondary">
                View on Explorer ↗
              </Text>
            </XStack>
          </Anchor>
        )}

        <YStack flex={1} minHeight={40} />

        <Button
          fullWidth
          height={54}
          borderRadius="$full"
          onPress={() => actions.setDirection('buy')}
        >
          <ButtonText>Do another swap</ButtonText>
        </Button>
      </SwapShell>
    </YStack>
  )
}

// Slippage selection as a bottom-sheet Drawer.
function SlippageDrawer({
  state,
  actions,
}: {
  state: ReserveSwapWidgetAdapterState
  actions: ReserveSwapWidgetAdapterActions
}) {
  return (
    <Drawer open={state.status === 'slippage_selection'} onClose={actions.closeSlippage} height="half">
      <YStack testID="GoodReserveWidget-slippage-sheet" gap="$4" width="100%">
        <XStack justifyContent="space-between" alignItems="center">
          <Heading level={4} color="$textColor">
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
  )
}

// Confirmation as an anchored bottom-sheet Drawer. Uses full height so the
// hero + highlight + details table are not clipped.
function ConfirmDrawer({
  state,
  actions,
}: {
  state: ReserveSwapWidgetAdapterState
  actions: ReserveSwapWidgetAdapterActions
}) {
  return (
    <Drawer open={state.status === 'confirm_dialog'} onClose={actions.closeConfirm} height="full">
      <YStack testID="GoodReserveWidget-confirm-dialog" gap="$4" width="100%">
        <XStack justifyContent="space-between" alignItems="center">
          <Heading level={4} color="$textColor">
            Confirm Swap
          </Heading>
          <XStack cursor="pointer" onPress={actions.closeConfirm}>
            <Icon name="x" size="sm" color="muted" />
          </XStack>
        </XStack>

        {/* Token hero: from badge → arrow → to badge */}
        <XStack alignItems="center" justifyContent="center" gap="$3">
          <TokenBadge>
            <Text fontSize={16} fontWeight="700" color="$textColor">$</Text>
          </TokenBadge>
          <Icon name="arrow-right" size="sm" color="primary" />
          <ConfirmToBadge>
            <Text fontSize={16} fontWeight="700" color="$textColor">$</Text>
          </ConfirmToBadge>
        </XStack>

        {/* Minimum received highlight */}
        <ReserveSurfaceInner padding="$4" alignItems="center" gap="$1">
          <Text fontSize={14} fontWeight="400" color="$reserveTextSecondary">
            Minimum Received
          </Text>
          <Text fontSize={50} fontWeight="800" color="$textColor">
            {state.quote?.minimumReceived ?? '0.00'}
          </Text>
          <Text fontSize={17} fontWeight="600" color="$textColor">
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
  )
}

interface MainSwapStatusCta {
  label: string
  disabled: boolean
  loading: boolean
  action?: 'connect' | 'switchChain' | 'confirm'
}

const MAIN_SWAP_STATUS_CTA: Partial<
  Record<ReserveSwapWidgetAdapterState['status'], MainSwapStatusCta>
> = {
  no_provider: {
    label: 'Connect Wallet',
    disabled: false,
    loading: false,
    action: 'connect',
  },
  unsupported_chain: {
    label: 'Switch Network',
    disabled: false,
    loading: false,
    action: 'switchChain',
  },
  swap_pending: {
    label: 'Swapping…',
    disabled: false,
    loading: true,
  },
  quote_loading: {
    label: 'Fetching Quote…',
    disabled: true,
    loading: false,
  },
  insufficient_balance: {
    label: 'Insufficient Balance',
    disabled: true,
    loading: false,
  },
}

function getMainSwapPrimaryCta(
  state: ReserveSwapWidgetAdapterState,
  hasAmount: boolean,
): MainSwapStatusCta {
  const statusCta = MAIN_SWAP_STATUS_CTA[state.status]
  if (statusCta) {
    return statusCta
  }
  if (!hasAmount) {
    return {
      label: 'Enter Amount',
      disabled: true,
      loading: false,
    }
  }
  if (!state.quote) {
    return {
      label: 'Review Swap',
      disabled: true,
      loading: false,
    }
  }
  return {
    label: 'Review Swap',
    disabled: false,
    loading: false,
    action: 'confirm',
  }
}

// Main swap view: header → from/to cards → details → CTA → settings → FAQ.
// Confirmation and slippage states overlay through nested Drawer components.
function MainSwapView({
  state,
  actions,
  network,
  switchTarget,
}: {
  state: ReserveSwapWidgetAdapterState
  actions: ReserveSwapWidgetAdapterActions
  network: string
  switchTarget: number
}) {
  const hasAmount = Boolean(state.inputAmount) && Number(state.inputAmount) > 0
  const primaryCta = getMainSwapPrimaryCta(state, hasAmount)
  const stableSymbol = state.tokenInSymbol === 'G$' ? state.tokenOutSymbol : state.tokenInSymbol

  return (
    <YStack testID="GoodReserveWidget-root" width="100%" maxWidth={390} alignSelf="center" gap="$3">
      {/* Header sits ABOVE the dark card (Figma): network pill, heading, subtitle. */}
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
          <Text fontSize={12} fontWeight="600" color="$reserveTextMuted">
            {network}
          </Text>
        </XStack>
        <Heading level={3} fontSize={28} fontWeight="700" color="$reserveHeading">
          Swap on {network}
        </Heading>
        <Text center fontSize={14} fontWeight="500" color="$reserveTextMuted">
          Buy or sell GoodDollars on {network} using the GoodDollar Reserve.
        </Text>
      </YStack>

      <SwapShell>
        {/* Swap from */}
        <AmountCard>
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={12} fontWeight="600" color="$reserveTextMuted">
              Swap from
            </Text>
            <XStack gap="$2" alignItems="center">
              <Text fontSize={12} fontWeight="600" color="$reserveTextMuted">
                Balance: {state.tokenInBalance}
              </Text>
              <Text
                testID="GoodReserveWidget-max"
                fontSize={12}
                fontWeight="600"
                color="$primary"
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
                <Text fontSize={16} fontWeight="700" color="$textColor">$</Text>
              </TokenBadge>
              <Text fontSize={21} fontWeight="700" color="$textColor">
                {state.tokenInSymbol}
              </Text>
            </XStack>
            <Input
              flex={1}
              borderWidth={0}
              backgroundColor="$backgroundTransparent"
              fontSize={28}
              fontWeight="700"
              color="$textColor"
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
                actions.setInputAmount(event.target.value)
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
            <Text fontSize={12} fontWeight="600" color="$reserveTextMuted">
              Swap to
            </Text>
            <Text fontSize={12} fontWeight="600" color="$reserveTextMuted">
              Balance: {state.tokenOutBalance}
            </Text>
          </XStack>
          <XStack justifyContent="space-between" alignItems="center" gap="$3">
            <XStack gap="$2" alignItems="center" flexShrink={0}>
              <TokenBadge>
                <Text fontSize={16} fontWeight="700" color="$textColor">$</Text>
              </TokenBadge>
              <Text fontSize={21} fontWeight="700" color="$textColor">
                {state.tokenOutSymbol}
              </Text>
            </XStack>
            {state.status === 'quote_loading' ? (
              <Spinner size="sm" />
            ) : (
              <Text
                flex={1}
                fontSize={34}
                fontWeight="700"
                color={state.quote ? '$textColor' : '$reserveTextMuted'}
                textAlign="right"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {state.quote?.outputAmount ?? '0.00'}
              </Text>
            )}
          </XStack>
        </AmountCard>

        {/* Transaction details — collapsible */}
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
          disabled={primaryCta.disabled}
          onPress={async () => {
            if (primaryCta.action === 'connect') {
              await actions.connect()
              return
            }
            if (primaryCta.action === 'switchChain') {
              await actions.switchChain(switchTarget)
              return
            }
            if (primaryCta.action === 'confirm') {
              actions.openConfirm()
            }
          }}
        >
          {primaryCta.loading ? (
            <XStack gap="$2" alignItems="center">
              <Spinner size="sm" color="$white" />
              <ButtonText>{primaryCta.label}</ButtonText>
            </XStack>
          ) : (
            <ButtonText>{primaryCta.label}</ButtonText>
          )}
        </Button>

        {/* Surface the submitted hash immediately during swap_pending so the
            user gets confirmation the tx was broadcast without waiting for receipt.
            Text must be wrapped in <Text> — bare strings break on React Native. */}
        {state.status === 'swap_pending' && state.txHash ? (
          <Anchor
            href={explorerTxUrl(state.chainId, state.txHash)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Text fontSize={13} color="$primary">
              Transaction submitted — view on explorer ↗
            </Text>
          </Anchor>
        ) : null}

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
              <Text fontSize={14} fontWeight="500" color="$reserveTextMuted">
                What is {stableSymbol}?
              </Text>
              <Text fontSize={16} fontWeight="400" color="$textColor">
                A stablecoin used as reserve collateral on {network}.
              </Text>
            </YStack>
            <YStack gap="$1">
              <Text fontSize={14} fontWeight="500" color="$reserveTextMuted">
                How does the reserve work?
              </Text>
              <Text fontSize={16} fontWeight="400" color="$textColor">
                The GoodDollar Reserve is an automated market maker that prices G$ against the
                reserve token, so you can buy or sell at any time.
              </Text>
            </YStack>
          </YStack>
        </CollapsibleSection>
      </ReserveSurface>

      {/* Slippage selection as a bottom-sheet Drawer. */}
      <SlippageDrawer state={state} actions={actions} />

      {/* Confirmation as an anchored bottom-sheet Drawer (Figma). */}
      <ConfirmDrawer state={state} actions={actions} />
    </YStack>
  )
}
