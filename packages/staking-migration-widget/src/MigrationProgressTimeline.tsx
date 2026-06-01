import React from 'react'
import { Badge, BadgeText, Card, Heading, Text, YStack } from '@goodwidget/ui'
import { MigrationStepRow } from './MigrationStepRow'
import type { MigrationStep, StakingMigrationWidgetStatus } from './widgetRuntimeContract'

const STEP_ORDER: MigrationStep[] = ['unstake', 'bridge sent', 'bridge received', 'stake']

interface MigrationProgressTimelineProps {
  status: StakingMigrationWidgetStatus
  completedSteps: MigrationStep[]
  activeStep: MigrationStep | null
  failedStep: MigrationStep | null
  error: string | null
}

// This timeline preserves completed steps while advancing exactly one active spinner.
export function MigrationProgressTimeline({
  status,
  completedSteps,
  activeStep,
  failedStep,
  error,
}: MigrationProgressTimelineProps) {
  const approvalCompleted = status === 'migrating' || status === 'success' || status === 'error'
  const approvalActive = status === 'approval-pending'
  const approvalFailed = status === 'approval-failed'

  const statusBadgeType =
    status === 'success'
      ? 'success'
      : status === 'error' || status === 'approval-failed'
        ? 'error'
        : status === 'wrong-network' || status === 'missing-config'
          ? 'warning'
          : 'info'

  const statusLabel =
    status === 'success'
      ? 'Completed'
      : status === 'error' || status === 'approval-failed'
        ? 'Failed'
        : status === 'approval-pending' || status === 'migrating'
          ? 'In progress'
          : status === 'wrong-network'
            ? 'Action needed'
            : 'Ready'

  const timelineDescription =
    status === 'success'
      ? 'Migration completed and your position is now in Celo savings.'
      : status === 'error'
        ? failedStep
          ? `Failed at ${failedStep}: ${error ?? 'Unknown backend error'}`
          : error ?? 'Unknown backend error'
        : status === 'approval-failed'
          ? error ?? 'Approval did not complete. Retry approval to continue.'
          : status === 'wrong-network'
            ? 'Switch to Fuse to start approval.'
            : status === 'missing-config'
              ? 'Provide migrationApiBaseUrl and migrationOperator before enabling migration.'
              : 'Approve on Fuse, then migration continues automatically.'

  const currentActionLabel =
    status === 'wrong-network'
      ? 'Switch to Fuse'
      : status === 'approval-pending'
        ? 'Approve on Fuse wallet'
        : status === 'migrating'
          ? activeStep
            ? `${activeStep} in progress`
            : 'Migration in progress'
          : status === 'success'
            ? 'Migration complete'
            : status === 'error' || status === 'approval-failed'
              ? 'Retry migration'
              : 'Approve and migrate'

  return (
    <YStack gap="$3">
      <YStack gap="$2">
        <Badge type={statusBadgeType}>
          <BadgeText>{statusLabel}</BadgeText>
        </Badge>
        <Heading level={4}>Migration journey</Heading>
        <Text secondary>{timelineDescription}</Text>
      </YStack>

      <Card outlined>
        <YStack gap="$1">
          <Text variant="caption" secondary>
            Current action
          </Text>
          <Heading level={5}>{currentActionLabel}</Heading>
        </YStack>
      </Card>

      <YStack gap="$2">
        <MigrationStepRow
          step="approve on Fuse"
          isCompleted={approvalCompleted}
          isActive={approvalActive}
          isFailed={approvalFailed}
        />
        {STEP_ORDER.map((step) => (
          <MigrationStepRow
            key={step}
            step={step}
            isCompleted={completedSteps.includes(step)}
            isActive={activeStep === step}
            isFailed={failedStep === step}
          />
        ))}
      </YStack>
    </YStack>
  )
}
