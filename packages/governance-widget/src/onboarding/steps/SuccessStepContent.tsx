import { YStack, XStack, Theme } from 'tamagui'
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
  backgroundColor: '$background',
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
  backgroundColor: '$background',
  borderWidth: 0,
})

interface SuccessStepContentProps {
  finalActions: GovernanceOnboardingAction[]
  stakeAmountLabel?: string
  onFinalActionPress?: (actionId: string) => void
}

function SuccessStepInner({
  finalActions,
  onFinalActionPress,
}: {
  finalActions: GovernanceOnboardingAction[]
  onFinalActionPress?: (actionId: string) => void
}) {
  return (
    <YStack width="100%" gap="$3">
      {finalActions.map((action) => {
        const isPrimary = action.variant === 'primary'

        return (
          <Button
            key={action.id}
            fullWidth
            theme={isPrimary ? 'OnboardingSuccessCardPrimary' : 'OnboardingSuccessCardSecondary'}
            disabled={action.disabled}
            onPress={() => onFinalActionPress?.(action.id)}
            data-testid={`GovernanceOnboardingWidget-success-${action.id}`}
            borderRadius="$3"
            paddingVertical="$4"
            height="auto"
            minHeight={isPrimary ? 88 : 62}
          >
            <XStack alignItems="center" justifyContent="center" gap="$3" width="100%" paddingHorizontal="$4">
              {isPrimary ? (
                <Icon name="compass" size="sm" color="inherit" />
              ) : (
                <Icon name="user" size="xs" color="inherit" />
              )}
              <ButtonText
                fontSize="$5"
                fontWeight="700"
                textAlign="center"
                lineHeight="$5"
                flex={1}
              >
                {action.label}
              </ButtonText>
            </XStack>
          </Button>
        )
      })}
    </YStack>
  )
}

export function SuccessStepContent({
  finalActions,
  stakeAmountLabel = '1,000 G$',
  onFinalActionPress,
}: SuccessStepContentProps) {
  return (
    <SuccessCard data-testid="GovernanceOnboardingWidget-success-card">
      <Theme name="OnboardingSuccessCard">
        {/* ── Celebration icon ─────────────────────────────────────── */}
        <CelebrationIcon data-testid="GovernanceOnboardingWidget-success">
          <Icon name="party-popper" size="lg" color="white" />
        </CelebrationIcon>

        {/* ── Heading + body ───────────────────────────────────────── */}
        <YStack alignItems="center" gap="$3" maxWidth={420}>
          <Heading level={3} color="$color" textAlign="center" fontWeight="700">
            Welcome to Governance
          </Heading>
          <Text color="$color" textAlign="center" fontSize="$4">
            {`You've successfully staked ${stakeAmountLabel} and joined the mission. Your voice now shapes the future of sustainable universal basic income.`}
          </Text>
        </YStack>

        {/* ── Action buttons ───────────────────────────────────────── */}
        <SuccessStepInner finalActions={finalActions} onFinalActionPress={onFinalActionPress} />

        {/* ── Footer ───────────────────────────────────────────────── */}
        <Text variant="caption" color="$color" textAlign="center" fontWeight="600">
          {'© 2024 GoodDollar Governance. Civic & Transparent.'}
        </Text>
      </Theme>
    </SuccessCard>
  )
}
