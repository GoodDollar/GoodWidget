import React from 'react'
import { Button, ButtonText, Heading, Icon, Text, YStack } from '@goodwidget/ui'
import type { GovernanceOnboardingAction } from '../../types'

const SUCCESS_GRADIENT = {
  background: 'linear-gradient(135deg, #00B0FF 0%, #33BFFF 60%, #7BD6FF 100%)',
}

interface SuccessStepContentProps {
  finalActions: GovernanceOnboardingAction[]
  onFinalActionPress?: (actionId: string) => void
}

export function SuccessStepContent({ finalActions, onFinalActionPress }: SuccessStepContentProps) {
  return (
    <YStack
      width="100%"
      borderRadius="$4"
      overflow="hidden"
      data-testid="GovernanceOnboardingWidget-success"
    >
      <YStack
        width="100%"
        style={SUCCESS_GRADIENT}
        paddingVertical="$8"
        paddingHorizontal="$5"
        alignItems="center"
        gap="$4"
        color="white"
      >
        <YStack
          width={120}
          height={120}
          borderRadius="$full"
          alignItems="center"
          justifyContent="center"
          style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
          borderWidth={3}
          borderColor="rgba(255,255,255,0.65)"
        >
          <Icon name="check" size="2xl" color="inherit" />
        </YStack>
        <YStack alignItems="center" gap="$2" maxWidth={420}>
          <Heading level={3} color="white" center>
            Onboarding complete
          </Heading>
          <Text color="white" center>
            Your governance membership is registered. You can now open the dashboard or browse the
            proposal queue.
          </Text>
        </YStack>
      </YStack>

      <YStack
        width="100%"
        paddingVertical="$4"
        paddingHorizontal="$4"
        gap="$2"
        backgroundColor="$background"
      >
        {finalActions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant ?? 'primary'}
            fullWidth
            disabled={action.disabled}
            onPress={() => onFinalActionPress?.(action.id)}
          >
            <ButtonText>{action.label}</ButtonText>
          </Button>
        ))}
      </YStack>
    </YStack>
  )
}
