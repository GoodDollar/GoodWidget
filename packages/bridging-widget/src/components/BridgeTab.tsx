import React from 'react'
import { formatUnits } from 'viem'
import { formatTokenAmount } from '../amount'
import { getChainDecimals } from '../adapter/chains'
import { Button, ButtonText, Heading, Icon, Select, Text, XStack, YStack, getChainDisplayName } from '@goodwidget/ui'
import type { BridgeConfig, BridgeFeeQuote, BridgeProtocol, BridgeRequirement } from '@goodsdks/bridging-sdk'
import { getBridgeTargetChains } from '../adapter/bridgeRoutes'
import { primaryRequirementMessage } from '../adapter/errors'
import { BRIDGING_CHAINS } from '../widgetRuntimeContract'
import { AmountEntry } from './AmountEntry'
import { FeeBreakdown } from './FeeBreakdown'
import {
  ActionButton,
  BridgingTabContent,
  PROTOCOL_LABELS,
  PROTOCOL_SUPPORTED_NETWORKS,
  RouteSelectionCard,
} from './shared'

interface BridgeTabProps {
  chainId: number
  targetChainId: number | null
  availableProtocols: BridgeProtocol[]
  selectedProtocol: BridgeProtocol | null
  isConnected?: boolean
  isWrongChain?: boolean
  onConnect?: () => Promise<void> | void
  onSelectSourceChain: (chainId: number) => void
  onSelectTargetChain: (chainId: number) => void
  onSwapRoute?: () => void
  onSelectProtocol: (protocol: BridgeProtocol) => void
  inputAmount: string
  bridgeConfig: BridgeConfig | null
  isBridgeConfigLoading: boolean
  bridgeConfigError: string | null
  quoteStatus: 'idle' | 'loading' | 'ready' | 'error'
  quote: BridgeFeeQuote | null
  needsApproval: boolean
  canBridge: boolean
  requirements: BridgeRequirement[]
  quoteError: string | null
  onChangeAmount: (raw: string) => void
  onPressMax: () => void
  onReview: () => void
}

