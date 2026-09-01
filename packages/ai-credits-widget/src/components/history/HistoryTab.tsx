import React, { useMemo, useState } from 'react'
import {
  Button,
  ButtonText,
  Card,
  Heading,
  Icon,
  Input,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@goodwidget/ui'
import type { IconName } from '@goodwidget/ui'
import type { GdCreditEntry } from '../../backendTypes'
import { formatUsdMicro, weiToG } from '../../quoteMath'
import { compactButtonProps } from '../shared/styles'
import type {
  AiCreditsHistoryActions,
  AiCreditsHistoryState,
  SignerAddressFilter,
  CreditHistorySource,
  CreditHistoryStatusFilter,
} from '../../useAiCreditsHistory'
import {
  BUYER_FILTER_ALL,
  HISTORY_LOOKBACK_DAYS,
  getLast90DaysRange,
} from '../../useAiCreditsHistory'

const STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Funded', value: 'funded' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' },
]

const SOURCE_PILL_OPTIONS: { id: CreditHistorySource; label: string }[] = [
  { id: 'deposit', label: 'Deposit' },
  { id: 'streamUpdate', label: 'Stream update' },
  { id: 'streamRequest', label: 'Stream credit' },
]

export interface HistoryTabProps {
  state: AiCreditsHistoryState
  actions: AiCreditsHistoryActions
  /** Known signer records to populate the signer filter dropdown. */
  knownSigners?: { address: string; label?: string }[]
}

function sourceLabel(source: CreditHistorySource): string {
  if (source === 'deposit') return 'G$ Deposit'
  if (source === 'streamUpdate') return 'Stream Update'
  return 'Stream Credit'
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

function formatGAmount(gdAmountWei: string): string | null {
  try {
    const amountWei = BigInt(gdAmountWei || '0')
    if (amountWei <= 0n) return null
    return `${weiToG(amountWei)} G$`
  } catch {
    return null
  }
}

function formatUsdCredit(usdMicro: string): string | null {
  try {
    const micro = BigInt(usdMicro || '0')
    if (micro <= 0n) return null
    return `+$${formatUsdMicro(usdMicro)}`
  } catch {
    return null
  }
}

function formatUsdValue(usdMicro: string): string {
  return `$${formatUsdMicro(usdMicro || '0')}`
}

function amountLines(entry: GdCreditEntry): { primary: string; secondary?: string } | null {
  const gAmount = formatGAmount(entry.gdAmountWei)
  const usdCredit = formatUsdCredit(entry.totalCreditUsd)

  if (entry.source === 'streamUpdate') {
    const addedG = gAmount ? `+${gAmount}` : null
    if (addedG && usdCredit) return { primary: addedG, secondary: usdCredit }
    if (addedG) return { primary: addedG }
    if (usdCredit) return { primary: usdCredit }
    return null
  }

  if (gAmount && usdCredit) return { primary: gAmount, secondary: usdCredit }
  if (gAmount) return { primary: gAmount }
  if (usdCredit) return { primary: usdCredit }
  return null
}

function entryDetailRows(entry: GdCreditEntry): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [
    { label: 'Principal', value: formatUsdValue(entry.principalUsd) },
    { label: 'Bonus', value: formatUsdValue(entry.bonusUsd) },
  ]
  if (entry.txHash) rows.push({ label: 'Celo tx', value: entry.txHash })
  if (entry.fundingTxHash) rows.push({ label: 'Funding tx', value: entry.fundingTxHash })
  return rows
}

function EntryDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <XStack gap="$2" alignItems="flex-start" width="100%">
      <Text fontSize="$1" fontWeight="600" tone="soft" minWidth={72} flexShrink={0}>
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
  if (entry.fundingStatus === 'pending') return '$warning'
  return '$success'
}

function amountAccent(entry: GdCreditEntry): string {
  if (entry.fundingStatus === 'failed') return '$error'
  if (entry.fundingStatus === 'pending') return '$warning'
  return '$success'
}

