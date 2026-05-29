import React from 'react'
import { Badge, BadgeText, Heading, Text, YStack } from '@goodwidget/ui'
import { MigrationStepRow } from './MigrationStepRow'
import type { MigrationStep, StakingMigrationWidgetStatus } from './widgetRuntimeContract'

const STEP_ORDER: MigrationStep[] = ['unstake', 'bridge sent', 'bridge received', 'stake']

interface MigrationProgressTimelineProps {
  status: StakingMigrationWidgetStatus
  completedSteps: MigrationStep[]
  activeStep: MigrationStep | null
  failedStep: MigrationStep | null
}

// This timeline preserves completed steps while advancing exactly one active spinner.
export function MigrationProgressTimeline({
  status,
  completedSteps,
  activeStep,
  failedStep,
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
      ? 'Your staked position was migrated from Fuse staking to Celo savings.'
      : status === 'error'
        ? 'Migration stopped before completion. Resolve the issue and retry.'
        : status === 'approval-failed'
          ? 'Approval did not complete. Retry approval to continue.'
          : status === 'wrong-network'
            ? 'Switch wallet network to Fuse to approve migration.'
            : status === 'missing-config'
              ? 'Provide migrationApiBaseUrl and migrationOperator before enabling migration.'
              : 'Approve migration on Fuse, then backend steps continue automatically.'

  return (
    <YStack gap="$3">
      <YStack gap="$2">
        <Badge type={statusBadgeType}>
          <BadgeText>{statusLabel}</BadgeText>
        </Badge>
        <Heading level={4}>Migration journey</Heading>
        <Text secondary>{timelineDescription}</Text>
      </YStack>

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
