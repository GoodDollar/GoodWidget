import React, { useEffect, useMemo, useState } from 'react'
import { Card, Icon, Separator, Spinner, Text, XStack, YStack } from '@goodwidget/ui'
import type { GdCreditEntry } from '../../backendTypes'
import { createBackendClient } from '../../backendClient'
import { formatUsdMicroDisplay, weiToG } from '../../quoteMath'

const INITIAL_VISIBLE_ENTRIES = 4

interface UsageLogProps {
  address: string | null
  backendUrl?: string
  refreshSignal?: number
}

function sourceLabel(source: GdCreditEntry['source']): string {
  if (source === 'deposit') return 'G$ deposit'
  return 'G$ stream'
}

function entryLabel(entry: GdCreditEntry): string {
  if (entry.fundingStatus === 'failed') {
    return `${sourceLabel(entry.source)} (failed)`
  }
  return sourceLabel(entry.source)
}

function formatGAmountWei(gdAmountWei: string): string | null {
  const amountWei = BigInt(gdAmountWei || '0')
  if (amountWei <= 0n) return null
  return `${weiToG(amountWei)} G$`
}

function formatFundedSummary(entries: GdCreditEntry[]): string {
  let usdMicroTotal = 0n
  let gdWeiTotal = 0n

  for (const entry of entries) {
    if (entry.fundingStatus !== 'funded') continue
    usdMicroTotal += BigInt(entry.totalCreditUsd || '0')
    gdWeiTotal += BigInt(entry.gdAmountWei || '0')
  }

  const parts: string[] = []
  const gTotal = formatGAmountWei(gdWeiTotal.toString())
  if (gTotal) parts.push(gTotal)
  parts.push(
    usdMicroTotal > 0n ? formatUsdMicroDisplay(usdMicroTotal.toString()) : formatUsdMicroDisplay('0'),
  )
  return parts.join(' · ')
}

function CreditHistoryEntry({ entry }: { entry: GdCreditEntry }) {
  const failed = entry.fundingStatus === 'failed'
  const amountColor = failed ? '$error' : '$color'
  const gAmountDisplay = formatGAmountWei(entry.gdAmountWei)

  return (
    <YStack gap="$1">
      <Separator />
      <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
        <YStack flex={1}>
          <Text fontSize="$2" fontWeight="600" color={amountColor}>
            {entryLabel(entry)}
          </Text>
          <Text fontSize="$1" secondary>
            {new Date(entry.createdAt).toLocaleString()}
          </Text>
        </YStack>
        <YStack alignItems="flex-end" flexShrink={0} gap="$0.5">
          {gAmountDisplay && (
            <Text fontSize="$2" fontWeight="600" color={amountColor} textAlign="right">
              +{gAmountDisplay}
            </Text>
          )}
          <Text fontSize="$2" color={amountColor} textAlign="right">
            +{formatUsdMicroDisplay(entry.totalCreditUsd)}
          </Text>
        </YStack>
      </XStack>
    </YStack>
  )
}

export function UsageLog({ address, backendUrl, refreshSignal = 0 }: UsageLogProps) {
  const [expanded, setExpanded] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [entries, setEntries] = useState<GdCreditEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address) {
      setEntries([])
      return
    }

    let cancelled = false
    const client = createBackendClient(backendUrl)
    setLoading(true)

    void client
      .getUsageLog(address)
      .then((log) => {
        if (!cancelled) {
          setEntries(log)
          setShowAll(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([])
          setShowAll(false)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [address, backendUrl, refreshSignal])

  const summary = useMemo(() => {
    if (loading) return 'Loading…'
    if (entries.length === 0) return 'No entries yet'
    return formatFundedSummary(entries)
  }, [entries, loading])

  const hiddenCount = Math.max(0, entries.length - INITIAL_VISIBLE_ENTRIES)
  const visibleEntries = showAll ? entries : entries.slice(0, INITIAL_VISIBLE_ENTRIES)

  return (
    <Card gap="$2">
      <XStack
        justifyContent="space-between"
        alignItems="center"
        onPress={() => {
          if (expanded) setShowAll(false)
          setExpanded((value) => !value)
        }}
        cursor="pointer"
      >
        <Text fontSize="$3" fontWeight="600">
          Credit History
        </Text>
        <XStack gap="$2" alignItems="center" flexShrink={1}>
          <Text fontSize="$1" secondary textAlign="right" flexShrink={1}>
            {summary}
          </Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-right'} size="xs" color="muted" />
        </XStack>
      </XStack>

      {expanded && (
        <YStack gap="$2">
          {loading ? (
            <Spinner size="sm" />
          ) : entries.length === 0 ? (
            <Text fontSize="$2" secondary>
              Purchases and funding activity will appear here.
            </Text>
          ) : (
            <YStack gap="$2" width="100%">
              {visibleEntries.map((entry) => (
                <CreditHistoryEntry key={entry.id} entry={entry} />
              ))}
              {hiddenCount > 0 && (
                <Text
                  fontSize="$2"
                  fontWeight="600"
                  color="$primary"
                  cursor="pointer"
                  alignSelf="center"
                  paddingVertical="$1"
                  onPress={() => setShowAll((value) => !value)}
                >
                  {showAll ? 'Show less' : `Show ${hiddenCount} more`}
                </Text>
              )}
            </YStack>
          )}
        </YStack>
      )}
    </Card>
  )
}
