import React from 'react'
import { formatUnits } from 'viem'
import {
  Anchor,
  Button,
  ButtonText,
  Drawer,
  Heading,
  Icon,
  Stepper,
  type StepperStepItem,
  Text,
  XStack,
  YStack,
  getChainDisplayName,
} from '@goodwidget/ui'
import type { BridgeTransaction } from '@goodsdks/bridging-sdk'
import { formatTokenAmount } from '../amount'
import { PROTOCOL_LABELS } from './shared'

const G_DOLLAR_DECIMALS = 18

interface BridgeHistoryDetailModalProps {
  transaction: BridgeTransaction | null
  explorerLink: string | null
  onClose: () => void
}

// Read-only progress view for a tapped History row. Unlike BridgeConfirmModal
// (which drives a live doBridge() call with approve/retry actions) this
// transfer already happened on-chain — there is nothing to resubmit, so it
// only ever shows where the transfer currently stands. Still built on the
// same shared Stepper, satisfying issue #244's "tapping a pending entry
// reopens the confirm modal" as the same visual/status language, not a
// literal re-render of the submit flow.
export function BridgeHistoryDetailModal({ transaction, explorerLink, onClose }: BridgeHistoryDetailModalProps) {
  if (!transaction) return null

  const { status } = transaction.status
  const steps: StepperStepItem[] = [
    {
      id: 'source',
      title: `Sent on ${getChainDisplayName(transaction.fromChainId)}`,
      status: 'completed',
    },
    {
      id: 'destination',
      title: `Delivered on ${getChainDisplayName(transaction.toChainId)}`,
      description: status === 'failed' ? transaction.status.error ?? 'Delivery failed.' : undefined,
      status: status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'active',
    },
  ]

  return (
    <Drawer open={transaction !== null} onClose={onClose} height="half" hideCloseButton>
      <YStack testID="BridgingWidget-history-detail" gap="$4" width="100%">
        <XStack justifyContent="space-between" alignItems="center">
          <Heading level={4} color="$textColor">
            {PROTOCOL_LABELS[transaction.protocol]} Bridge
          </Heading>
          <XStack cursor="pointer" onPress={onClose}>
            <Icon name="x" size="sm" color="muted" />
          </XStack>
        </XStack>

        <Text fontSize={24} fontWeight="800" textAlign="center">
          {formatTokenAmount(formatUnits(transaction.amount, G_DOLLAR_DECIMALS))} G$
        </Text>

        <Stepper steps={steps} maxHeight={200} />

        {explorerLink && (
          <Anchor href={explorerLink}>
            <Button variant="secondary" fullWidth>
              <ButtonText>View on explorer</ButtonText>
            </Button>
          </Anchor>
        )}
      </YStack>
    </Drawer>
  )
}
