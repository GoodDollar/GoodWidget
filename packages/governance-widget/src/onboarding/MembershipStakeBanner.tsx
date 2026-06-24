import React from 'react'
import { Badge, BadgeText, Card, Icon, Text, XStack, YStack } from '@goodwidget/ui'

interface MembershipStakeBannerProps {
  stakeAmountLabel: string
  warningMessage: string
}

/**
 * Staking banner shown above the profile form. Highlights the required stake
 * amount and a wallet-funds warning so members can confirm they are funded
 * before submitting the governance application.
 */
export function MembershipStakeBanner({ stakeAmountLabel, warningMessage }: MembershipStakeBannerProps) {
  return (
    <Card elevated backgroundColor="$backgroundHover" borderColor="$primary">
      <YStack gap="$3">
        <XStack alignItems="center" gap="$3">
          <XStack
            width={48}
            height={48}
            borderRadius="$full"
            alignItems="center"
            justifyContent="center"
            backgroundColor="$primary"
          >
            <Icon name="info" color="white" />
          </XStack>
          <YStack gap="$1">
            <Text variant="caption" tone="secondary">
              Membership Stake
            </Text>
            <Text fontWeight="700" fontSize="$7" lineHeight="$7" color="$color">
              {stakeAmountLabel}
            </Text>
          </YStack>
        </XStack>

        <XStack
          alignItems="flex-start"
          gap="$3"
          padding="$3"
          borderRadius="$3"
          backgroundColor="$errorMuted"
          borderWidth={1}
          borderColor="$error"
        >
          <Icon name="alert-triangle" color="error" />
          <YStack flex={1} gap="$2">
            <Badge type="error">
              <BadgeText>Wallet funding required</BadgeText>
            </Badge>
            <Text variant="caption">{warningMessage}</Text>
          </YStack>
        </XStack>
      </YStack>
    </Card>
  )
}
