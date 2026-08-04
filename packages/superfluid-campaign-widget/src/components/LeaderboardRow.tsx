import React from 'react'
import { Anchor, Badge, BadgeText, Card, Text, XStack, YStack } from '@goodwidget/ui'
import type { ActivityType, LeaderboardEntry } from '../widgetRuntimeContract'
import { ActivityIcons } from './ActivityIcons'
import { truncateAddress } from './shared/styles'

/** Shared by the header and rows so every table column has one stable width. */
export const LEADERBOARD_COLUMN_WIDTHS = {
  rank: 42,
  address: 110,
  points: 100,
  actions: 160,
} as const

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  /** Drives the highlighted/bordered treatment for the connected user's own row. */
  isCurrentUser?: boolean
  activities: ActivityType[]
}

/**
 * One leaderboard row: rank, linked address/ENS, points, and the active
 * campaign's activity icons.
 *
 * Every viewport uses the same four inline table columns. Below $sm, the
 * parent table gains a horizontal scrollbar instead of stacking this row.
 */
export function LeaderboardRow({ entry, isCurrentUser = false, activities }: LeaderboardRowProps) {
  const addressLabel = entry.ensName ?? truncateAddress(entry.address)

  return (
    <Card
      data-testid={`LeaderboardRow-${entry.rank}`}
      flexDirection="row"
      alignItems="center"
      gap="$3"
      padding="$3"
      borderColor={isCurrentUser ? '$primary' : '$borderColor'}
      borderWidth={isCurrentUser ? 2 : 1}
      backgroundColor={isCurrentUser ? '$backgroundHover' : '$background'}
    >
      <Text variant="label" width={LEADERBOARD_COLUMN_WIDTHS.rank}>
        {entry.rank}
      </Text>
      <XStack gap="$2" alignItems="center" width={LEADERBOARD_COLUMN_WIDTHS.address}>
        <Anchor href={`https://explorer.superfluid.org/base-mainnet/accounts/${entry.address}`}>
          {addressLabel}
        </Anchor>
        {isCurrentUser && (
          <Badge type="info">
            <BadgeText>You</BadgeText>
          </Badge>
        )}
      </XStack>

      <YStack width={LEADERBOARD_COLUMN_WIDTHS.points}>
        <Text fontWeight="600">{entry.points.toLocaleString()} pts</Text>
      </YStack>

      {/* Only the selected pool's configured actions are rendered. */}
      {entry.completedActivities && (
        <XStack width={LEADERBOARD_COLUMN_WIDTHS.actions} $md={{ flexWrap: 'wrap' }}>
          <ActivityIcons completedActivities={entry.completedActivities} activities={activities} />
        </XStack>
      )}
    </Card>
  )
}
