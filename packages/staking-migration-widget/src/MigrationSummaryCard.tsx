import React from 'react'
import { Button, ButtonText, Card, Heading, Text, TokenAmount, YStack } from '@goodwidget/ui'

interface MigrationSummaryCardProps {
  stakedAmount: string
  isZeroBalance: boolean
  isApprovalPending: boolean
  isDisabled: boolean
  actionLabel: string
  onPrimaryAction: () => void
}

// This summary card is the entry point for approve-and-migrate user action.
export function MigrationSummaryCard({
  stakedAmount,
  isZeroBalance,
  isApprovalPending,
  isDisabled,
  actionLabel,
  onPrimaryAction,
}: MigrationSummaryCardProps) {
  return (
    <Card>
      <YStack gap="$4" padding="$4">
        <Heading level={3}>Migrate Fuse staking to Celo savings</Heading>
        <Text secondary>
          Approve migration once, then the backend completes: unstake → bridge sent → bridge received
          → stake.
        </Text>

        <YStack gap="$2" alignItems="flex-start">
          <Text variant="label" secondary>
            Your staked amount
          </Text>
          <TokenAmount token="sG$" amount={stakedAmount} size="lg" />
          {isZeroBalance && (
            <Text variant="caption" secondary>
              No staked sG$ found on Fuse for this wallet.
            </Text>
          )}
        </YStack>

        <Button onPress={onPrimaryAction} disabled={isDisabled}>
          <ButtonText>{isApprovalPending ? 'Approval pending…' : actionLabel}</ButtonText>
        </Button>
      </YStack>
    </Card>
  )
}
