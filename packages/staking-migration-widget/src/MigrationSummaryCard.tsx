import React from 'react'
import { Button, ButtonText, Heading, Text, TokenAmount, YStack } from '@goodwidget/ui'

interface MigrationSummaryCardProps {
  stakedAmount: string
  isZeroBalance: boolean
  actionLabel?: string
  actionDisabled?: boolean
  actionHint?: string
  onPrimaryAction?: () => void
  statusMessage?: string
}

// This summary card is the entry point for approve-and-migrate user action.
export function MigrationSummaryCard({
  stakedAmount,
  isZeroBalance,
  actionLabel,
  actionDisabled,
  actionHint,
  statusMessage,
  onPrimaryAction,
}: MigrationSummaryCardProps) {
  return (
    <YStack gap="$4">
      <Heading level={3}>Migrate Fuse staking to Celo savings</Heading>
      <Text secondary>
        Approve migration once, then the backend completes: unstake → bridge sent → bridge received →
        stake.
      </Text>

      <YStack gap="$2" alignItems="flex-start">
        <Text variant="label" secondary>
          Your staked amount
        </Text>
        <TokenAmount token="sG$" amount={stakedAmount} size="lg" />
        {statusMessage && (
          <Text color="$primary" fontWeight="700">
            {statusMessage}
          </Text>
        )}
        {isZeroBalance && (
          <Text variant="caption" secondary>
            No staked sG$ found on Fuse for this wallet.
          </Text>
        )}
      </YStack>

      {actionLabel && onPrimaryAction && (
        <Button onPress={onPrimaryAction} disabled={actionDisabled}>
          <ButtonText>{actionLabel}</ButtonText>
        </Button>
      )}
      {actionHint && (
        <Text variant="caption" secondary>
          {actionHint}
        </Text>
      )}
    </YStack>
  )
}
