import React from 'react'
import { ButtonText, Heading, Text, XStack, getChainDisplayName } from '@goodwidget/ui'
import type { BridgeConfig, BridgeFeeQuote, BridgeProtocol, BridgeRequirement } from '@goodsdks/bridging-sdk'
import { getBridgeTargetChains } from '../adapter/bridgeRoutes'
import { BRIDGING_CHAINS } from '../widgetRuntimeContract'
import { AmountEntry } from './AmountEntry'
import { FeeBreakdown } from './FeeBreakdown'
import { ActionButton, BridgingTabContent, PROTOCOL_LABELS, RouteSelectionCard } from './shared'

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

  return (
    <BridgingTabContent>
      <RouteSelectionCard>
        <Text secondary>From</Text>
        <XStack gap="$2" flexWrap="wrap">
          {sourceOptions.map((option) => (
            <ActionButton
              key={option}
              onPress={() => onSelectSourceChain(option)}
              variant={chainId === option ? 'primary' : 'secondary'}
            >
              <ButtonText color={chainId === option ? undefined : '$text'}>{getChainDisplayName(option)}</ButtonText>
            </ActionButton>
          ))}
        </XStack>

        <Text secondary>To</Text>
        <XStack gap="$2" flexWrap="wrap">
          {targetOptions.map((option) => (
            <ActionButton
              key={option}
              onPress={() => onSelectTargetChain(option)}
              variant={targetChainId === option ? 'primary' : 'secondary'}
            >
              <ButtonText color={targetChainId === option ? undefined : '$text'}>{getChainDisplayName(option)}</ButtonText>
            </ActionButton>
          ))}
        </XStack>
      </RouteSelectionCard>

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

      {hasTarget && isRouteSupported && (
        <RouteSelectionCard>
          <Text secondary>Bridge via</Text>
          <XStack gap="$2" flexWrap="wrap">
            {availableProtocols.map((protocol) => (
              <ActionButton
                key={protocol}
                onPress={() => onSelectProtocol(protocol)}
                variant={selectedProtocol === protocol ? 'primary' : 'secondary'}
                width="100%"
                height="auto"
                minHeight="$10"
                paddingVertical="$2"
              >
                <ButtonText color={selectedProtocol === protocol ? undefined : '$text'} textAlign="center">{PROTOCOL_LABELS[protocol]}</ButtonText>
              </ActionButton>
            ))}
          </XStack>
        </RouteSelectionCard>
      )}

      {(hasTarget && isRouteSupported && selectedProtocol) || !isConnected ? (
        <>
          <AmountEntry
            inputAmount={inputAmount}
            sourceChainId={chainId}
            isConnected={isConnected}
            bridgeConfig={bridgeConfig}
            isBridgeConfigLoading={isBridgeConfigLoading}
            onChangeAmount={onChangeAmount}
            onPressMax={onPressMax}
          />
          {hasTarget && selectedProtocol && (
            <FeeBreakdown
              sourceChainId={chainId}
              targetChainId={targetChainId}
              protocol={selectedProtocol}
              quoteStatus={quoteStatus}
              quote={quote}
              needsApproval={needsApproval}
              requirements={requirements}
              quoteError={quoteError}
            />
          )}
          {!isConnected ? (
            <ActionButton
              testID="BridgingWidget-connect-cta"
              size="lg"
              fullWidth
              onPress={onConnect}
            >
              <ButtonText>Connect Wallet</ButtonText>
            </ActionButton>
          ) : canBridge && quoteStatus === 'ready' ? (
            <ActionButton
              testID="BridgingWidget-review-cta"
              size="lg"
              fullWidth
              onPress={onReview}
            >
              <ButtonText>Review</ButtonText>
            </ActionButton>
          ) : null}
        </>
      ) : null}
    </BridgingTabContent>
  )
}
