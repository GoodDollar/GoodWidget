import React, { useState } from 'react'
import {
  Button,
  ButtonText,
  Heading,
  Separator,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@goodwidget/ui'
import type {
  SetStreamFormState,
  StreamDirection,
  StreamListItem,
  WriteStatus,
} from '../widgetRuntimeContract'
import { TIME_UNIT_OPTIONS, tokenSymbol } from './format'
import { SetStreamForm } from './SetStreamForm'
import { StreamCard } from './StreamCard'
import { EmptyStateCard, ErrorStateCard, StreamingTabContent } from './shared'

const DIRECTION_LABELS: Record<StreamDirection, string> = {
  all: 'All',
  incoming: 'Incoming',
  outgoing: 'Outgoing',
}

interface StreamsTabProps {
  streams: StreamListItem[]
  loading: boolean
  error: string | null
  chainId: number | null
  setStreamForm: SetStreamFormState
  setStreamStatus: WriteStatus
  setStreamError: string | null
  setStreamTxHash: string | null
  initialFormOpen?: boolean
  onRefresh: () => void
  onUpdateSetStreamForm: (partial: Partial<SetStreamFormState>) => void
  onSubmitSetStream: () => void
  onResetSetStream: () => void
}

export function StreamsTab({
  streams,
  loading,
  error,
  chainId,
  setStreamForm,
  setStreamStatus,
  setStreamError,
  setStreamTxHash,
  initialFormOpen = false,
  onRefresh,
  onUpdateSetStreamForm,
  onSubmitSetStream,
  onResetSetStream,
}: StreamsTabProps) {
  const [direction, setDirection] = useState<StreamDirection>('all')
  const [showForm, setShowForm] = useState(initialFormOpen)

  const filteredStreams = streams.filter(
    (stream) => direction === 'all' || stream.direction === direction,
  )
  const emptyStreamsMessage =
    direction === 'all' ? 'No streams found.' : `No ${direction} streams found.`
  const activeToken = tokenSymbol(chainId)

  return (
    <StreamingTabContent>
      <XStack justifyContent="flex-end">
        <Button onPress={() => setShowForm((visible) => !visible)}>
          <ButtonText>{showForm ? 'Cancel' : '+ New Stream'}</ButtonText>
        </Button>
      </XStack>

      {showForm && (
        <SetStreamForm
          form={setStreamForm}
          token={activeToken}
          status={setStreamStatus}
          error={setStreamError}
          txHash={setStreamTxHash}
          timeUnitOptions={TIME_UNIT_OPTIONS}
          onUpdate={onUpdateSetStreamForm}
          onSubmit={onSubmitSetStream}
          onReset={() => {
            onResetSetStream()
            setShowForm(false)
          }}
        />
      )}

      <Separator />

      <Heading level={4} color="$white">
        Active streams
      </Heading>

      <XStack gap="$2">
        {(['all', 'incoming', 'outgoing'] as StreamDirection[]).map((filter) => (
          <Button
            key={filter}
            onPress={() => setDirection(filter)}
            variant={direction === filter ? 'primary' : 'secondary'}
          >
            <ButtonText>{DIRECTION_LABELS[filter]}</ButtonText>
          </Button>
        ))}
      </XStack>

      {loading && (
        <YStack alignItems="center" paddingVertical="$4">
          <Spinner size="lg" />
          <Text secondary>Loading streams...</Text>
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

      {!loading && !error && filteredStreams.length === 0 && (
        <EmptyStateCard>
          <Text secondary center>
            {emptyStreamsMessage}
          </Text>
          <Button onPress={onRefresh}>
            <ButtonText>Refresh</ButtonText>
          </Button>
        </EmptyStateCard>
      )}

      {!loading &&
        !error &&
        filteredStreams.map((stream) => (
          <StreamCard key={stream.id} stream={stream} token={activeToken} />
        ))}
    </StreamingTabContent>
  )
}
