import React, { useState } from 'react'
import {
  Button,
  ButtonText,
  Heading,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@goodwidget/ui'
import type { StreamListItem } from '../widgetRuntimeContract'
import { tokenSymbol } from './format'
import { StreamCard } from './StreamCard'
import { EmptyStateCard, ErrorStateCard, StreamingTabContent } from './shared'

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
        <Heading level={4} color="$white">
          Stream history
        </Heading>
        <Button variant="secondary" onPress={onRefresh}>
          <ButtonText>Refresh</ButtonText>
        </Button>
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
          <Button onPress={onRefresh}>
            <ButtonText>Retry</ButtonText>
          </Button>
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
        <Button variant="secondary" onPress={() => setHistoryLimit((count) => count + 4)}>
          <ButtonText>Show more</ButtonText>
        </Button>
      )}
    </StreamingTabContent>
  )
}
