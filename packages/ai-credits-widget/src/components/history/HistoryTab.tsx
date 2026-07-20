import React from 'react'
import {
  Button,
  ButtonText,
  Card,
  Heading,
  Input,
  Select,
  Separator,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@goodwidget/ui'
import type { GdCreditEntry } from '../../backendTypes'
import { usdToCredits, weiToG } from '../../quoteMath'
import { InfoTooltip } from '../shared/tooltips'
import { compactButtonProps } from '../shared/styles'
import type {
  AiCreditsHistoryActions,
  AiCreditsHistoryState,
  CreditHistorySource,
  CreditHistoryStatusFilter,
} from '../../useAiCreditsHistory'
import {
  HISTORY_SOURCE_OPTIONS,
} from '../../useAiCreditsHistory'

const STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Funded', value: 'funded' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' },
]

export interface HistoryTabProps {
  state: AiCreditsHistoryState
  actions: AiCreditsHistoryActions
}

function sourceLabel(source: CreditHistorySource): string {
  if (source === 'deposit') return 'G$ deposit'
  if (source === 'streamUpdate') return 'Stream update'
  return 'Stream credit'
}

function formatEntryDate(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return createdAt
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCredits(totalCreditUsd: string): string | null {
  const micro = BigInt(totalCreditUsd || '0')
  if (micro <= 0n) return null
  return `+${usdToCredits(micro.toString())} cr`
}

function formatGAmount(gdAmountWei: string): string | null {
  const amountWei = BigInt(gdAmountWei || '0')
  if (amountWei <= 0n) return null
  return `${weiToG(amountWei)} G$`
}

function amountSummary(entry: GdCreditEntry): string | null {
  if (entry.source === 'streamUpdate') {
    const gAmount = formatGAmount(entry.gdAmountWei)
    return gAmount ? `${gAmount}/mo` : null
  }
  return formatCredits(entry.totalCreditUsd) ?? formatGAmount(entry.gdAmountWei)
}

function entryTooltip(entry: GdCreditEntry): string {
  const lines = [
    `Source: ${entry.source}`,
    `Status: ${entry.fundingStatus}`,
    `Credits: ${usdToCredits(entry.totalCreditUsd)}`,
  ]
  const gAmount = formatGAmount(entry.gdAmountWei)
  if (gAmount) lines.push(`G$: ${gAmount}`)
  if (entry.txHash) lines.push(`Tx: ${entry.txHash}`)
  if (entry.fundingTxHash) lines.push(`Funding tx: ${entry.fundingTxHash}`)
  if (entry.fundingError) lines.push(`Error: ${entry.fundingError}`)
  return lines.join('\n')
}

function CreditHistoryEntryRow({ entry }: { entry: GdCreditEntry }) {
  const failed = entry.fundingStatus === 'failed'
  const color = failed ? '$error' : '$color'
  const amount = amountSummary(entry)
  const parts = [sourceLabel(entry.source), formatEntryDate(entry.createdAt)]
  if (amount) parts.push(amount)
  if (entry.source !== 'streamUpdate' || BigInt(entry.totalCreditUsd || '0') > 0n) {
    parts.push(entry.fundingStatus)
  }

  return (
    <YStack gap="$1">
      <Separator />
      <XStack justifyContent="space-between" alignItems="flex-start" gap="$2">
        <Text fontSize="$2" fontWeight="600" color={color} flex={1} flexWrap="wrap">
          {parts.join(' · ')}
        </Text>
        <InfoTooltip message={entryTooltip(entry)} />
      </XStack>
    </YStack>
  )
}

function SourceFilterChip({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <XStack
      tag="button"
      role="checkbox"
      aria-checked={selected}
      cursor="pointer"
      alignItems="center"
      justifyContent="center"
      height="$7"
      paddingHorizontal="$3"
      borderRadius="$full"
      borderWidth={1}
      borderColor={selected ? '$primary' : '$borderColor'}
      backgroundColor={selected ? '$infoMuted' : '$backgroundDark'}
      hoverStyle={{
        opacity: 0.9,
      }}
      pressStyle={{
        opacity: 0.85,
      }}
      onPress={onPress}
    >
      <Text
        fontSize="$2"
        fontWeight={selected ? '700' : '500'}
        color={selected ? '$primary' : '$placeholderColor'}
        userSelect="none"
      >
        {label}
      </Text>
    </XStack>
  )
}

export function HistoryTab({ state, actions }: HistoryTabProps) {
  const {
    selectedSources,
    statusFilter,
    fromDate,
    toDate,
    entries,
    hasMore,
    loading,
    loadingMore,
    error,
    activeSources,
  } = state

  return (
    <YStack gap="$3" width="100%">
      <Card gap="$3">
        <Heading level={4}>AI credit history</Heading>

        <YStack gap="$2" width="100%">
          <YStack gap="$2" width="100%">
            <Text fontSize="$2" fontWeight="600">
              Source:
            </Text>
            <XStack gap="$2" flexWrap="wrap">
              {HISTORY_SOURCE_OPTIONS.map((option) => (
                <SourceFilterChip
                  key={option.id}
                  label={option.label}
                  selected={selectedSources[option.id]}
                  onPress={() =>
                    actions.setSourceChecked(option.id, !selectedSources[option.id])
                  }
                />
              ))}
            </XStack>
          </YStack>

          <XStack gap="$2" alignItems="center" flexWrap="wrap">
            <Text fontSize="$2" fontWeight="600" minWidth={52}>
              Status:
            </Text>
            <YStack flex={1} minWidth={140} maxWidth={220}>
              <Select
                options={STATUS_OPTIONS}
                value={statusFilter}
                onValueChange={(value) =>
                  actions.setStatusFilter(value as CreditHistoryStatusFilter)
                }
              />
            </YStack>
          </XStack>

          <XStack gap="$2" alignItems="center" flexWrap="wrap">
            <XStack gap="$2" flex={1} flexWrap="wrap">
              <YStack flex={1} minWidth={130}>
                <Input
                  size="sm"
                  type="date"
                  label="From"
                  value={fromDate}
                  onChangeText={actions.setFromDate}
                />
              </YStack>
              <YStack flex={1} minWidth={130}>
                <Input
                  size="sm"
                  type="date"
                  label="To"
                  value={toDate}
                  onChangeText={actions.setToDate}
                />
              </YStack>
            </XStack>
          </XStack>
        </YStack>
      </Card>

      <Card gap="$2">
        {loading ? (
          <YStack alignItems="center" paddingVertical="$4" gap="$2">
            <Spinner size="sm" />
            <Text fontSize="$2" secondary>
              Loading credit history…
            </Text>
          </YStack>
        ) : error ? (
          <YStack gap="$2" paddingVertical="$2">
            <Text color="$error" fontSize="$2">
              {error}
            </Text>
            <Button
              variant="outline"
              size="sm"
              alignSelf="flex-start"
              {...compactButtonProps}
              onPress={() => {
                void actions.reload()
              }}
            >
              <ButtonText>Retry</ButtonText>
            </Button>
          </YStack>
        ) : activeSources.length === 0 ? (
          <Text fontSize="$2" secondary>
            Select at least one source to view history.
          </Text>
        ) : entries.length === 0 ? (
          <Text fontSize="$2" secondary>
            No credit history matches these filters.
          </Text>
        ) : (
          <YStack gap="$2" width="100%">
            {entries.map((entry) => (
              <CreditHistoryEntryRow key={entry.id} entry={entry} />
            ))}
          </YStack>
        )}
      </Card>

      {!loading && !error && hasMore && (
        <Button
          variant="outline"
          size="sm"
          alignSelf="center"
          disabled={loadingMore}
          {...compactButtonProps}
          onPress={() => {
            void actions.loadMore()
          }}
        >
          {loadingMore ? <Spinner size="sm" /> : null}
          <ButtonText>{loadingMore ? 'Loading…' : 'Load more'}</ButtonText>
        </Button>
      )}
    </YStack>
  )
}
