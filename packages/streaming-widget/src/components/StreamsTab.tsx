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
  editingStreamId: string | null
  cancelStreamStatus: Record<string, WriteStatus>
  cancelStreamError: Record<string, string | null>
  initialFormOpen?: boolean
  onRefresh: () => void
  onUpdateSetStreamForm: (partial: Partial<SetStreamFormState>) => void
  onSubmitSetStream: () => void
  onResetSetStream: () => void
  onEditStream: (stream: StreamListItem) => void
  onCancelStream: (stream: StreamListItem) => void
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
  editingStreamId,
  cancelStreamStatus,
  cancelStreamError,
  initialFormOpen = false,
  onRefresh,
  onUpdateSetStreamForm,
  onSubmitSetStream,
  onResetSetStream,
  onEditStream,
  onCancelStream,
}: StreamsTabProps) {
  const [direction, setDirection] = useState<StreamDirection>('all')
  const [showForm, setShowForm] = useState(initialFormOpen)

  // Picking Update on a stream card prefills the form, so it must open the form too.
  const isFormOpen = showForm || editingStreamId !== null
  const filteredStreams = streams.filter(
    (stream) => direction === 'all' || stream.direction === direction,
  )
  const emptyStreamsMessage =
    direction === 'all' ? 'No active streams found.' : `No active ${direction} streams found.`
  const activeToken = tokenSymbol(chainId)

  const closeForm = () => {
    onResetSetStream()
    setShowForm(false)
  }

  return (
    <StreamingTabContent>
      <XStack justifyContent="flex-end">
        <ActionButton onPress={() => (isFormOpen ? closeForm() : setShowForm(true))}>
          <ButtonText>{isFormOpen ? 'Close' : '+ New Stream'}</ButtonText>
        </ActionButton>
      </XStack>

      {isFormOpen && (
        <SetStreamForm
          form={setStreamForm}
          token={activeToken}
          status={setStreamStatus}
          error={setStreamError}
          txHash={setStreamTxHash}
          isEditing={editingStreamId !== null}
          timeUnitOptions={TIME_UNIT_OPTIONS}
          onUpdate={onUpdateSetStreamForm}
          onSubmit={onSubmitSetStream}
          onReset={closeForm}
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
          <StreamCard
            key={stream.id}
            stream={stream}
            token={activeToken}
            onEdit={onEditStream}
            onCancel={onCancelStream}
            cancelStatus={cancelStreamStatus[stream.receiver.toLowerCase()] ?? 'idle'}
            cancelError={cancelStreamError[stream.receiver.toLowerCase()] ?? null}
          />
        ))}
    </StreamingTabContent>
  )
}