function entryIconName(entry: GdCreditEntry): IconName {
  if (entry.fundingStatus === 'failed') return 'alert-circle'
  if (entry.source === 'deposit') return 'plus'
  if (entry.source === 'streamUpdate') return 'refresh'
  return 'arrow-down'
}

function entryIconColor(entry: GdCreditEntry): 'error' | 'warning' | 'primary' | 'success' {
  if (entry.fundingStatus === 'failed') return 'error'
  if (entry.fundingStatus === 'pending') return 'warning'
  if (entry.source === 'streamUpdate') return 'primary'
  return 'success'
}

function entryIconBackground(entry: GdCreditEntry): string {
  if (entry.fundingStatus === 'failed') return '$errorMuted'
  if (entry.fundingStatus === 'pending') return '$warningMuted'
  if (entry.source === 'streamUpdate') return '$infoMuted'
  return '$successMuted'
}

function statusLabel(status: GdCreditEntry['fundingStatus']): string {
  return status.toUpperCase()
}

function sumFilteredGdWei(entries: GdCreditEntry[]): bigint {
  return entries.reduce((sum, entry) => {
    if (entry.source === 'streamUpdate') return sum
    try {
      const amount = BigInt(entry.gdAmountWei || '0')
      return amount > 0n ? sum + amount : sum
    } catch {
      return sum
    }
  }, 0n)
}

