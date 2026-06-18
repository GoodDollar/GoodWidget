import React from 'react'
import { Stack, styled } from 'tamagui'
import { AddressDisplay, Button, ButtonText, Card, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import type { GovernanceIdentityStatus } from '../types'

interface OnboardingIdentityCardProps {
  identityStatus: GovernanceIdentityStatus
  walletAddress?: string
  onVerifyPress?: () => void
  onProceedPress?: () => void
}

/** Left-border accent row used for the Identity Status field when verified. */
const AccentRow = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: '$3',
  paddingHorizontal: '$3',
  borderRadius: '$2',
  backgroundColor: '$backgroundHover',
  borderLeftWidth: 3,
  variants: {
    verified: {
      true: { borderLeftColor: '$success' },
      false: { borderLeftColor: '$warning' },
    },
  } as const,
})

/** Plain field row without a left accent (e.g. Wallet Address). */
const FieldRow = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: '$3',
  paddingHorizontal: '$3',
  borderRadius: '$2',
  backgroundColor: '$backgroundHover',
})

export function OnboardingIdentityCard({
  identityStatus,
  walletAddress,
  onVerifyPress,
  onProceedPress,
}: OnboardingIdentityCardProps) {
  const isVerified = identityStatus === 'verified'

  return (
    <Card elevated>
      <YStack gap="$4" alignItems="stretch">
        {/* ── Centered icon ─────────────────────────────────────── */}
        <YStack alignItems="center" paddingTop="$2">
          <YStack
            width={72}
            height={72}
            borderRadius="$full"
            alignItems="center"
            justifyContent="center"
            backgroundColor="$infoMuted"
          >
            <Icon
              name="shield-check"
              size="lg"
              color={isVerified ? 'success' : 'primary'}
            />
          </YStack>
        </YStack>

        {/* ── Field rows ────────────────────────────────────────── */}
        <YStack gap="$2">
          {/* Wallet Address row */}
          <FieldRow>
            <Text variant="label" tone="secondary">
              Wallet Address
            </Text>
            {walletAddress ? (
              <AddressDisplay address={walletAddress} size="sm" />
            ) : (
              <Text tone="secondary" fontWeight="600">
                Not connected
              </Text>
            )}
          </FieldRow>

          {/* Identity Status row — green left accent when verified */}
          <AccentRow verified={isVerified}>
            <YStack gap="$0.5">
              <Text variant="label" tone="secondary">
                Identity Status
              </Text>
              <Text
                fontWeight="700"
                color={isVerified ? '$success' : '$warning'}
              >
                {isVerified ? 'Verified' : 'Verification required'}
              </Text>
            </YStack>
            {isVerified ? (
              <Stack
                width={28}
                height={28}
                borderRadius="$full"
                borderWidth={2}
                borderColor="$success"
                alignItems="center"
                justifyContent="center"
              >
                <Icon name="check" size="xs" color="success" />
              </Stack>
            ) : (
              <Stack
                width={28}
                height={28}
                borderRadius="$full"
                borderWidth={2}
                borderColor="$warning"
                alignItems="center"
                justifyContent="center"
              >
                <Icon name="alert-triangle" size="xs" color="warning" />
              </Stack>
            )}
          </AccentRow>
        </YStack>

        {/* ── CTA buttons ───────────────────────────────────────── */}
        <YStack gap="$2">
          {!isVerified && (
            <Button
              fullWidth
              onPress={onVerifyPress}
              aria-label="Verify identity"
              data-testid="GovernanceOnboardingWidget-verify-btn"
            >
              <ButtonText>Verify Identity</ButtonText>
            </Button>
          )}
          <Button
            fullWidth
            disabled={!isVerified}
            onPress={onProceedPress}
            variant={isVerified ? 'primary' : 'secondary'}
            aria-label="Proceed to Membership"
            data-testid="GovernanceOnboardingWidget-proceed-btn"
          >
            <ButtonText>Proceed to Membership</ButtonText>
          </Button>
        </YStack>
      </YStack>
    </Card>
  )
}
