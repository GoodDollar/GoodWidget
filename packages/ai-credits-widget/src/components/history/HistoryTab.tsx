import React, { useMemo, useState } from 'react'
import {
  Button,
  ButtonText,
  Card,
  Heading,
  Icon,
  Input,
  Select,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@goodwidget/ui'
import type { IconName } from '@goodwidget/ui'
import type { GdCreditEntry } from '../../backendTypes'
import { usdToCredits, weiToG } from '../../quoteMath'
import { compactButtonProps } from '../shared/styles'
import type {
  AiCreditsHistoryActions,
  AiCreditsHistoryState,
  CreditHistorySource,
  CreditHistoryStatusFilter,
} from '../../useAiCreditsHistory'
import {
  HISTORY_LOOKBACK_DAYS,
  HISTORY_SOURCE_OPTIONS,
  getLast90DaysRange,
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
  if (source === 'streamCron') return 'Daily stream credit'
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
  const credits = formatCredits(entry.totalCreditUsd)
  if (credits) return credits
  if (entry.fundingStatus === 'failed') {
    return `${usdToCredits(entry.totalCreditUsd || '0')} cr`
  }
  return formatGAmount(entry.gdAmountWei)
}

function entryDetailRows(entry: GdCreditEntry): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [
    { label: 'Type', value: sourceLabel(entry.source) },
    { label: 'Status', value: statusLabel(entry.fundingStatus) },
    { label: 'Credits', value: `${usdToCredits(entry.totalCreditUsd)} cr` },
  ]
  const gAmount = formatGAmount(entry.gdAmountWei)
  if (gAmount) rows.push({ label: 'G$', value: gAmount })
  if (entry.source !== 'streamUpdate') {
    rows.push(
      { label: 'Principal', value: `${usdToCredits(entry.principalUsd)} cr` },
      { label: 'Bonus', value: `${usdToCredits(entry.bonusUsd)} cr` },
    )
  }
  if (entry.txHash) rows.push({ label: 'Celo tx', value: entry.txHash })
  if (entry.fundingTxHash) rows.push({ label: 'Funding tx', value: entry.fundingTxHash })
  return rows
}

function EntryDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <XStack gap="$2" alignItems="flex-start" width="100%">
      <Text fontSize="$1" fontWeight="600" secondary minWidth={72} flexShrink={0}>
        {label}
      </Text>
      <Text
        fontSize="$1"
        flex={1}
        minWidth={0}
        style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
      >
        {value}
      </Text>
    </XStack>
  )
}

function entryAccent(entry: GdCreditEntry): string {
  if (entry.fundingStatus === 'failed') return '$error'
  if (entry.source === 'streamUpdate') return '$color'
  if (entry.fundingStatus === 'pending') return '$warning'
  return '$primary'
}

function entryIconName(entry: GdCreditEntry): IconName {
  if (entry.fundingStatus === 'failed') return 'alert-circle'
  if (entry.source === 'deposit') return 'plus'
  if (entry.source === 'streamUpdate') return 'refresh'
  return 'arrow-down'
}

function entryIconBackground(entry: GdCreditEntry): string {
  if (entry.fundingStatus === 'failed') return '$errorMuted'
  if (entry.source === 'streamUpdate') return '$backgroundPress'
  if (entry.fundingStatus === 'pending') return '$warningMuted'
  return '$infoMuted'
}

function shouldShowStatus(entry: GdCreditEntry): boolean {
  return entry.source !== 'streamUpdate'
}

function statusLabel(status: GdCreditEntry['fundingStatus']): string {
  return status.toUpperCase()
}

