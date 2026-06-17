import React from 'react'
import { styled } from 'tamagui'
import { Button, ButtonText, Card, Heading, Icon, Text, YStack } from '@goodwidget/ui'
import type { GovernanceOnboardingAction } from '../../types'

const SuccessGlyph = styled(YStack, {
  name: 'GovernanceOnboardingSuccessGlyph',
  width: 72,
  height: 72,
  borderRadius: '$full',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$successMuted',
})

interface SuccessStepContentProps {
  finalActions: GovernanceOnboardingAction[]
  onFinalActionPress?: (actionId: string) => void
}

export function SuccessStepContent({ finalActions, onFinalActionPress }: SuccessStepContentProps) {
  return (
    <YStack gap="$3">
      <Card elevated>
        <YStack alignItems="center" gap="$3" paddingVertical="$3">
          <SuccessGlyph>
            <Icon name="check" size="lg" color="success" />
          </SuccessGlyph>
          <YStack gap="$1" alignItems="center">
            <Heading level={4}>Governance onboarding complete</Heading>
            <Text tone="secondary" center>
              The final success state keeps the celebratory confirmation compact while still leaving room
              for one or more post-onboarding redirects.
            </Text>
          </YStack>
          <YStack gap="$2" width="100%">
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
      </Card>
    </YStack>
  )
}
