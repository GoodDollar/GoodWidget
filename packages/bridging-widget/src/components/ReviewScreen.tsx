import React from 'react'
import { formatUnits } from 'viem'
import {
  Button,
  ButtonText,
  ChainBadge,
  Drawer,
  Heading,
  Icon,
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
  targetChainId: number
  protocol: BridgeProtocol
  quote: BridgeFeeQuote
  onClose: () => void
  onConfirm: () => void
}

// Pre-submit summary drawer: mirrors the main Bridge tab's amount + fee
// fields (FeeBreakdown) plus a From/To hero and the provider-fee-paid-
// separately note, per issue #244's "Review/Confirm screen" requirement.
export function ReviewScreen({
  isOpen,
  fromChainId,
  targetChainId,
  protocol,
  quote,
  onClose,
  onConfirm,
}: ReviewScreenProps) {
  const amountSent = formatTokenAmount(formatUnits(quote.amount, getChainDecimals(fromChainId)))
  const amountReceived = formatTokenAmount(formatUnits(quote.amountReceived, getChainDecimals(targetChainId)))
  const protocolFeePercent = (Number(quote.protocolFeeBps) / BPS_DENOMINATOR) * 100

  return (
    <Drawer open={isOpen} onClose={onClose} height="full" hideCloseButton>
      <YStack testID="BridgingWidget-review-screen" gap="$4" width="100%">
        <XStack justifyContent="space-between" alignItems="center">
          <Heading level={4} color="$textColor">
            Review Bridge
          </Heading>
          <XStack cursor="pointer" onPress={onClose}>
            <Icon name="x" size="sm" color="muted" />
          </XStack>
        </XStack>

        <XStack alignItems="center" justifyContent="center" gap="$3">
          <ChainBadge chainId={fromChainId} />
          <Icon name="arrow-right" size="sm" color="primary" />
          <ChainBadge chainId={targetChainId} />
        </XStack>

        <RouteSelectionCard padding="$4" alignItems="center" gap="$1">
          <Text fontSize={14} fontWeight="400" color="$secondaryColor">
            G$ Sent
          </Text>
          <Text fontSize={28} fontWeight="800" color="$textColor">
            {amountSent}
          </Text>
        </RouteSelectionCard>

        <RouteSelectionCard padding="$4" gap="$2">
          <DetailRow label="Route" value={`${getChainDisplayName(targetChainId)} via ${PROTOCOL_LABELS[protocol]}`} />
          <DetailRow label="Provider" value={PROTOCOL_LABELS[protocol]} />
          <DetailRow
            label="Protocol fee"
            value={`${protocolFeePercent}% (${formatTokenAmount(
              formatUnits(quote.protocolFee, getChainDecimals(targetChainId)),
            )} G$)`}
          />
          <DetailRow label="Provider fee" value={`${formatChargedProviderFee(quote.fee, fromChainId)} (paid separately)`} />
          <DetailRow label="Estimated G$ received" value={`${amountReceived} G$`} />
        </RouteSelectionCard>

        <Separator />

        <XStack gap="$2">
          <Button flex={1} variant="secondary" onPress={onClose}>
            <ButtonText>Cancel</ButtonText>
          </Button>
          <Button
            flex={2}
            height={54}
            borderRadius="$full"
            testID="BridgingWidget-review-confirm"
            onPress={onConfirm}
          >
            <ButtonText>Confirm</ButtonText>
          </Button>
        </XStack>
      </YStack>
    </Drawer>
  )
}
