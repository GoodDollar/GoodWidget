import React, { useMemo, useState } from 'react'
import { Card, Icon, ScrollArea, Separator, Text, XStack, YStack } from '@goodwidget/ui'
import type { AiCreditsUsageEntry } from '../../widgetRuntimeContract'
import { formatUsdMicroDisplay, CREDITS_PER_USD } from '../../quoteMath'

interface UsageLogProps {
  entries: AiCreditsUsageEntry[]
}

function isFundedEntry(entry: AiCreditsUsageEntry): boolean {
  return entry.kind !== 'funding' || entry.fundingStatus === 'funded'
}

function entryUsdMicro(entry: AiCreditsUsageEntry): bigint {
  if (entry.totalCreditUsdMicro) return BigInt(entry.totalCreditUsdMicro)
  return BigInt(Math.round(entry.creditsUsed * CREDITS_PER_USD))
}

function formatEntryUsd(entry: AiCreditsUsageEntry): string {
  return formatUsdMicroDisplay(entryUsdMicro(entry).toString())
}

function formatFundedSummary(entries: AiCreditsUsageEntry[]): string {
  let usdMicroTotal = 0n

  for (const entry of entries) {
    if (!isFundedEntry(entry)) continue
    usdMicroTotal += entryUsdMicro(entry)
  }

  if (usdMicroTotal <= 0n) return 'US$ 0.00'
  return formatUsdMicroDisplay(usdMicroTotal.toString())
}

export function UsageLog({ entries }: UsageLogProps) {
  const [expanded, setExpanded] = useState(false)

  const isFundingHistory = entries.length === 0 || entries.every((entry) => entry.kind === 'funding')
  const title = isFundingHistory ? 'Credit History' : 'Usage History'
  const summary = useMemo(() => {
    if (entries.length === 0) return 'No entries yet'
    if (isFundingHistory) return formatFundedSummary(entries)
    const totalUsdMicro = entries.reduce((sum, entry) => sum + entryUsdMicro(entry), 0n)
    return formatUsdMicroDisplay(totalUsdMicro.toString())
  }, [entries, isFundingHistory])

  return (
    <Card gap="$2">
      <XStack
        justifyContent="space-between"
        alignItems="center"
        onPress={() => setExpanded((value) => !value)}
        cursor="pointer"
      >
        <Text fontSize="$3" fontWeight="600">
          {title}
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
          {entries.length === 0 ? (
            <Text fontSize="$2" secondary>
              Purchases and funding activity will appear here.
            </Text>
          ) : (
            <ScrollArea maxHeight={240} width="100%">
              <YStack gap="$2" paddingRight="$1">
                {entries.map((entry) => {
                  const failed = entry.fundingStatus === 'failed'
                  const amountColor = failed ? '$error' : '$color'

                  return (
                    <YStack key={entry.sessionId} gap="$1">
                      <Separator />
                      <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
                        <YStack flex={1}>
                          <Text fontSize="$2" fontWeight="600" color={amountColor}>
                            {entry.model}
                          </Text>
                          <Text fontSize="$1" secondary>
                            {new Date(entry.timestamp).toLocaleString()}
                          </Text>
                        </YStack>
                        <Text fontSize="$2" color={amountColor} textAlign="right" flexShrink={0}>
                          {entry.kind === 'funding' ? '+' : '-'}
                          {formatEntryUsd(entry)}
                        </Text>
                      </XStack>
                    </YStack>
                  )
                })}
              </YStack>
            </ScrollArea>
          )}
        </YStack>
      )}
    </Card>
  )
}
