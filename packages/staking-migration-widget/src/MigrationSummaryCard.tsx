import React from 'react'
import { YStack, Heading, Text, TokenAmount, CircularActionButton } from '@goodwidget/ui'

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
    <YStack gap="$5" alignItems="center">
      <Heading level={3} textAlign="center" color="$primary">
        Migrate Fuse staking to Celo savings
      </Heading>
      <Text secondary textAlign="center">
        Move your assets to the new network to continue earning rewards.
      </Text>

      <YStack
        width="100%"
        alignItems="center"
        gap="$3"
        padding="$5"
        borderRadius="$4"
        borderWidth={1}
        borderColor="$borderColorFocus"
        backgroundColor="$backgroundHover"
        shadowColor="$borderColorFocus"
        shadowOpacity={0.18}
        shadowRadius={16}
      >
        <Text variant="caption" secondary fontWeight="700" textTransform="uppercase">
          Amount to migrate
        </Text>
        <TokenAmount token="sG$" amount={stakedAmount} size="lg" />

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
  )
}
