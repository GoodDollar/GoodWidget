import React from 'react'
import { Badge, BadgeText, Card, Text, XStack, YStack } from '@goodwidget/ui'
import type { CampaignUserPointsResult } from '../hooks/useCampaignUserPoints'
import { truncateAddress } from './shared/styles'

interface LeaderboardStatusProps {
  address: string | null
  isConnected: boolean
  userPoints: CampaignUserPointsResult
}

/** Connected-wallet points summary for the selected campaign. */
export function LeaderboardStatus({
  address,
  isConnected,
  userPoints,
}: LeaderboardStatusProps) {
  if (!isConnected || !address) return null

  const statusAddress = userPoints.data?.account ?? address
  const points = userPoints.data?.points

  return (
    <Card data-testid="LeaderboardStatus" gap="$2">
      <YStack gap="$2">
        <XStack gap="$2" alignItems="center">
          <Text>{truncateAddress(statusAddress)}</Text>
          <Badge type="info">
            <BadgeText>You</BadgeText>
          </Badge>
        </XStack>
        <Text variant="label">
          Total points:{' '}
          {points !== undefined
            ? points.toLocaleString()
            : userPoints.isLoading
              ? 'Loading...'
              : '—'}
        </Text>
      </YStack>
      {userPoints.error && <Text color="$error">{userPoints.error}</Text>}
    </Card>
  )
}
