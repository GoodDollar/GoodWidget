import React from 'react'
import { YStack, XStack } from 'tamagui'
import { Button, ButtonText, Heading, Icon, Text, createComponent } from '@goodwidget/ui'
import type { GovernanceOnboardingAction } from '../../types'

/**
 * Success celebration card with gradient background.
 * Named 'OnboardingSuccessCard' for theme overrides.
 */
const SuccessCard = createComponent(YStack, {
  name: 'OnboardingSuccessCard',
  width: '100%',
  borderRadius: '$5', // 20px radius
  padding: '$8',      // 32px padding
  gap: '$5',
  alignItems: 'center',
  backgroundColor: '$primary',
})

/**
 * Celebration icon container — 20% opacity solid white fill circle.
 * Matches Figma: 80x80px filled circle with 20% opacity white background, no border ring.
 * Named 'OnboardingCelebrationIcon' for theme overrides.
 */
const CelebrationIcon = createComponent(YStack, {
  name: 'OnboardingCelebrationIcon',
  width: 80,
  height: 80,
  borderRadius: '$full',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  borderWidth: 0,
})

interface SuccessStepContentProps {
  finalActions: GovernanceOnboardingAction[]
  stakeAmountLabel?: string
  onFinalActionPress?: (actionId: string) => void
}

export function SuccessStepContent({
  finalActions,
  stakeAmountLabel = '1,000 G$',
  onFinalActionPress,
}: SuccessStepContentProps) {
  return (
    <SuccessCard data-testid="GovernanceOnboardingWidget-success-card">
      {/* ── Celebration icon ─────────────────────────────────────── */}
      <CelebrationIcon data-testid="GovernanceOnboardingWidget-success">
        <Icon name="party-popper" size="lg" color="white" />
      </CelebrationIcon>

      {/* ── Heading + body ───────────────────────────────────────── */}
      <YStack alignItems="center" gap="$3" maxWidth={420}>
        <Heading level={3} color="$white" textAlign="center" fontWeight="700">
          Welcome to Governance
        </Heading>
        <Text color="$white" textAlign="center" fontSize="$4">
          {`You've successfully staked ${stakeAmountLabel} and joined the mission. Your voice now shapes the future of sustainable universal basic income.`}
        </Text>
      </YStack>

      {/* ── Action buttons ───────────────────────────────────────── */}
      <YStack width="100%" gap="$3">
        {finalActions.map((action, index) => {
          const isPrimary = index === 0
          return (
            <Button
              key={action.id}
              fullWidth
              disabled={action.disabled}
              onPress={() => onFinalActionPress?.(action.id)}
              data-testid={`GovernanceOnboardingWidget-success-${action.id}`}
              // Base button style configurations for Figma parity:
              // - Corner radius 12px ($3)
              // - Primary CTA: solid white background
              // - Secondary CTA: 20% opacity translucent white background
              backgroundColor={isPrimary ? 'white' : 'rgba(255, 255, 255, 0.2)'}
              borderRadius="$3"
              paddingVertical="$4"
              height="auto"
              minHeight={isPrimary ? 88 : 62}
              hoverStyle={{
                backgroundColor: isPrimary ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)',
              }}
              pressStyle={{
                backgroundColor: isPrimary ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.15)',
              }}
            >
              <XStack alignItems="center" justifyContent="center" gap="$3" width="100%" paddingHorizontal="$4">
                {isPrimary ? (
                  <Icon name="compass" size="sm" color="primary" />
                ) : (
                  <Icon name="user" size="xs" color="white" />
                )}
                <ButtonText
                  color={isPrimary ? '$primary' : '$white'}
                  fontSize="$5"
                  fontWeight="700"
                  textAlign="center"
                  lineHeight="$5"
                  style={{ whiteSpace: 'pre-line' }}
                  flex={1}
                >
                  {isPrimary ? action.label.replace(' ', '\n') : action.label}
                </ButtonText>
              </XStack>
            </Button>
          )
        })}
      </YStack>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <Text variant="caption" color="$white" textAlign="center" fontWeight="600">
        {'© 2024 GoodDollar Governance. Civic & Transparent.'}
      </Text>
    </SuccessCard>
  )
}
