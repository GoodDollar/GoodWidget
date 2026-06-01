import React from 'react'
import { YStack, Heading, Text, TokenAmount, Button, ButtonText, Icon } from '@goodwidget/ui'

interface MigrationSummaryCardProps {
  stakedAmount: string
  isZeroBalance: boolean
  actionHint?: string
  statusMessage?: string
  actionLabel: string
  actionDisabled: boolean
  onPrimaryAction?: () => void
  showWarningIcon?: boolean
}

export function MigrationSummaryCard({
  stakedAmount,
  isZeroBalance,
  actionHint,
  statusMessage,
  actionLabel,
  actionDisabled,
  onPrimaryAction,
  showWarningIcon = false,
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

        <Button
          onPress={actionDisabled ? undefined : onPrimaryAction}
          disabled={actionDisabled}
          width={126}
          height={126}
          borderRadius="$full"
          alignItems="center"
          justifyContent="center"
          paddingHorizontal="$3"
        >
          <YStack gap="$1" alignItems="center">
            {showWarningIcon && <Icon name="alert-triangle" size="xs" color="inherit" />}
            <ButtonText textAlign="center">{actionLabel}</ButtonText>
          </YStack>
        </Button>

        {statusMessage && (
          <Text color="$primary" fontWeight="700" textAlign="center">
            {statusMessage}
          </Text>
        )}
        {isZeroBalance && (
          <Text variant="caption" secondary textAlign="center">
            No staked sG$ found on Fuse for this wallet.
          </Text>
        )}
        {actionHint && (
          <Text variant="caption" secondary textAlign="center">
            {actionHint}
          </Text>
        )}
      </YStack>
    </YStack>
  )
}
