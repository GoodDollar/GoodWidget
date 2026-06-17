import React from 'react'
import { YStack, Text, TokenAmount, CircularActionButton } from '@goodwidget/ui'
import { MigrationPrimaryCard } from './migrationWidgetComponents'

export interface MigrationSummaryAction {
  label: string
  disabled: boolean
  pending?: boolean
  onPress?: () => void
}

interface MigrationSummaryCardProps {
  stakedAmount: string
  statusMessage?: string
  action: MigrationSummaryAction
}

export function MigrationSummaryCard({
  stakedAmount,
  statusMessage,
  action,
}: MigrationSummaryCardProps) {
  return (
    <MigrationPrimaryCard>
      <YStack gap="$9" paddingVertical="$6">
        <YStack alignItems="center" gap="$4">
          <Text secondary textAlign="center">
            Migrate Fuse staking to Celo savings
          </Text>
          <Text secondary textAlign="center">
            Move your assets to the new network to continue earning rewards.
          </Text>
          <TokenAmount token="sG$" amount={stakedAmount} size="xl" />
        </YStack>

        <YStack alignItems="center" gap="$4">
          <CircularActionButton
            label={action.label}
            disabled={action.disabled}
            pending={action.pending}
            onPress={action.onPress}
          />

          {statusMessage && (
            <Text color="$primary" fontWeight="700" textAlign="center">
              {statusMessage}
            </Text>
          )}
        </YStack>
      </YStack>
    </MigrationPrimaryCard>
  )
}
