import React from 'react'
import { YStack } from 'tamagui'
import { Button, ButtonText, Heading, Icon, Text, createComponent } from '@goodwidget/ui'
import type { GovernanceOnboardingAction } from '../../types'

/**
 * Success celebration card with gradient background.
 * Named 'OnboardingSuccessCard' for theme overrides.
 */
const SuccessCard = createComponent(YStack, {
  name: 'OnboardingSuccessCard',
  width: '100%',
  borderRadius: '$5',
  padding: '$6',
  gap: '$4',
  alignItems: 'center',
  backgroundColor: '$primary',
})

/**
 * Celebration icon container — solid semi-transparent white fill circle.
 * Matches Figma: ~56px filled circle, no border ring.
 * Named 'OnboardingCelebrationIcon' for theme overrides.
 */
const CelebrationIcon = createComponent(YStack, {
  name: 'OnboardingCelebrationIcon',
  width: 48,
  height: 48,
  borderRadius: '$full',
  alignItems: 'center',
  justifyContent: 'center',
  // Solid semi-transparent white — visible on the blue card background
  backgroundColor: 'rgba(255,255,255,0.25)',
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
        <Icon name="party-popper" size="sm" color="white" />
      </CelebrationIcon>

      {/* ── Heading + body ───────────────────────────────────────── */}
      <YStack alignItems="center" gap="$2" maxWidth={420}>
        <Heading level={3} color="$white" textAlign="center">
          Welcome to Governance
        </Heading>
        <Text color="$white" textAlign="center">
          {`You've successfully staked ${stakeAmountLabel} and joined the mission. Your voice now shapes the future of sustainable universal basic income.`}
        </Text>
      </YStack>

      {/* ── Action buttons ───────────────────────────────────────── */}
      <YStack width="100%" gap="$3">
        {finalActions.map((action, index) => (
          <Button
            key={action.id}
            fullWidth
            disabled={action.disabled}
            onPress={() => onFinalActionPress?.(action.id)}
            data-testid={`GovernanceOnboardingWidget-success-${action.id}`}
            // Primary CTA (index 0): solid white pill — white bg, primary-colored text/icon
            // Secondary CTA (index 1): ghost — transparent bg, white text/icon
            variant={action.variant ?? (index === 0 ? 'primary' : 'ghost')}
            {...(index === 0
              ? { backgroundColor: 'white', borderRadius: '$full' }
              : {})}
          >
            {index === 0 ? (
              <Icon name="compass" size="sm" color="primary" />
            ) : (
              <Icon name="user" size="sm" color="white" />
            )}
            <ButtonText color={index === 0 ? '$primary' : '$white'}>
              {action.label}
            </ButtonText>
          </Button>
        ))}
      </YStack>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <Text variant="caption" color="$white" textAlign="center">
        {'© 2024 GoodDollar Governance. Civic & Transparent.'}
      </Text>
    </SuccessCard>
  )
}
