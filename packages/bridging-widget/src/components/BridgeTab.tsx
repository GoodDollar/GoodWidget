import React from 'react'
import { ButtonText, Heading, Icon, Text, XStack, YStack, getChainDisplayName } from '@goodwidget/ui'
import type { BridgeConfig, BridgeFeeQuote, BridgeProtocol, BridgeRequirement } from '@goodsdks/bridging-sdk'
import { getBridgeTargetChains } from '../adapter/bridgeRoutes'
import { BRIDGING_CHAINS } from '../widgetRuntimeContract'
import { AmountEntry } from './AmountEntry'
import { FeeBreakdown } from './FeeBreakdown'
import { NetworkSelect } from './NetworkSelect'
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
  const chainOptions = (chains: number[]) => chains.map((id) => ({
    value: String(id),
    label: getChainDisplayName(id),
  }))

  return (
    <BridgingTabContent>
      <RouteSelectionCard>
        <YStack gap="$1">
          <Text secondary>From network</Text>
          <NetworkSelect
            accessibilityLabel="Source network"
            testID="BridgingWidget-source-select"
            value={String(chainId)}
            options={chainOptions(sourceOptions)}
            onValueChange={(value) => onSelectSourceChain(Number(value))}
          />
        </YStack>
        <YStack gap="$1">
          <Text secondary>To network</Text>
          <NetworkSelect
            accessibilityLabel="Destination network"
            testID="BridgingWidget-target-select"
            value={targetChainId === null ? undefined : String(targetChainId)}
            options={chainOptions(targetOptions)}
            placeholder="Choose a destination"
            onValueChange={(value) => onSelectTargetChain(Number(value))}
          />
        </YStack>
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
          <YStack gap="$1">
            <Text fontSize={16} fontWeight="600" color="$textColor">Bridge provider</Text>
            <Text variant="caption" secondary>Available for this route</Text>
          </YStack>
          <YStack gap="$2">
            {availableProtocols.map((protocol) => (
              <ActionButton
                key={protocol}
                onPress={() => onSelectProtocol(protocol)}
                variant={selectedProtocol === protocol ? 'primary' : 'secondary'}
                width="100%"
                height="auto"
                minWidth={0}
                minHeight="$12"
                paddingVertical="$3"
                aria-pressed={selectedProtocol === protocol}
              >
                <XStack width="100%" alignItems="center" justifyContent="space-between" gap="$3">
                  <YStack flex={1} alignItems="flex-start" gap="$1">
                    <ButtonText color={selectedProtocol === protocol ? undefined : '$text'}>
                      {PROTOCOL_LABELS[protocol]}
                    </ButtonText>
                    <Text
                      fontSize={12}
                      color={selectedProtocol === protocol ? '$white' : '$secondaryColor'}
                    >
                      Supports {PROTOCOL_SUPPORTED_NETWORKS[protocol]}
                    </Text>
                  </YStack>
                  {selectedProtocol === protocol && <Icon name="check" size="sm" color="white" />}
                </XStack>
              </ActionButton>
            ))}
          </YStack>
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
