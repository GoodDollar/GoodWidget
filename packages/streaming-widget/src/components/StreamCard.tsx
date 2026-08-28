import React from 'react'
import {
  AddressDisplay,
  Badge,
  BadgeText,
  ButtonText,
  Spinner,
  Text,
  TokenAmount,
  XStack,
} from '@goodwidget/ui'
import type { StreamListItem, WriteStatus } from '../widgetRuntimeContract'
import {
  formatFlowRatePerMonth,
  formatTimestamp,
  formatWeiAmount,
} from './format'
import {
  ActionButton,
  SecondaryButtonText,
  StreamRow,
  type SuperTokenSymbol,
} from './shared'

interface StreamCardProps {
  stream: StreamListItem
  token: SuperTokenSymbol
  /** Provided on the Streams tab to open the set-stream form for this stream */
  onEdit?: (stream: StreamListItem) => void
  /** Provided on the Streams tab to stop this stream (flow rate 0) */
  onCancel?: (stream: StreamListItem) => void
  cancelStatus?: WriteStatus
  cancelError?: string | null
}

export function StreamCard({
  stream,
  token,
  onEdit,
  onCancel,
  cancelStatus = 'idle',
  cancelError = null,
}: StreamCardProps) {
  const counterparty =
    stream.direction === 'outgoing' ? stream.receiver : stream.sender
  const flowPerMonth = formatFlowRatePerMonth(stream.flowRate)
  // Only the sender controls a flow, so incoming streams cannot be managed here.
  const isManageable = stream.isActive && stream.direction === 'outgoing'
  const showActions = isManageable && (!!onEdit || !!onCancel)
  const isCancelling = cancelStatus === 'pending'

  return (
    <StreamRow>
      <XStack justifyContent="space-between" alignItems="center">
        <Badge type={stream.direction === 'incoming' ? 'success' : 'info'}>
          <BadgeText>{stream.direction === 'incoming' ? 'Incoming' : 'Outgoing'}</BadgeText>
        </Badge>
        <Text variant="caption" secondary>
          {stream.isActive
            ? `Since ${formatTimestamp(stream.createdAtTimestamp)}`
            : `Ended ${formatTimestamp(stream.closedAtTimestamp ?? stream.updatedAtTimestamp)}`}
        </Text>
      </XStack>

      <AddressDisplay address={counterparty} />

      {stream.isActive && (
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="caption" secondary>
            Flow rate
          </Text>
          <XStack gap="$1" alignItems="baseline">
            <TokenAmount token={token} amount={flowPerMonth} size="sm" />
            <Text variant="caption" secondary>
              /mo
            </Text>
          </XStack>
        </XStack>
      )}

      {stream.streamedSoFar > 0n && (
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="caption" secondary>
            {stream.isActive ? 'Streamed so far' : 'Total streamed'}
          </Text>
          <TokenAmount token={token} amount={formatWeiAmount(stream.streamedSoFar)} size="sm" />
        </XStack>
      )}

      {cancelStatus === 'error' && cancelError && (
        <Text color="$error" variant="caption">
          {cancelError}
        </Text>
      )}

      {showActions && (
        <XStack gap="$2">
          {onEdit && (
            <ActionButton
              flex={1}
              variant="secondary"
              disabled={isCancelling}
              onPress={() => onEdit(stream)}
            >
              <SecondaryButtonText>Update</SecondaryButtonText>
            </ActionButton>
          )}
          {onCancel && (
            <ActionButton flex={1} disabled={isCancelling} onPress={() => onCancel(stream)}>
              {isCancelling ? <Spinner size="sm" /> : <ButtonText>Cancel stream</ButtonText>}
            </ActionButton>
          )}
        </XStack>
      )}
    </StreamRow>
  )
}
