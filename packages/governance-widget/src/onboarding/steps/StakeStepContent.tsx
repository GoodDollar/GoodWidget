import React from 'react'
import { Badge, BadgeText, Card, Heading, Stepper, Text, XStack, YStack } from '@goodwidget/ui'
import { resolveStakeSummary } from '../resolveStakeSummary'
import type { StepperStepItem } from '@goodwidget/ui'

interface StakeStepContentProps {
  stakeAmountLabel: string
  transactionSteps: StepperStepItem[]
}

export function StakeStepContent({ stakeAmountLabel, transactionSteps }: StakeStepContentProps) {
  const stakeSummary = resolveStakeSummary(transactionSteps)

  return (
    <YStack gap="$3">
      <Card elevated>
        <YStack gap="$3">
          <XStack alignItems="center" justifyContent="space-between" gap="$3" flexWrap="wrap">
            <Badge type="info">
              <BadgeText>{stakeAmountLabel} locked stake</BadgeText>
            </Badge>
            <Badge type={stakeSummary.badgeType}>
              <BadgeText>{stakeSummary.title}</BadgeText>
            </Badge>
          </XStack>

          <Stepper
            steps={transactionSteps}
            header={
              <YStack gap="$1">
                <Heading level={5}>Stake progress tracker</Heading>
                <Text tone="secondary">{stakeSummary.description}</Text>
              </YStack>
            }
            // 320px matches the wizard's available vertical space after the
            // card chrome + header + footer — the Stepper's default 360px
            // would clip the 4th transaction row on a 720px-tall mobile frame.
            maxHeight={320}
          />
        </YStack>
      </Card>
    </YStack>
  )
}
