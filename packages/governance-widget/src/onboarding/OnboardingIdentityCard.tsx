import React from 'react'
import { AddressDisplay, Badge, BadgeText, Card, Heading, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import type { GovernanceIdentityStatus } from '../types'

interface OnboardingIdentityCardProps {
  identityStatus: GovernanceIdentityStatus
  walletAddress?: string
  onVerifyPress?: () => void
}

export function OnboardingIdentityCard({
  identityStatus,
  walletAddress,
  onVerifyPress,
}: OnboardingIdentityCardProps) {
  const isVerified = identityStatus === 'verified'

  return (
    <Card elevated>
      <YStack gap="$3">
        <XStack alignItems="center" justifyContent="space-between" gap="$3" flexWrap="wrap">
          <XStack alignItems="center" gap="$3">
            <YStack
              width={48}
              height={48}
              borderRadius="$full"
              alignItems="center"
              justifyContent="center"
              backgroundColor={isVerified ? '$successMuted' : '$infoMuted'}
            >
              <Icon
                name={isVerified ? 'check' : 'info'}
                color={isVerified ? 'success' : 'primary'}
                size="md"
              />
            </YStack>
            <YStack gap="$0.5">
              <Text variant="caption" tone="secondary">
                Connected wallet
              </Text>
              {walletAddress ? (
                <AddressDisplay address={walletAddress} size="md" />
              ) : (
                <Text tone="secondary" fontWeight="600">
                  No wallet connected
                </Text>
              )}
            </YStack>
          </XStack>
          <Badge type={isVerified ? 'success' : 'warning'}>
            <BadgeText>{isVerified ? 'Identity verified' : 'Verification required'}</BadgeText>
          </Badge>
        </XStack>

        <YStack gap="$1">
          <Heading level={4}>
            {isVerified ? 'Identity verified' : 'Identity not verified yet'}
          </Heading>
          <Text tone="secondary">
            {isVerified
              ? 'Your wallet is cleared to move into house selection, profile setup, and the membership stake flow.'
              : 'Run the verify action to unlock house selection. The proceed CTA stays disabled until verification succeeds.'}
          </Text>
        </YStack>

        {!isVerified ? (
          <XStack>
            <YStack
              alignSelf="flex-start"
              borderRadius="$4"
              borderWidth={1}
              borderColor="$borderColorFocus"
              paddingHorizontal="$4"
              paddingVertical="$2"
              hoverStyle={{ backgroundColor: '$backgroundHover' }}
              pressStyle={{ backgroundColor: '$backgroundPress' }}
              onPress={onVerifyPress}
              cursor="pointer"
              accessibilityRole="button"
              accessibilityLabel="Verify identity"
            >
              <XStack alignItems="center" gap="$2">
                <Icon name="info" color="primary" size="sm" />
                <Text color="$primary" fontWeight="700">
                  Verify identity
                </Text>
              </XStack>
            </YStack>
          </XStack>
        ) : null}
      </YStack>
    </Card>
  )
}
