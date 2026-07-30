import React from 'react'
import { Button, ButtonText, Card, Heading, Icon, ProgressBar, Text, XStack, YStack } from '@goodwidget/ui'
import type { LeaderboardMockData } from '../widgetRuntimeContract'
import { compactButtonProps } from './shared/styles'

interface LeaderboardSummaryProps {
  leaderboard: LeaderboardMockData
  onViewLeaderboard: () => void
}

/**
 * Collapsed leaderboard summary card shown on the content page: trophy +
 * heading + subtext on the left, "View Leaderboard" button on the right,
 * then a green SUP-progress bar and participant/last-updated captions.
 */
export function LeaderboardSummary({ leaderboard, onViewLeaderboard }: LeaderboardSummaryProps) {
  const progressLabel = `SUP allocated ${leaderboard.supDistributed.toLocaleString()} / ${leaderboard.supTotal.toLocaleString()} SUP`

  return (
    <Card gap="$4">
      <XStack justifyContent="space-between" alignItems="center" gap="$3" flexWrap="wrap">
        <XStack gap="$3" alignItems="center">
          <Icon name="party-popper" size="lg" color="primary" />
          <YStack gap="$1">
            <Heading level={4}>Leaderboard</Heading>
            <Text variant="caption" tone="secondary">
              Top contributors
            </Text>
          </YStack>
        </XStack>
        <Button size="sm" {...compactButtonProps} onPress={onViewLeaderboard}>
          <ButtonText>View Leaderboard</ButtonText>
        </Button>
      </XStack>

      <ProgressBar
        value={leaderboard.supDistributed}
        max={leaderboard.supTotal}
        label={progressLabel}
        variant="success"
        hidePercentageOnMobile
      />

      <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="$2">
        <Text variant="caption" tone="secondary">
          {leaderboard.totalParticipants.toLocaleString()} participants
        </Text>
        <Text variant="caption" tone="secondary">
          {leaderboard.lastUpdatedLabel}
        </Text>
      </XStack>
    </Card>
  )
}
