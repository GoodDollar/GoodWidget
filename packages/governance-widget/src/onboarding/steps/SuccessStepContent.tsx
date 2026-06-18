import React from 'react'
import { Stack, YStack } from 'tamagui'
import { Button, ButtonText, createComponent, Heading, Icon, Text } from '@goodwidget/ui'
import type { GovernanceOnboardingAction } from '../../types'

const SUCCESS_GRADIENT = {
  background: 'linear-gradient(135deg, #00AFFF 0%, #33BFFF 60%, #7BD6FF 100%)',
}

const CelebrationOverlay = createComponent(Stack, {
  name: 'GovernanceSuccessOverlay',
  width: '100%',
  minHeight: 420,
  paddingVertical: '$8',
  paddingHorizontal: '$5',
  backgroundColor: '#191C1E',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
})

interface SuccessStepContentProps {
  finalActions: GovernanceOnboardingAction[]
  onFinalActionPress?: (actionId: string) => void
}

export function SuccessStepContent({ finalActions, onFinalActionPress }: SuccessStepContentProps) {
  return (
    <CelebrationOverlay data-testid="GovernanceOnboardingWidget-success">
      <YStack
        position="absolute"
        top={-180}
        right={-180}
        width={520}
        height={520}
        opacity={0.18}
        alignItems="center"
        justifyContent="center"
        pointerEvents="none"
      >
        <Icon name="globe" size="2xl" color="white" />
      </YStack>

      <YStack
        width="100%"
        maxWidth={520}
        borderRadius="$5"
        padding="$8"
        gap="$5"
        alignItems="center"
        style={SUCCESS_GRADIENT}
        data-testid="GovernanceOnboardingWidget-success-card"
      >
        <YStack
          width={80}
          height={80}
          borderRadius="$full"
          alignItems="center"
          justifyContent="center"
          style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
          borderWidth={3}
          borderColor="rgba(255,255,255,0.65)"
        >
          <Icon name="check" size="lg" color="white" />
        </YStack>

        <YStack alignItems="center" gap="$3" maxWidth={420}>
          <Heading level={1} color="white" center>
            Welcome to Governance
          </Heading>
          <Text color="white" center>
            {`You've successfully staked the required G$ and joined the mission. Your voice now shapes the
            network's future.`}
          </Text>
        </YStack>

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
              <ButtonText>{action.label}</ButtonText>
            </Button>
          ))}
        </YStack>

        <Text variant="caption" color="white" center>
          {`© 2024 GoodDollar Governance. Civic & Transparent.`}
        </Text>
      </YStack>
    </CelebrationOverlay>
  )
}
