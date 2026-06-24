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
  padding: '$8',
  gap: '$5',
  alignItems: 'center',
  backgroundColor: '$primary',
})

/**
 * Celebration icon container with translucent overlay.
 */
const CelebrationIcon = createComponent(YStack, {
  name: 'OnboardingCelebrationIcon',
  width: 80,
  height: 80,
  borderRadius: '$full',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$backgroundTransparent',
  borderWidth: 3,
  borderColor: '$backgroundHover',
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
        <Heading level={1} color="$white" center>
          Welcome to Governance
        </Heading>
        <Text color="$white" center>
          {`You've successfully staked ${stakeAmountLabel} and joined the mission. Your voice now shapes the future of sustainable universal basic income.`}
        </Text>
      </YStack>

      {/* ── Action buttons ───────────────────────────────────────── */}
      <YStack width="100%" gap="$3">
        {finalActions.map((action, index) => (
          <Button
            key={action.id}
            fullWidth
            variant={action.variant ?? (index === 0 ? 'secondary' : 'primary')}
            disabled={action.disabled}
            onPress={() => onFinalActionPress?.(action.id)}
            data-testid={`GovernanceOnboardingWidget-success-${action.id}`}
          >
            {index === 0 ? (
              <Icon name="compass" size="sm" color="primary" />
            ) : (
              <Icon name="user" size="sm" color="white" />
            )}
            <ButtonText>{action.label}</ButtonText>
          </Button>
        ))}
      </YStack>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <Text variant="caption" color="$white" center>
        {'© 2024 GoodDollar Governance. Civic & Transparent.'}
      </Text>
    </SuccessCard>
  )
}