function formatShortDate(dateValue: string): string {
  const date = new Date(`${dateValue}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return dateValue
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function CreditHistoryEntryRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: GdCreditEntry
  expanded: boolean
  onToggle: () => void
}) {
  const accent = entryAccent(entry)
  const amount = amountSummary(entry)
  const showStatus = shouldShowStatus(entry)
  const titleColor = entry.fundingStatus === 'failed' ? '$error' : '$color'

  return (
    <Card gap="$2">
      <XStack
        alignItems="center"
        gap="$3"
        width="100%"
        cursor="pointer"
        onPress={onToggle}
      >
        <YStack
          width={40}
          height={40}
          borderRadius="$full"
          alignItems="center"
          justifyContent="center"
          backgroundColor={entryIconBackground(entry)}
          flexShrink={0}
        >
          <Icon
            name={entryIconName(entry)}
            size="sm"
            color={
              entry.fundingStatus === 'failed'
                ? 'error'
                : entry.source === 'streamUpdate'
                  ? 'muted'
                  : entry.fundingStatus === 'pending'
                    ? 'warning'
                    : 'primary'
            }
          />
        </YStack>

        <YStack flex={1} gap="$0.5" minWidth={0}>
          <Text fontSize="$3" fontWeight="700" color={titleColor}>
            {sourceLabel(entry.source)}
          </Text>
          <Text fontSize="$1" secondary>
            {formatEntryDate(entry.createdAt)}
          </Text>
        </YStack>

        <YStack alignItems="flex-end" gap="$0.5" flexShrink={0}>
          {amount && (
            <Text fontSize="$3" fontWeight="700" color={accent}>
              {amount}
            </Text>
          )}
          {showStatus && (
            <XStack alignItems="center" gap="$1">
              <YStack
                width={6}
                height={6}
                borderRadius="$full"
                backgroundColor={accent}
              />
              <Text fontSize="$1" fontWeight="600" color={accent} letterSpacing={0.4}>
                {statusLabel(entry.fundingStatus)}
              </Text>
            </XStack>
          )}
        </YStack>

        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size="xs" color="muted" />
      </XStack>

      {expanded ? (
        <YStack gap="$1.5" paddingTop="$1">
          {entryDetailRows(entry).map((row) => (
            <EntryDetailRow key={row.label} label={row.label} value={row.value} />
          ))}
        </YStack>
      ) : null}
    </Card>
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
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)
  const defaultRange = useMemo(() => getLast90DaysRange(), [])
  const isDefaultRange = fromDate === defaultRange.from && toDate === defaultRange.to
  const rangeSummary = isDefaultRange
    ? `Last ${HISTORY_LOOKBACK_DAYS} days`
    : `${formatShortDate(fromDate)} – ${formatShortDate(toDate)}`

  return (
    <YStack gap="$3" width="100%">
      <Card gap="$3">
        <XStack alignItems="center" justifyContent="space-between" gap="$2" width="100%">
          <YStack flex={1} gap="$0.5" minWidth={0}>
            <Heading level={4}>AI credit history</Heading>
            {!filtersOpen ? (
              <Text fontSize="$1" secondary>
                {rangeSummary}
              </Text>
            ) : null}
          </YStack>
          <Button
            variant="ghost"
            size="sm"
            {...compactButtonProps}
            onPress={() => setFiltersOpen((open) => !open)}
          >
            <Icon name={filtersOpen ? 'chevron-up' : 'settings'} size="xs" color="text" />
            <ButtonText>Filter</ButtonText>
          </Button>
        </XStack>

        {filtersOpen ? (
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
        ) : null}
      </Card>

      {loading ? (
        <Card gap="$2">
          <YStack alignItems="center" paddingVertical="$4" gap="$2">
            <Spinner size="sm" />
            <Text fontSize="$2" secondary>
              Loading credit history…
            </Text>
          </YStack>
        </Card>
      ) : error ? (
        <Card gap="$2">
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
        </Card>
      ) : activeSources.length === 0 ? (
        <Card>
          <Text fontSize="$2" secondary>
            Select at least one source to view history.
          </Text>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <Text fontSize="$2" secondary>
            No credit history matches these filters.
          </Text>
        </Card>
      ) : (
        <YStack gap="$2" width="100%">
          {entries.map((entry) => (
            <CreditHistoryEntryRow
              key={entry.id}
              entry={entry}
              expanded={expandedEntryId === entry.id}
              onToggle={() =>
                setExpandedEntryId((current) => (current === entry.id ? null : entry.id))
              }
            />
          ))}
        </YStack>
      )}

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
