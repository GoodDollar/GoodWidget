import React, { useEffect, useState } from 'react'
import {
  AddressDisplay,
  Badge,
  BadgeText,
  ButtonText,
  Icon,
  Separator,
  Spinner,
  Text,
  TokenAmount,
  XStack,
  YStack,
} from '@goodwidget/ui'
import type { StreamListItem, WriteStatus } from '../widgetRuntimeContract'
import {
  formatDateTime,
  formatDuration,
  formatFlowRatePerDay,
  formatFlowRatePerMonth,
  formatTimestamp,
  formatWeiAmount,
  liveStreamedAmount,
} from './format'
import {
  ActionButton,
  SecondaryButtonText,
  StreamRow,
  type SuperTokenSymbol,
} from './shared'

interface StreamCardProps {
  stream: StreamListItem
  /** Chain-derived fallback, used when the subgraph reports no symbol */
  token: SuperTokenSymbol
  /** Provided on the Streams tab to open the set-stream form for this stream */
  onEdit?: (stream: StreamListItem) => void
  /** Provided on the Streams tab to stop this stream (flow rate 0) */
  onCancel?: (stream: StreamListItem) => void
  cancelStatus?: WriteStatus
  cancelError?: string | null
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <XStack justifyContent="space-between" alignItems="center" gap="$2">
      <Text variant="caption" secondary>
        {label}
      </Text>
      {children}
    </XStack>
  )
}

export function StreamCard({
  stream,
  token,
  onEdit,
  onCancel,
  cancelStatus = 'idle',
  cancelError = null,
}: StreamCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000))

  // A running stream keeps accruing, so tick the streamed total while it is on show.
  useEffect(() => {
    if (!expanded || !stream.isActive) return

    const timer = setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(timer)
  }, [expanded, stream.isActive])

  const counterparty =
    stream.direction === 'outgoing' ? stream.receiver : stream.sender
  const symbol = stream.tokenSymbol || token
  const flowPerMonth = formatFlowRatePerMonth(stream.flowRate)
  const endedAt = stream.closedAtTimestamp ?? stream.updatedAtTimestamp
  const durationSeconds =
    (stream.isActive ? nowSeconds : endedAt) - stream.createdAtTimestamp
  const streamedTotal = liveStreamedAmount(
    stream.streamedSoFar,
    stream.flowRate,
    stream.updatedAtTimestamp,
    stream.isActive,
    nowSeconds,
  )

  // Only the sender controls a flow, so incoming streams cannot be managed here.
  const isManageable = stream.isActive && stream.direction === 'outgoing'
  const showActions = isManageable && (!!onEdit || !!onCancel)
  const isCancelling = cancelStatus === 'pending'

  return (
    <StreamRow>
      <XStack
        justifyContent="space-between"
        alignItems="center"
        gap="$2"
        cursor="pointer"
        onPress={() => setExpanded((open) => !open)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse stream details' : 'Expand stream details'}
      >
        <XStack gap="$2" alignItems="center" flexShrink={1}>
          <Badge type={stream.direction === 'incoming' ? 'success' : 'info'}>
            <BadgeText>{stream.direction === 'incoming' ? 'Incoming' : 'Outgoing'}</BadgeText>
          </Badge>
          <Badge type={stream.isActive ? 'success' : 'default'}>
            <BadgeText>{stream.isActive ? 'Active' : 'Ended'}</BadgeText>
          </Badge>
        </XStack>

        <XStack gap="$1" alignItems="center">
          {stream.isActive ? (
            <>
              <TokenAmount token={symbol} amount={flowPerMonth} size="sm" />
              <Text variant="caption" secondary>
                /mo
              </Text>
            </>
          ) : (
            <Text variant="caption" secondary>
              {formatTimestamp(endedAt)}
            </Text>
          )}
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size="sm" />
        </XStack>
      </XStack>

      <XStack justifyContent="space-between" alignItems="center" gap="$2">
        <Text variant="caption" secondary>
          {stream.direction === 'outgoing' ? 'Recipient' : 'Sender'}
        </Text>
        <AddressDisplay address={counterparty} />
      </XStack>

      {expanded && (
        <YStack gap="$2">
          <Separator />

          <DetailRow label="Token">
            <Text variant="caption">{symbol}</Text>
          </DetailRow>

          <DetailRow label="Flow rate">
            <XStack gap="$1" alignItems="baseline">
              <TokenAmount token={symbol} amount={flowPerMonth} size="sm" />
              <Text variant="caption" secondary>
                /mo
              </Text>
            </XStack>
          </DetailRow>

          <DetailRow label="Per day">
            <TokenAmount
              token={symbol}
              amount={formatFlowRatePerDay(stream.flowRate)}
              size="sm"
            />
          </DetailRow>

          <DetailRow label={stream.isActive ? 'Streamed so far' : 'Total streamed'}>
            <TokenAmount token={symbol} amount={formatWeiAmount(streamedTotal)} size="sm" />
          </DetailRow>

          <DetailRow label="Started">
            <Text variant="caption">{formatDateTime(stream.createdAtTimestamp)}</Text>
          </DetailRow>

          {!stream.isActive && (
            <DetailRow label="Ended">
              <Text variant="caption">{formatDateTime(endedAt)}</Text>
            </DetailRow>
          )}

          <DetailRow label={stream.isActive ? 'Running for' : 'Ran for'}>
            <Text variant="caption">{formatDuration(durationSeconds)}</Text>
          </DetailRow>

          <DetailRow label="Last updated">
            <Text variant="caption">{formatDateTime(stream.updatedAtTimestamp)}</Text>
          </DetailRow>

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
        </YStack>
      )}
    </StreamRow>
  )
}
