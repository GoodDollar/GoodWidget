import React from 'react'
import {
  Anchor,
  ChainBadge,
  Icon,
  Stepper,
  type StepperStepItem,
  Text,
  XStack,
  YStack,
  getChainDisplayName,
} from '@goodwidget/ui'
import type { BridgeProtocol, TransactionStatus } from '@goodsdks/bridging-sdk'
import type { Hash } from 'viem'
import type { BridgeSubmissionStep } from '../adapter/useBridgeSubmission'
import { DetailRow, PROTOCOL_LABELS, RouteSelectionCard } from './shared'

interface BridgeProgressProps {
  fromChainId: number
  targetChainId: number
  protocol: BridgeProtocol
  amountLabel: string
  submissionStep: BridgeSubmissionStep
  submissionFailedAtStep: 'approving' | 'bridging' | null
  submissionError: string | null
  needsApproval: boolean
  sourceTxHash: Hash | null
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
        <Text>{children}</Text>
        <Icon name="external-link" size="xs" color="primary" />
      </XStack>
    </Anchor>
  )
}

export function BridgeProgress({
  fromChainId,
  targetChainId,
  protocol,
  amountLabel,
  submissionStep,
  submissionFailedAtStep,
  submissionError,
  needsApproval,
  sourceTxHash,
  deliveryStatus,
  deliveryStatusError,
  sourceExplorerLink,
  providerExplorerLink,
  destinationExplorerLink,
}: BridgeProgressProps) {
  const sourceFailed = submissionStep === 'failed' && submissionFailedAtStep === 'bridging'
  const approvalFailed = submissionStep === 'failed' && submissionFailedAtStep === 'approving'
  const sourceStatus: StepperStepItem['status'] = sourceFailed
    ? 'failed'
    : submissionStep === 'bridging'
      ? 'active'
      : submissionStep === 'completed'
        ? 'completed'
        : 'pending'
  const deliveryStepStatus: StepperStepItem['status'] = deliveryStatus?.status === 'completed'
    ? 'completed'
    : deliveryStatus?.status === 'failed'
      ? 'failed'
      : submissionStep === 'completed'
        ? 'active'
        : 'pending'
  const steps: StepperStepItem[] = []

  if (needsApproval) {
    steps.push({
      id: 'approval',
      title: 'Approve G$',
      description: approvalFailed ? submissionError ?? 'Approval failed.' : 'Confirm the token approval in your wallet.',
      status: approvalFailed
        ? 'failed'
        : submissionStep === 'approving'
          ? 'active'
          : submissionStep === 'bridging' || submissionStep === 'completed'
            ? 'completed'
            : 'pending',
    })
  }

  steps.push(
    {
      id: 'source',
      title: `Submit on ${getChainDisplayName(fromChainId)}`,
      description: sourceFailed
        ? submissionError ?? 'The source-chain transaction failed.'
        : submissionStep === 'bridging'
          ? 'Confirm the bridge transaction in your wallet.'
          : undefined,
      status: sourceStatus,
    },
    {
      id: 'destination',
      title: `Deliver on ${getChainDisplayName(targetChainId)}`,
      description: deliveryStatus?.status === 'failed'
        ? deliveryStatus.error ?? 'The provider reported a delivery failure.'
        : deliveryStatusError ?? (submissionStep === 'completed'
          ? `Waiting for ${PROTOCOL_LABELS[protocol]} to deliver the transfer.`
          : undefined),
      status: deliveryStepStatus,
    },
  )

  const title = deliveryStatus?.status === 'completed'
    ? 'Bridge complete'
    : deliveryStatus?.status === 'failed'
      ? 'Delivery failed'
      : sourceFailed || approvalFailed
        ? 'Bridge failed'
        : submissionStep === 'completed'
          ? 'Bridging in progress'
          : submissionStep === 'bridging'
            ? 'Confirm bridge transaction'
            : 'Preparing bridge'
  return (
    <YStack testID="BridgingWidget-bridge-progress" gap="$3" width="100%">
      <Text testID="BridgingWidget-delivery-status" fontSize={22} fontWeight="700" textAlign="center">
        {title}
      </Text>
      <XStack alignItems="center" justifyContent="center" gap="$3">
        <ChainBadge chainId={fromChainId} />
        <Icon name="arrow-right" size="sm" color="primary" />
        <ChainBadge chainId={targetChainId} />
      </XStack>
      <RouteSelectionCard raised alignItems="center" gap="$1">
        <Text secondary>G$ sent</Text>
        <Text fontSize={26} fontWeight="800" color="$textColor">{amountLabel}</Text>
        <DetailRow label="Route" value={`${getChainDisplayName(fromChainId)} → ${getChainDisplayName(targetChainId)}`} />
        <DetailRow label="Provider" value={PROTOCOL_LABELS[protocol]} />
      </RouteSelectionCard>
      <Stepper steps={steps} activeStepId={null} maxHeight={260} />
      {submissionStep === 'completed' && !deliveryStatusError && deliveryStatus?.status === 'pending' && (
        <Text secondary textAlign="center">
          The source transaction is confirmed. Destination delivery can take several minutes.
        </Text>
      )}
      {deliveryStatusError && (
        <Text color="$warning" textAlign="center">{deliveryStatusError}</Text>
      )}
      {sourceFailed && submissionError && (
        <Text color="$error" textAlign="center">{submissionError}</Text>
      )}
      <XStack justifyContent="center" flexWrap="wrap" gap="$3">
        <ExplorerLink href={sourceExplorerLink}>
          {`Source transaction${sourceTxHash ? ` ${sourceTxHash.slice(0, 8)}…` : ''}`}
        </ExplorerLink>
        <ExplorerLink href={providerExplorerLink}>{`Track on ${PROTOCOL_LABELS[protocol]}`}</ExplorerLink>
        <ExplorerLink href={destinationExplorerLink}>
          {`Destination transaction${deliveryStatus?.dstTxHash ? ` ${deliveryStatus.dstTxHash.slice(0, 8)}…` : ''}`}
        </ExplorerLink>
      </XStack>
    </YStack>
  )
}
