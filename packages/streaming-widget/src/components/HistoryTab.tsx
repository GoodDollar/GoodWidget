import React, { useState } from 'react'
import { ButtonText, Heading, Spinner, Text, XStack, YStack } from '@goodwidget/ui'
import type { StreamListItem } from '../widgetRuntimeContract'
import { tokenSymbol } from './format'
import { StreamCard } from './StreamCard'
import {
  EmptyStateCard,
  ErrorStateCard,
  ActionButton,
  SecondaryButtonText,
  StreamingTabContent,
} from './shared'

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
  const [historyLimit, setHistoryLimit] = useState(4)
  const recentStreams = streamHistory.slice(0, historyLimit)
  const hasMoreHistory = streamHistory.length > historyLimit
  const activeToken = tokenSymbol(chainId)

  return (
    <StreamingTabContent>
      <XStack justifyContent="space-between" alignItems="center">
        <Heading level={4}>Stream history</Heading>
        <ActionButton variant="secondary" onPress={onRefresh}>
          <SecondaryButtonText>Refresh</SecondaryButtonText>
        </ActionButton>
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
            No stream history found.
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
          onPress={() => setHistoryLimit((count) => count + 4)}
        >
          <SecondaryButtonText>Show more</SecondaryButtonText>
        </ActionButton>
      )}
    </StreamingTabContent>
  )
}
