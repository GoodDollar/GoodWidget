import React, { useMemo, useState } from 'react'
import { Card, Icon, ScrollArea, Separator, Text, XStack, YStack } from '@goodwidget/ui'
import type { GdCreditEntry } from '../../backendTypes'
import { formatUsdMicroDisplay } from '../../quoteMath'

interface UsageLogProps {
  entries: GdCreditEntry[]
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

function formatFundedSummary(entries: GdCreditEntry[]): string {
  let usdMicroTotal = 0n

  for (const entry of entries) {
    if (entry.fundingStatus !== 'funded') continue
    usdMicroTotal += BigInt(entry.totalCreditUsd)
  }

  if (usdMicroTotal <= 0n) return 'US$ 0.00'
  return formatUsdMicroDisplay(usdMicroTotal.toString())
}

export function UsageLog({ entries }: UsageLogProps) {
  const [expanded, setExpanded] = useState(false)

  const summary = useMemo(() => {
    if (entries.length === 0) return 'No entries yet'
    return formatFundedSummary(entries)
  }, [entries])

  return (
    <Card gap="$2">
      <XStack
        justifyContent="space-between"
        alignItems="center"
        onPress={() => setExpanded((value) => !value)}
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
                    <YStack key={entry.id} gap="$1">
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
                        <Text fontSize="$2" color={amountColor} textAlign="right" flexShrink={0}>
                          +{formatUsdMicroDisplay(entry.totalCreditUsd)}
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
