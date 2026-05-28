import React from 'react'
import { Card, Heading, Text, YStack } from '@goodwidget/ui'
import { MigrationStepRow } from './MigrationStepRow'
import type { MigrationStep } from './widgetRuntimeContract'

const STEP_ORDER: MigrationStep[] = ['unstake', 'bridge sent', 'bridge received', 'stake']

interface MigrationProgressTimelineProps {
  completedSteps: MigrationStep[]
  activeStep: MigrationStep | null
}

// This timeline preserves completed steps while advancing exactly one active spinner.
export function MigrationProgressTimeline({
  completedSteps,
  activeStep,
}: MigrationProgressTimelineProps) {
  return (
    <Card>
      <YStack gap="$3" padding="$4">
        <Heading level={4}>Migration in progress</Heading>
        <Text secondary>The backend is migrating your position from Fuse staking to Celo savings.</Text>

        <YStack gap="$2">
          {STEP_ORDER.map((step) => (
            <MigrationStepRow
              key={step}
              step={step}
              isCompleted={completedSteps.includes(step)}
              isActive={activeStep === step}
            />
          ))}
        </YStack>
      </YStack>
    </Card>
  )
}
