import React from 'react'
import { YStack } from 'tamagui'
import { Button, ButtonText, Heading, Icon, Text } from '@goodwidget/ui'
import type { GovernanceOnboardingAction } from '../../types'

const SUCCESS_GRADIENT = {
  background: 'linear-gradient(135deg, #00AFFF 0%, #33BFFF 60%, #7BD6FF 100%)',
}

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
    /* The gradient card IS the root — no dark outer overlay (matches Figma) */
    <YStack
      width="100%"
      borderRadius="$5"
      padding="$8"
      gap="$5"
      alignItems="center"
      style={SUCCESS_GRADIENT}
      data-testid="GovernanceOnboardingWidget-success-card"
    >
      {/* ── Celebration icon ─────────────────────────────────────── */}
      <YStack
        width={80}
        height={80}
        borderRadius="$full"
        alignItems="center"
        justifyContent="center"
        style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
        borderWidth={3}
        borderColor="rgba(255,255,255,0.65)"
        data-testid="GovernanceOnboardingWidget-success"
      >
        <Icon name="party-popper" size="lg" color="white" />
      </YStack>

      {/* ── Heading + body ───────────────────────────────────────── */}
      <YStack alignItems="center" gap="$3" maxWidth={420}>
        <Heading level={1} color="white" center>
          Welcome to Governance
        </Heading>
        <Text color="white" center>
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
      <Text variant="caption" color="white" center>
        {'© 2024 GoodDollar Governance. Civic & Transparent.'}
      </Text>
    </YStack>
  )
}
