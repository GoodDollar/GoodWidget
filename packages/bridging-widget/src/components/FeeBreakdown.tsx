import React from 'react'
import { formatUnits } from 'viem'
import { Spinner, Text, XStack, getChainDisplayName } from '@goodwidget/ui'
import type { BridgeFeeQuote, BridgeProtocol, BridgeRequirement } from '@goodsdks/bridging-sdk'
import { formatTokenAmount } from '../amount'
import { primaryRequirementMessage } from '../adapter/errors'
import { DetailRow, PROTOCOL_LABELS, RouteSelectionCard } from './shared'

const G_DOLLAR_DECIMALS = 18
const BPS_DENOMINATOR = 10_000

interface FeeBreakdownProps {
  targetChainId: number | null
  protocol: BridgeProtocol
  quoteStatus: 'idle' | 'loading' | 'ready' | 'error'
  quote: BridgeFeeQuote | null
  needsApproval: boolean
  requirements: BridgeRequirement[]
  quoteError: string | null
}

// Route summary + fee quote for the amount currently entered. Stays quiet
// (renders nothing) until the user has typed an amount, since there is
// nothing to break down yet.
export function FeeBreakdown({
  targetChainId,
  protocol,
  quoteStatus,
  quote,
  needsApproval,
  requirements,
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

  const requirementMessage = primaryRequirementMessage(requirements)

  return (
    <RouteSelectionCard testID="BridgingWidget-fee-breakdown">
      <DetailRow label="Route" value={`${getChainDisplayName(targetChainId)} via ${PROTOCOL_LABELS[protocol]}`} />
      {quote && (
        <>
          <DetailRow
            label="Protocol fee"
            value={`${(Number(quote.protocolFeeBps) / BPS_DENOMINATOR) * 100}% (${formatTokenAmount(
              formatUnits(quote.protocolFee, G_DOLLAR_DECIMALS),
            )} G$)`}
          />
          <DetailRow label="Provider fee" value={`${quote.feeInNative} (paid separately, source-chain native token)`} />
          <DetailRow
            label="Estimated G$ received"
            value={`${formatTokenAmount(formatUnits(quote.amountReceived, G_DOLLAR_DECIMALS))} G$`}
          />
        </>
      )}
      {needsApproval && (
        <Text fontSize={12} color="$warning">
          This amount needs a one-time G$ approval before it can bridge.
        </Text>
      )}
      {requirementMessage && (
        <Text fontSize={12} color="$error">
          {requirementMessage}
        </Text>
      )}
    </RouteSelectionCard>
  )
}
