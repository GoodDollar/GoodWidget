import React, { useState } from 'react'
import { ButtonText, Heading, Spinner, Text, XStack, YStack } from '@goodwidget/ui'
import type { StreamListItem, StreamStatusFilter } from '../widgetRuntimeContract'
import { tokenSymbol } from './format'
import { StreamCard } from './StreamCard'
import {
  EmptyStateCard,
  ErrorStateCard,
  ActionButton,
  SecondaryButtonText,
  StreamingTabContent,
} from './shared'

const PAGE_SIZE = 4

const STATUS_LABELS: Record<StreamStatusFilter, string> = {
  all: 'All',
  active: 'Active',
  ended: 'Ended',
}

const EMPTY_MESSAGES: Record<StreamStatusFilter, string> = {
  all: 'No stream history found.',
  active: 'No active streams found.',
  ended: 'No ended streams found.',
}

interface HistoryTabProps {
  streamHistory: StreamListItem[]
  loading: boolean
  error: string | null
  chainId: number | null
  onRefresh: () => void
}

export function HistoryTab({
  streamHistory,
  loading,
  error,
  chainId,
  onRefresh,
}: HistoryTabProps) {
  const [status, setStatus] = useState<StreamStatusFilter>('all')
  const [historyLimit, setHistoryLimit] = useState(PAGE_SIZE)

  const filteredStreams = streamHistory.filter((stream) => {
    if (status === 'active') return stream.isActive
    if (status === 'ended') return !stream.isActive
    return true
  })
  const recentStreams = filteredStreams.slice(0, historyLimit)
  const hasMoreHistory = filteredStreams.length > historyLimit
  const activeToken = tokenSymbol(chainId)

  const selectStatus = (next: StreamStatusFilter) => {
    setStatus(next)
    setHistoryLimit(PAGE_SIZE)
  }

  return (
    <StreamingTabContent>
      <XStack justifyContent="space-between" alignItems="center">
        <Heading level={4}>Stream history</Heading>
        <ActionButton variant="secondary" onPress={onRefresh}>
          <SecondaryButtonText>Refresh</SecondaryButtonText>
        </ActionButton>
      </XStack>

      <XStack gap="$2">
        {(['all', 'active', 'ended'] as StreamStatusFilter[]).map((filter) => (
          <ActionButton
            key={filter}
            onPress={() => selectStatus(filter)}
            variant={status === filter ? 'primary' : 'secondary'}
          >
            {status === filter ? (
              <ButtonText>{STATUS_LABELS[filter]}</ButtonText>
            ) : (
              <SecondaryButtonText>{STATUS_LABELS[filter]}</SecondaryButtonText>
            )}
          </ActionButton>
        ))}
      </XStack>

      {loading && (
        <YStack alignItems="center" paddingVertical="$4">
          <Spinner size="lg" />
          <Text secondary>Loading stream history...</Text>
        </YStack>
      )}

      {!loading && error && (
        <ErrorStateCard>
          <Text color="$error">{error}</Text>
          <ActionButton onPress={onRefresh}>
            <ButtonText>Retry</ButtonText>
          </ActionButton>
        </ErrorStateCard>
      )}

      {!loading && !error && recentStreams.length === 0 && (
        <EmptyStateCard>
          <Text secondary center>
            {EMPTY_MESSAGES[status]}
          </Text>
        </EmptyStateCard>
      )}

      {!loading &&
        !error &&
        recentStreams.map((stream) => (
          <StreamCard key={`history-${stream.id}`} stream={stream} token={activeToken} />
        ))}

      {!loading && !error && hasMoreHistory && (
        <ActionButton
          variant="secondary"
          onPress={() => setHistoryLimit((count) => count + PAGE_SIZE)}
        >
          <SecondaryButtonText>Show more</SecondaryButtonText>
        </ActionButton>
      )}
    </StreamingTabContent>
  )
}
