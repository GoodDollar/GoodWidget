import React from 'react'
import { Anchor, Icon, Stepper, type StepperStepItem, Text, XStack, YStack, getChainDisplayName } from '@goodwidget/ui'
import type { BridgeProtocol, TransactionStatus } from '@goodsdks/bridging-sdk'
import type { Hash } from 'viem'
import { PROTOCOL_LABELS, RouteSelectionCard } from './shared'

interface BridgeProgressProps {
  fromChainId: number
  targetChainId: number
  protocol: BridgeProtocol
  amountLabel: string
  sourceTxHash: Hash | null
  sourceTimestamp?: number
  deliveryStatus: TransactionStatus | null
  deliveryStatusError: string | null
  sourceExplorerLink: string | null
  providerExplorerLink: string | null
  destinationExplorerLink: string | null
}

function ExplorerLink({ href, children }: { href: string | null; children: string }) {
  if (!href) return null
  return (
    <Anchor href={href}>
      <XStack alignItems="center" gap="$1">
        <Text color="$primary">{children}</Text>
        <Icon name="external-link" size="xs" color="primary" />
      </XStack>
    </Anchor>
  )
}

export function getBridgeProgressTitle(status: TransactionStatus | null): string {
  if (status?.status === 'completed') return 'Bridge complete'
  if (status?.status === 'failed') return 'Delivery failed'
  return 'Bridging in progress'
}

export function BridgeProgress({
  fromChainId, targetChainId, protocol, amountLabel, sourceTxHash, sourceTimestamp, deliveryStatus,
  deliveryStatusError, sourceExplorerLink, providerExplorerLink, destinationExplorerLink,
}: BridgeProgressProps) {
  const provider = PROTOCOL_LABELS[protocol]
  const destination = getChainDisplayName(targetChainId)
  const delivered = deliveryStatus?.status === 'completed'
  const failed = deliveryStatus?.status === 'failed'
  // The SDK's timestamp is the provider's message creation time, not the delivery time.
  const messageTimestamp = deliveryStatus?.timestamp
  const messageTime = messageTimestamp && Number.isFinite(messageTimestamp)
    ? new Date(messageTimestamp).toLocaleString()
    : undefined
  const messageFound = Boolean(delivered || deliveryStatus?.dstTxHash || messageTime)
  const steps: StepperStepItem[] = [
    {
      id: 'source', title: `Submitted on ${getChainDisplayName(fromChainId)}`, status: 'completed',
      detail: sourceTimestamp ? new Date(sourceTimestamp * 1000).toLocaleString() : undefined,
    },
    {
      id: 'message', title: 'Message sent',
      detail: messageTime,
      description: failed && !messageFound ? 'The provider reported a delivery failure.' : undefined,
      status: messageFound ? 'completed' : failed ? 'failed' : 'active',
    },
    {
      id: 'destination', title: `Processing on ${destination}`,
      description: failed && messageFound ? deliveryStatus?.error ?? 'The provider reported a delivery failure.' : undefined,
      status: delivered ? 'completed' : failed && messageFound ? 'failed' : messageFound ? 'active' : 'pending',
    },
    { id: 'complete', title: 'Complete', status: delivered ? 'completed' : 'pending' },
  ]

  return (
    <YStack testID="BridgingWidget-bridge-progress" gap="$3" width="100%">
      <Text secondary>
        {delivered
          ? `Your ${amountLabel} G$ transfer to ${destination} via ${provider} is complete.`
          : failed
            ? `Your ${amountLabel} G$ transfer to ${destination} via ${provider} could not be delivered.`
            : `Your ${amountLabel} G$ is on its way to ${destination} via ${provider}.`}
      </Text>
      <Stepper steps={steps} activeStepId={null} maxHeight={300} />
      {deliveryStatusError && <Text color="$warning">{deliveryStatusError}</Text>}
      {(sourceExplorerLink || providerExplorerLink || destinationExplorerLink) && (
        <RouteSelectionCard padding="$3" gap="$2">
          <Text variant="label">Transaction details</Text>
          <ExplorerLink href={sourceExplorerLink}>
            {`Source transaction${sourceTxHash ? ` ${sourceTxHash.slice(0, 8)}\u2026` : ''}`}
          </ExplorerLink>
          <ExplorerLink href={providerExplorerLink}>{`Track on ${provider}`}</ExplorerLink>
          <ExplorerLink href={destinationExplorerLink}>{'Destination transaction'}</ExplorerLink>
        </RouteSelectionCard>
      )}
    </YStack>
  )
}
