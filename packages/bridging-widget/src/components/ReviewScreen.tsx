import React from 'react'
import { formatUnits } from 'viem'
import {
  Button,
  ButtonText,
  ChainBadge,
  Drawer,
  Heading,
  Icon,
  ScrollArea,
  Separator,
  Text,
  XStack,
  YStack,
  getChainDisplayName,
} from '@goodwidget/ui'
import type { BridgeFeeQuote, BridgeProtocol } from '@goodsdks/bridging-sdk'
import { formatChargedProviderFee, getChainDecimals } from '../adapter/chains'
import { formatTokenAmount } from '../amount'
import { DetailRow, PROTOCOL_LABELS, RouteSelectionCard } from './shared'

const BPS_DENOMINATOR = 10_000

interface ReviewScreenProps {
  isOpen: boolean
  fromChainId: number
  walletChainId: number | null
  targetChainId: number
  protocol: BridgeProtocol
  quote: BridgeFeeQuote
  canConfirm?: boolean
  blockingReason?: string | null
  onClose: () => void
  onConfirm: () => void
}

// Pre-submit summary drawer: mirrors the main Bridge tab's amount + fee
// fields (FeeBreakdown) plus a From/To hero and the provider-fee-paid-
// separately note, per issue #244's "Review/Confirm screen" requirement.
export function ReviewScreen({
  isOpen,
  fromChainId,
  walletChainId,
  targetChainId,
  protocol,
  quote,
  canConfirm = true,
  blockingReason,
  onClose,
  onConfirm,
}: ReviewScreenProps) {
  const amountSent = formatTokenAmount(formatUnits(quote.amount, getChainDecimals(fromChainId)))
  const amountReceived = formatTokenAmount(
    formatUnits(quote.amountReceived, getChainDecimals(targetChainId)),
  )
  const protocolFeePercent = (Number(quote.protocolFeeBps) / BPS_DENOMINATOR) * 100

  return (
    <Drawer open={isOpen} onClose={onClose} height="full" hideCloseButton>
      <ScrollArea minHeight={0} width="100%">
        <YStack testID="BridgingWidget-review-screen" gap="$4" width="100%">
          <XStack justifyContent="space-between" alignItems="center">
            <Heading level={4} color="$textColor">
              Review Bridge
            </Heading>
            <Button size="sm" variant="ghost" onPress={onClose} aria-label="Close review">
              <Icon name="x" size="sm" color="muted" />
            </Button>
          </XStack>

          <RouteSelectionCard padding="$3" gap="$2">
            <XStack alignItems="center" justifyContent="space-between" gap="$2">
              <YStack gap="$1" flex={1} minWidth={0}>
                <Text variant="caption" secondary>G$ Sent</Text>
                <Text fontSize="$5" fontWeight="700">{amountSent}</Text>
              </YStack>
              <ChainBadge chainId={fromChainId} />
            </XStack>
            <Separator />
            <XStack alignItems="center" justifyContent="space-between" gap="$2">
              <YStack gap="$1" flex={1} minWidth={0}>
                <Text variant="caption" secondary>Estimated G$ received</Text>
                <Text fontSize="$5" fontWeight="700">{amountReceived}</Text>
              </YStack>
              <ChainBadge chainId={targetChainId} />
            </XStack>
          </RouteSelectionCard>

          <RouteSelectionCard padding="$3" gap="$1">
            <DetailRow
              label="Route"
              value={`${getChainDisplayName(fromChainId)} → ${getChainDisplayName(targetChainId)}`}
            />
            <DetailRow label="Provider" value={PROTOCOL_LABELS[protocol]} />
            <DetailRow
              label="Protocol fee"
              value={`${protocolFeePercent}% (${formatTokenAmount(
                formatUnits(quote.protocolFee, getChainDecimals(targetChainId)),
              )} G$)`}
            />
            <DetailRow
              label="Estimated provider fee"
              value={formatChargedProviderFee(quote.fee, fromChainId)}
            />
          </RouteSelectionCard>

          {walletChainId !== fromChainId && (
            <Text testID="BridgingWidget-review-switch-hint" fontSize={14} color="$secondaryColor">
              Confirm will ask your wallet to switch to {getChainDisplayName(fromChainId)}. Your wallet must support this network.
            </Text>
          )}

          <Separator />

          {!canConfirm && blockingReason && <Text color="$error">{blockingReason}</Text>}
          <XStack gap="$2">
            <Button flex={1} height={54} variant="secondary" onPress={onClose}>
              <ButtonText color="$text">Cancel</ButtonText>
            </Button>
            <Button
              flex={2}
              height={54}
              borderRadius="$full"
              testID="BridgingWidget-review-confirm"
              disabled={!canConfirm}
              onPress={onConfirm}
            >
              <ButtonText>Confirm</ButtonText>
            </Button>
          </XStack>
        </YStack>
      </ScrollArea>
    </Drawer>
  )
}