export function BridgeTab({
  chainId,
  targetChainId,
  availableProtocols,
  selectedProtocol,
  isConnected = true,
  isWrongChain = false,
  onConnect,
  onSelectSourceChain,
  onSelectTargetChain,
  onSwapRoute,
  onSelectProtocol,
  inputAmount,
  bridgeConfig,
  isBridgeConfigLoading,
  bridgeConfigError,
  quoteStatus,
  quote,
  needsApproval,
  canBridge,
  requirements,
  quoteError,
  onChangeAmount,
  onPressMax,
  onReview,
}: BridgeTabProps) {
  const sourceOptions = Object.values(BRIDGING_CHAINS) as number[]
  const targetOptions = getBridgeTargetChains(chainId)
  const hasTarget = targetChainId !== null
  const isRouteSupported = availableProtocols.length > 0
  const reviewDisabledReason = !hasTarget
    ? 'Select a destination network.'
    : !inputAmount
      ? 'Enter an amount to continue.'
      : isBridgeConfigLoading
        ? 'Loading balance and limits.'
        : primaryRequirementMessage(requirements, bridgeConfig?.routeLimits?.minAmount) ?? 'A valid quote is required before review.'
  const chainOptions = (chains: number[]) => chains.map((id) => {
    const label = getChainDisplayName(id)
    return {
      value: String(id),
      label,
      leading: (
        <XStack aria-hidden width={16} height={16} borderRadius="$full" backgroundColor="$backgroundHover"
          flexShrink={0} alignItems="center" justifyContent="center"
        >
          <Text fontSize={10} lineHeight={14} fontWeight="700" color="$textColor">{label[0]}</Text>
        </XStack>
      ),
    }
  })

  return (
    <BridgingTabContent>
      <XStack alignItems="flex-start" gap="$2" testID="BridgingWidget-route">
        <YStack flex={1} minWidth={0} gap="$1">
          <Text variant="label">From</Text>
          <Select
            accessibilityLabel="Source network"
            testID="BridgingWidget-source-select"
            value={String(chainId)}
            options={chainOptions(sourceOptions)}
            onValueChange={(value) => onSelectSourceChain(Number(value))}
          />
        </YStack>
        <Button variant="secondary" size="sm" width={44} height={44} padding={0} alignSelf="flex-end"
          onPress={onSwapRoute} disabled={!hasTarget || !isRouteSupported || !onSwapRoute}
          aria-label="Swap source and destination" testID="BridgingWidget-swap-route"
        >
          <Icon name="arrows-left-right" size="xs" color="primary" />
        </Button>
        <YStack flex={1} minWidth={0} gap="$1">
          <Text variant="label">To</Text>
          <Select
            accessibilityLabel="Destination network"
            testID="BridgingWidget-target-select"
            value={targetChainId === null ? undefined : String(targetChainId)}
            options={chainOptions(targetOptions)}
            placeholder="Select"
            onValueChange={(value) => onSelectTargetChain(Number(value))}
          />
        </YStack>
      </XStack>

      {isWrongChain && (
        <RouteSelectionCard>
          <Text secondary>Unsupported network. Select a source chain; your wallet will switch when you bridge.</Text>
        </RouteSelectionCard>
      )}

      {/* Balance/limits fetch failed independently of route selection — surfaced as
          its own card so it isn't masked by the "Route not supported" message below. */}
      {bridgeConfigError && (
        <RouteSelectionCard testID="BridgingWidget-config-error">
          <Text color="$error">{bridgeConfigError}</Text>
        </RouteSelectionCard>
      )}

      {hasTarget && !isRouteSupported && (
        <RouteSelectionCard>
          <Heading level={4}>Route not supported</Heading>
          <Text secondary>
            No bridge protocol connects these two chains yet. Pick a different destination
            chain.
          </Text>
        </RouteSelectionCard>
      )}

      {hasTarget && (
        <YStack gap="$2">
          <Text variant="label">Bridge provider</Text>
          <XStack gap="$2" alignItems="stretch">
            {(Object.keys(PROTOCOL_LABELS) as BridgeProtocol[]).map((protocol) => {
              const enabled = availableProtocols.includes(protocol)
              const selected = enabled && selectedProtocol === protocol
              return (
                <ActionButton
                  key={protocol}
                  onPress={() => onSelectProtocol(protocol)}
                  variant={selected ? 'primary' : 'secondary'}
                  flex={1}
                  flexBasis={0}
                  height="auto"
                  minWidth={0}
                  minHeight={68}
                  borderRadius="$3"
                  padding="$2"
                  borderColor={selected ? '$primary' : '$borderColor'}
                  backgroundColor={selected ? '$primary' : '$backgroundSurface'}
                  disabled={!enabled}
                  opacity={1}
                  aria-pressed={selected}
                >
                  <YStack width="100%" minWidth={0} gap="$1">
                    <XStack gap="$1" alignItems="center">
                      <Text variant="label" color={selected ? '$white' : '$text'}>{PROTOCOL_LABELS[protocol]}</Text>
                      {selected && <Icon name="check" size="2xs" color="white" />}
                    </XStack>
                    <Text variant="caption" color={selected ? '$white' : '$secondaryColor'} textAlign="left">
                      {enabled ? PROTOCOL_SUPPORTED_NETWORKS[protocol] : 'Unavailable for this route'}
                    </Text>
                  </YStack>
                </ActionButton>
              )
            })}
          </XStack>
        </YStack>
      )}

      <AmountEntry
        inputAmount={inputAmount}
        sourceChainId={chainId}
        isConnected={isConnected}
        bridgeConfig={bridgeConfig}
        isBridgeConfigLoading={isBridgeConfigLoading}
        onChangeAmount={onChangeAmount}
        onPressMax={onPressMax}
      />
      <RouteSelectionCard padding="$3" gap="$1">
        <XStack alignItems="center" justifyContent="space-between" gap="$2">
          <Text variant="label">You will receive</Text>
          <Text variant="caption" secondary>Estimated</Text>
        </XStack>
        <Text fontSize="$5" fontWeight="700" testID="BridgingWidget-amount-received">
          {quoteStatus === 'ready' && quote && hasTarget
            ? `${formatTokenAmount(formatUnits(quote.amountReceived, getChainDecimals(targetChainId)))} G$`
            : '\u2014'}
        </Text>
      </RouteSelectionCard>
      {hasTarget && selectedProtocol && (
        <FeeBreakdown
          sourceChainId={chainId}
          targetChainId={targetChainId}
          protocol={selectedProtocol}
          quoteStatus={quoteStatus}
          quote={quote}
          needsApproval={needsApproval && canBridge}
          quoteError={quoteError}
        />
      )}
      {!isConnected ? (
        <ActionButton testID="BridgingWidget-connect-cta" size="lg" fullWidth onPress={onConnect}>
          <ButtonText>Connect Wallet</ButtonText>
        </ActionButton>
      ) : (
        <YStack gap="$2">
          {(!hasTarget || isRouteSupported) && !bridgeConfigError &&
            quoteStatus !== 'loading' && quoteStatus !== 'error' && (!canBridge || quoteStatus !== 'ready') && (
            <Text testID="BridgingWidget-review-disabled-reason" fontSize={12}
              color={quoteStatus === 'ready' && requirements.length > 0 ? '$error' : '$secondaryColor'}
            >
              {reviewDisabledReason}
            </Text>
          )}
          <ActionButton
            testID="BridgingWidget-review-cta"
            size="lg"
            fullWidth
            disabled={!hasTarget || !isRouteSupported || !canBridge || quoteStatus !== 'ready'}
            onPress={onReview}
          >
            <ButtonText>Review</ButtonText>
          </ActionButton>
        </YStack>
      )}
    </BridgingTabContent>
  )
}
