import React from 'react'
import { formatUnits } from 'viem'
import { Spinner, Text, XStack, getChainDisplayName } from '@goodwidget/ui'
import type { BridgeFeeQuote, BridgeProtocol } from '@goodsdks/bridging-sdk'
import { formatChargedProviderFee, getChainDecimals } from '../adapter/chains'
import { formatTokenAmount } from '../amount'
import { DetailRow, PROTOCOL_LABELS, RouteSelectionCard } from './shared'

const BPS_DENOMINATOR = 10_000

interface FeeBreakdownProps {
  sourceChainId: number
  targetChainId: number | null
  protocol: BridgeProtocol
  quoteStatus: 'idle' | 'loading' | 'ready' | 'error'
  quote: BridgeFeeQuote | null
  needsApproval: boolean
  quoteError: string | null
}

// Route summary + fee quote for the amount currently entered. Stays quiet
// (renders nothing) until the user has typed an amount, since there is
// nothing to break down yet.
export function FeeBreakdown({
  sourceChainId,
  targetChainId,
  protocol,
  quoteStatus,
  quote,
  needsApproval,
  quoteError,
}: FeeBreakdownProps) {
  if (quoteStatus === 'idle' || targetChainId === null) return null

  if (quoteStatus === 'loading') {
    return (
      <RouteSelectionCard testID="BridgingWidget-fee-breakdown">
        <XStack gap="$2" alignItems="center" justifyContent="center">
          <Spinner size="sm" />
          <Text secondary>Fetching quote…</Text>
        </XStack>
      </RouteSelectionCard>
    )
  }

  if (quoteStatus === 'error') {
    return (
      <RouteSelectionCard testID="BridgingWidget-fee-breakdown">
        <Text color="$error">{quoteError ?? 'Unable to fetch a quote for this amount.'}</Text>
      </RouteSelectionCard>
    )
  }

  return (
    <RouteSelectionCard padding="$3" gap="$1" testID="BridgingWidget-fee-breakdown">
      <DetailRow label="Route" value={`${getChainDisplayName(sourceChainId)} → ${getChainDisplayName(targetChainId)}`} />
      <DetailRow label="Provider" value={PROTOCOL_LABELS[protocol]} />
      {quote && (
        <>
          <DetailRow
            label="Protocol fee"
            value={`${(Number(quote.protocolFeeBps) / BPS_DENOMINATOR) * 100}% (${formatTokenAmount(
              formatUnits(quote.protocolFee, getChainDecimals(targetChainId)),
            )} G$)`}
          />
          <DetailRow label="Estimated provider fee" value={formatChargedProviderFee(quote.fee, sourceChainId)} />
        </>
      )}
      {needsApproval && (
        <Text fontSize={12} color="$warning">
          This amount needs a one-time G$ approval before it can bridge.
        </Text>
      )}
    </RouteSelectionCard>
  )
}
