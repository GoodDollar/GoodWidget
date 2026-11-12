import React from 'react'
import { BadgeText, ChainBadge, Heading, Text, XStack } from '@goodwidget/ui'
import type { BridgeConfig, BridgeFeeQuote, BridgeProtocol, BridgeRequirement } from '@goodsdks/bridging-sdk'
import { getBridgeTargetChains } from '../adapter/bridgeRoutes'
import { AmountEntry } from './AmountEntry'
import { FeeBreakdown } from './FeeBreakdown'
import { ActionButton, BridgingTabContent, PROTOCOL_LABELS, RouteSelectionCard } from './shared'

interface BridgeTabProps {
  chainId: number
  targetChainId: number | null
  availableProtocols: BridgeProtocol[]
  selectedProtocol: BridgeProtocol | null
  onSelectTargetChain: (chainId: number) => void
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
  onSelectTargetChain,
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
  const targetOptions = getBridgeTargetChains(chainId)
  const hasTarget = targetChainId !== null
  const isRouteSupported = availableProtocols.length > 0

  return (
    <BridgingTabContent>
      <RouteSelectionCard>
        <Text secondary>From</Text>
        <ChainBadge chainId={chainId} />

        <Text secondary>To</Text>
        <XStack gap="$2" flexWrap="wrap">
          {targetOptions.map((option) => (
            <ActionButton
              key={option}
              onPress={() => onSelectTargetChain(option)}
              variant={targetChainId === option ? 'primary' : 'secondary'}
            >
              <BadgeText>{option}</BadgeText>
            </ActionButton>
          ))}
        </XStack>
      </RouteSelectionCard>

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

      {hasTarget && isRouteSupported && (
        <RouteSelectionCard>
          <Text secondary>Bridge via</Text>
          <XStack gap="$2">
            {availableProtocols.map((protocol) => (
              <ActionButton
                key={protocol}
                onPress={() => onSelectProtocol(protocol)}
                variant={selectedProtocol === protocol ? 'primary' : 'secondary'}
              >
                <BadgeText>{PROTOCOL_LABELS[protocol]}</BadgeText>
              </ActionButton>
            ))}
          </XStack>
        </RouteSelectionCard>
      )}

      {hasTarget && isRouteSupported && selectedProtocol && (
        <>
          <AmountEntry
            inputAmount={inputAmount}
            bridgeConfig={bridgeConfig}
            isBridgeConfigLoading={isBridgeConfigLoading}
            onChangeAmount={onChangeAmount}
            onPressMax={onPressMax}
          />
          <FeeBreakdown
            targetChainId={targetChainId}
            protocol={selectedProtocol}
            quoteStatus={quoteStatus}
            quote={quote}
            needsApproval={needsApproval}
            requirements={requirements}
            quoteError={quoteError}
          />
          {canBridge && (
            <ActionButton
              testID="BridgingWidget-review-cta"
              size="lg"
              fullWidth
              onPress={onReview}
            >
              <BadgeText>Review</BadgeText>
            </ActionButton>
          )}
        </>
      )}
    </BridgingTabContent>
  )
}
