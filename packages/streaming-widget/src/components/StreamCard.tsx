import React from 'react'
import {
  AddressDisplay,
  Badge,
  BadgeText,
  Text,
  TokenAmount,
  XStack,
} from '@goodwidget/ui'
import type { StreamListItem } from '../widgetRuntimeContract'
import {
  formatFlowRatePerMonth,
  formatTimestamp,
  formatWeiAmount,
} from './format'
import { StreamRow, type SuperTokenSymbol } from './shared'

interface StreamCardProps {
  stream: StreamListItem
  token: SuperTokenSymbol
}

export function StreamCard({ stream, token }: StreamCardProps) {
  const counterparty =
    stream.direction === 'outgoing' ? stream.receiver : stream.sender
  const flowPerMonth = formatFlowRatePerMonth(stream.flowRate)

  return (
    <StreamRow>
      <XStack justifyContent="space-between" alignItems="center">
        <Badge type={stream.direction === 'incoming' ? 'success' : 'info'}>
          <BadgeText>{stream.direction === 'incoming' ? 'Incoming' : 'Outgoing'}</BadgeText>
        </Badge>
        <Text variant="caption" secondary>
          Since {formatTimestamp(stream.createdAtTimestamp)}
        </Text>
      </XStack>

      <AddressDisplay address={counterparty} />

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

      {stream.streamedSoFar > 0n && (
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="caption" secondary>
            Streamed so far
          </Text>
          <TokenAmount token={token} amount={formatWeiAmount(stream.streamedSoFar)} size="sm" />
        </XStack>
      )}
    </StreamRow>
  )
}
