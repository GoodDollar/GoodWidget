import React, { useState } from 'react'
import { Card, Icon, Separator, Text, XStack, YStack } from '@goodwidget/ui'
import type { AiCreditsUsageEntry } from '../../widgetRuntimeContract'

interface UsageLogProps {
  entries: AiCreditsUsageEntry[]
}

/**
 * Accordion list of usage sessions, showing credits used per model.
 */
export function UsageLog({ entries }: UsageLogProps) {
  const [expanded, setExpanded] = useState(false)

  const isFundingHistory = entries.length === 0 || entries.every((entry) => entry.kind === 'funding')
  const total = entries.reduce((sum, entry) => {
    if (entry.kind === 'funding' && entry.fundingStatus !== 'funded') return sum
    return sum + entry.creditsUsed
  }, 0)
  const title = isFundingHistory ? 'Credit History' : 'Usage History'

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
        <XStack gap="$2" alignItems="center">
          <Text fontSize="$1" secondary>
            {entries.length === 0
              ? 'No entries yet'
              : isFundingHistory
                ? `${total.toFixed(1)} funded`
                : `${total.toFixed(1)} credits`}
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
            entries.map((entry) => (
              <YStack key={entry.sessionId} gap="$1">
                <Separator />
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack>
                    <Text fontSize="$2" fontWeight="600">
                      {entry.model}
                    </Text>
                    <Text fontSize="$1" secondary>
                      {new Date(entry.timestamp).toLocaleString()}
                    </Text>
                  </YStack>
                  <Text fontSize="$2" color="$primary">
                    {entry.kind === 'funding' ? '+' : '-'}
                    {entry.creditsUsed.toFixed(1)} credits
                  </Text>
                </XStack>
              </YStack>
            ))
          )}
        </YStack>
      )}
    </Card>
  )
}