function formatAccumulatedG(amountWei: bigint): string {
  const value = Number(amountWei) / 1e18
  if (!Number.isFinite(value) || value < 0) return '0.00 G$'
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} G$`
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

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function exportEntriesCsv(entries: GdCreditEntry[]): void {
  if (typeof document === 'undefined') return
  const headers = [
    'id',
    'source',
    'status',
    'usdCredit',
    'gdAmountWei',
    'createdAt',
    'txHash',
    'fundingTxHash',
  ]
  const rows = entries.map((entry) =>
    [
      entry.id,
      entry.source,
      entry.fundingStatus,
      formatUsdMicro(entry.totalCreditUsd),
      entry.gdAmountWei,
      entry.createdAt,
      entry.txHash ?? '',
      entry.fundingTxHash ?? '',
    ]
      .map((value) => escapeCsvValue(String(value)))
      .join(','),
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'ai-credit-history.csv'
  anchor.click()
  URL.revokeObjectURL(url)
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
  const amountColor = amountAccent(entry)
  const amounts = amountLines(entry)
  const detailRows = entryDetailRows(entry)
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
            color={entryIconColor(entry)}
          />
        </YStack>

        <YStack flex={1} gap="$0.5" minWidth={0}>
          <Text fontSize="$3" fontWeight="700" color={titleColor}>
            {sourceLabel(entry.source)}
          </Text>
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
        </YStack>

        <YStack alignItems="flex-end" gap="$0.5" flexShrink={0}>
          {amounts?.primary ? (
            <Text fontSize="$3" fontWeight="700" color={amountColor}>
              {amounts.primary}
            </Text>
          ) : null}
          {amounts?.secondary ? (
            <Text fontSize="$2" fontWeight="600" color={amountColor}>
              {amounts.secondary}
            </Text>
          ) : null}
          <Text fontSize="$1" tone="soft">
            {formatEntryDate(entry.createdAt)}
          </Text>
        </YStack>
      </XStack>

      {expanded && detailRows.length > 0 ? (
        <YStack gap="$1.5" paddingTop="$1">
          {detailRows.map((row) => (
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
      backgroundColor={selected ? '$infoMuted' : '$background'}
      hoverStyle={{
        opacity: 0.9,
      }}
      pressStyle={{
        opacity: 0.85,
      }}
      onPress={onPress}
      flexShrink={0}
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

function StatusFilterSelect({
  value,
  onValueChange,
}: {
  value: CreditHistoryStatusFilter
  onValueChange: (value: CreditHistoryStatusFilter) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = STATUS_OPTIONS.find((option) => option.value === value)

  return (
    <YStack flex={1} minWidth={0} position="relative" zIndex={open ? 20 : 1}>
      <XStack
        tag="button"
        role="combobox"
        height="$7"
        alignItems="center"
        justifyContent="space-between"
        gap="$2"
        paddingHorizontal="$3"
        borderRadius="$3"
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
        cursor="pointer"
        onPress={() => setOpen((current) => !current)}
      >
        <Text fontSize="$2" color="$placeholderColor" numberOfLines={1} flex={1}>
          Status: {selected?.label ?? 'All'}
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size="xs" color="muted" />
      </XStack>

      {open ? (
        <YStack
          position="absolute"
          top="100%"
          left={0}
          right={0}
          marginTop="$1"
          borderRadius="$3"
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$background"
          overflow="hidden"
          zIndex={30}
        >
          {STATUS_OPTIONS.map((option) => (
            <XStack
              key={option.value}
              tag="button"
              role="option"
              paddingHorizontal="$3"
              paddingVertical="$2"
              cursor="pointer"
              backgroundColor={option.value === value ? '$infoMuted' : 'transparent'}
              hoverStyle={{ backgroundColor: '$backgroundPress' }}
              onPress={() => {
                onValueChange(option.value as CreditHistoryStatusFilter)
                setOpen(false)
              }}
            >
              <Text
                fontSize="$2"
                fontWeight={option.value === value ? '700' : '500'}
                color={option.value === value ? '$primary' : '$color'}
              >
                {option.label}
              </Text>
            </XStack>
          ))}
        </YStack>
      ) : null}
    </YStack>
  )
}

/** Dropdown for filtering history entries by Signer Address. */
function SignerFilterSelect({
  value,
  signers,
  onValueChange,
}: {
  value: SignerAddressFilter
  signers: { address: string; label?: string }[]
  onValueChange: (value: SignerAddressFilter) => void
}) {
  const [open, setOpen] = useState(false)

  // Only render when there are known signers to filter by
  if (signers.length === 0) return null

  const options = [
    { value: BUYER_FILTER_ALL, label: 'All signers' },
    ...signers.map((b) => ({
      value: b.address,
      label: b.label ?? `${b.address.slice(0, 6)}…${b.address.slice(-4)}`,
    })),
  ]

  const selected = options.find((o) => o.value === value) ?? options[0]

  return (
    <YStack flex={1} minWidth={0} position="relative" zIndex={open ? 25 : 1}>
      <XStack
        tag="button"
        role="combobox"
        height="$7"
        alignItems="center"
        justifyContent="space-between"
        gap="$2"
        paddingHorizontal="$3"
        borderRadius="$3"
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
        cursor="pointer"
        onPress={() => setOpen((current) => !current)}
      >
        <Text fontSize="$2" color="$placeholderColor" numberOfLines={1} flex={1}>
          Signer: {selected?.label ?? 'All signers'}
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size="xs" color="muted" />
      </XStack>

      {open ? (
        <YStack
          position="absolute"
          top="100%"
          left={0}
          right={0}
          marginTop="$1"
          borderRadius="$3"
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$background"
          overflow="hidden"
          zIndex={35}
        >
          {options.map((option) => (
            <XStack
              key={option.value}
              tag="button"
              role="option"
              paddingHorizontal="$3"
              paddingVertical="$2"
              cursor="pointer"
              backgroundColor={option.value === value ? '$infoMuted' : 'transparent'}
              hoverStyle={{ backgroundColor: '$backgroundPress' }}
              onPress={() => {
                onValueChange(option.value)
                setOpen(false)
              }}
            >
              <Text
                fontSize="$2"
                fontWeight={option.value === value ? '700' : '500'}
                color={option.value === value ? '$primary' : '$color'}
              >
                {option.label}
              </Text>
            </XStack>
          ))}
        </YStack>
      ) : null}
    </YStack>
  )
}

export function HistoryTab({ state, actions, knownSigners = [] }: HistoryTabProps) {
  const {
    selectedSources,
    statusFilter,
    signerAddressFilter,
    fromDate,
    toDate,
    entries,
    hasMore,
    loading,
    loadingMore,
    error,
    activeSources,
  } = state
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)
  const defaultRange = useMemo(() => getLast90DaysRange(), [])
  const isDefaultRange = fromDate === defaultRange.from && toDate === defaultRange.to
  const rangeSummary = isDefaultRange
    ? `Last ${HISTORY_LOOKBACK_DAYS} days activity`
    : `${formatShortDate(fromDate)} – ${formatShortDate(toDate)}`
  const accumulatedG = useMemo(
    () => formatAccumulatedG(sumFilteredGdWei(entries)),
    [entries],
  )

  return (
    <YStack gap="$3" width="100%">
      <Card gap="$3">
        <XStack alignItems="flex-start" justifyContent="space-between" gap="$2" width="100%">
          <YStack flex={1} gap="$0.5" minWidth={0}>
            <Heading level={4}>AI Credit History</Heading>
            <Text fontSize="$1" tone="soft">
              {rangeSummary}
            </Text>
          </YStack>
        </XStack>

        <YStack gap="$1">
          <Text fontSize="$1" fontWeight="600" tone="soft" letterSpacing={0.6}>
            TOTAL ACCUMULATED
          </Text>
          <Text fontSize="$7" fontWeight="700" color="$color">
            {accumulatedG}
          </Text>
        </YStack>
      </Card>

      <XStack gap="$2" flexWrap="wrap" width="100%">
        {SOURCE_PILL_OPTIONS.map((option) => (
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

      <XStack gap="$2" alignItems="center" width="100%">
        <StatusFilterSelect
          value={statusFilter}
          onValueChange={actions.setStatusFilter}
        />
        <SignerFilterSelect
          value={signerAddressFilter}
          signers={knownSigners}
          onValueChange={actions.setSignerAddressFilter}
        />
      </XStack>

      <XStack gap="$2" width="100%">
        <YStack flex={1} minWidth={0}>
          <Input
            size="sm"
            type="date"
            label="From"
            value={fromDate}
            onChangeText={actions.setFromDate}
          />
        </YStack>
        <YStack flex={1} minWidth={0}>
          <Input
            size="sm"
            type="date"
            label="To"
            value={toDate}
            onChangeText={actions.setToDate}
          />
        </YStack>
      </XStack>

      <XStack alignItems="center" justifyContent="space-between" gap="$2" width="100%">
        <Text fontSize="$1" fontWeight="700" tone="soft" letterSpacing={0.6}>
          CREDIT HISTORY
        </Text>
        <XStack
          tag="button"
          backgroundColor="transparent"
          borderWidth={0}
          padding={0}
          cursor={entries.length > 0 ? 'pointer' : 'default'}
          opacity={entries.length > 0 ? 1 : 0.5}
          hoverStyle={{ opacity: entries.length > 0 ? 0.85 : 0.5 }}
          pressStyle={{ opacity: entries.length > 0 ? 0.7 : 0.5 }}
          onPress={() => {
            if (entries.length === 0) return
            exportEntriesCsv(entries)
          }}
        >
          <Text fontSize="$2" fontWeight="600" color="$primary">
            Export CSV
          </Text>
        </XStack>
      </XStack>

      {loading ? (
        <Card gap="$2">
          <YStack alignItems="center" paddingVertical="$4" gap="$2">
            <Spinner size="sm" />
            <Text fontSize="$2" tone="soft">
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
          <Text fontSize="$2" tone="soft">
            Select at least one source to view history.
          </Text>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <Text fontSize="$2" tone="soft">
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
