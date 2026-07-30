import React from 'react'
import { Badge, BadgeText, Card, Text, XStack, YStack } from '@goodwidget/ui'
import type { LeaderboardEntryMockData } from '../widgetRuntimeContract'
import { ActivityIcons } from './ActivityIcons'
import { truncateAddress } from './shared/styles'

interface LeaderboardRowProps {
  entry: LeaderboardEntryMockData
  /** Drives the highlighted/bordered treatment for the connected user's own row. */
  isCurrentUser?: boolean
}

/**
 * One leaderboard row: rank + address/ENS, points, and the six activity icons.
 *
 * Desktop: four inline table-row columns.
 * Below $gtMd (<768px): the activity-icons cell wraps to a second line instead
 * of truncating (ActivityIcons itself already wraps via flexWrap).
 * Below $gtSm (<480px): the whole row becomes a stacked card, same four data
 * groups in the same order (rank+address, then points, then activities).
 */
export function LeaderboardRow({ entry, isCurrentUser = false }: LeaderboardRowProps) {
  const addressLabel = entry.ensName ?? truncateAddress(entry.address)

  return (
    <Card
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      gap="$3"
      padding="$3"
      borderColor={isCurrentUser ? '$primary' : '$borderColor'}
      borderWidth={isCurrentUser ? 2 : 1}
      backgroundColor={isCurrentUser ? '$backgroundHover' : '$background'}
      $sm={{ flexDirection: 'column', alignItems: 'stretch', gap: '$2' }}
    >
      <XStack gap="$2" alignItems="center" flex={2} minWidth={0}>
        <Text variant="label" width={32}>
          {entry.rank}
        </Text>
        <Text truncate flex={1}>
          {addressLabel}
        </Text>
        {isCurrentUser && (
          <Badge type="info">
            <BadgeText>You</BadgeText>
          </Badge>
        )}
      </XStack>

      <YStack flex={1} $sm={{ width: '100%' }}>
        <Text fontWeight="600">{entry.points.toLocaleString()} pts</Text>
      </YStack>

      {/* Omitted for rows sourced from the live Points API, which has no
          per-activity breakdown — hide the column rather than show misleading
          all-dimmed icons. */}
      {entry.completedActivities && (
        <XStack flex={2} $md={{ flexWrap: 'wrap' }} $sm={{ width: '100%' }}>
          <ActivityIcons completedActivities={entry.completedActivities} />
        </XStack>
      )}
    </Card>
  )
}
