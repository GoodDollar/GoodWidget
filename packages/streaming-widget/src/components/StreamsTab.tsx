import React, { useState } from 'react'
import { ButtonText, Heading, Separator, Spinner, Text, XStack, YStack } from '@goodwidget/ui'
import type {
  SetStreamFormState,
  StreamDirection,
  StreamListItem,
  WriteStatus,
} from '../widgetRuntimeContract'
import { TIME_UNIT_OPTIONS, tokenSymbol } from './format'
import { SetStreamForm } from './SetStreamForm'
import { StreamCard } from './StreamCard'
import {
  EmptyStateCard,
  ErrorStateCard,
  ActionButton,
  SecondaryButtonText,
  StreamingTabContent,
} from './shared'

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
        <ActionButton onPress={() => setShowForm((visible) => !visible)}>
          <ButtonText>{showForm ? 'Cancel' : '+ New Stream'}</ButtonText>
        </ActionButton>
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

      <Heading level={4}>Active streams</Heading>

      <XStack gap="$2">
        {(['all', 'incoming', 'outgoing'] as StreamDirection[]).map((filter) => (
          <ActionButton
            key={filter}
            onPress={() => setDirection(filter)}
            variant={direction === filter ? 'primary' : 'secondary'}
          >
            {direction === filter ? (
              <ButtonText>{DIRECTION_LABELS[filter]}</ButtonText>
            ) : (
              <SecondaryButtonText>{DIRECTION_LABELS[filter]}</SecondaryButtonText>
            )}
          </ActionButton>
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
          <ActionButton onPress={onRefresh}>
            <ButtonText>Retry</ButtonText>
          </ActionButton>
        </ErrorStateCard>
      )}

      {!loading && !error && filteredStreams.length === 0 && (
        <EmptyStateCard>
          <Text secondary center>
            {emptyStreamsMessage}
          </Text>
          <ActionButton onPress={onRefresh}>
            <ButtonText>Refresh</ButtonText>
          </ActionButton>
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
