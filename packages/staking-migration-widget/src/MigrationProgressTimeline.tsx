import React, { useMemo } from 'react'
import { Stepper, Text, YStack } from '@goodwidget/ui'
import type { MigrationStep, StakingMigrationWidgetStatus } from './widgetRuntimeContract'
import {
  MIGRATION_STEP_ORDER,
  STATUS_HEADER,
  buildTimelineStep,
  formatStepLabel,
  getApproveDescription,
  getStepDescription,
} from './migrationTimelineConfig'

interface MigrationProgressTimelineProps {
  status: StakingMigrationWidgetStatus
  completedSteps: MigrationStep[]
  activeStep: MigrationStep | null
  failedStep: MigrationStep | null
  error: string | null
  hasAvailableBalance: boolean
}

export function MigrationProgressTimeline({
  status,
  completedSteps,
  activeStep,
  failedStep,
  error,
  hasAvailableBalance,
}: MigrationProgressTimelineProps) {
  const approvalCompleted = status === 'migrating' || status === 'success' || status === 'error'
  const approvalActive =
    ((status === 'summary' || status === 'wrong-network') && hasAvailableBalance) ||
    status === 'approval-pending' ||
    status === 'approval-failed'
  const approvalFailed = status === 'approval-failed'
  const approveNeedsAttention = status === 'wrong-network' || status === 'approval-failed'
  const header = STATUS_HEADER[status]

  const steps = useMemo(
    () => [
      buildTimelineStep(
        'approve-on-fuse',
        'Approve on Fuse',
        getApproveDescription(status, error),
        {
          isCompleted: approvalCompleted,
          isActive: approvalActive,
          isFailed: approvalFailed,
          needsAttention: approveNeedsAttention,
        },
      ),
      ...MIGRATION_STEP_ORDER.map((step) =>
        buildTimelineStep(
          step,
          formatStepLabel(step),
          getStepDescription(step, status, activeStep, failedStep, error),
          {
            isCompleted: completedSteps.includes(step),
            isActive: activeStep === step,
            isFailed: failedStep === step,
            needsAttention: failedStep === step,
          },
        ),
      ),
    ],
    [
      activeStep,
      approvalActive,
      approvalCompleted,
      approvalFailed,
      approveNeedsAttention,
      completedSteps,
      error,
      failedStep,
      status,
    ],
  )

  const activeStepId = useMemo(
    () =>
      approvalActive || approvalFailed ? 'approve-on-fuse' : (failedStep ?? activeStep),
    [activeStep, approvalActive, approvalFailed, failedStep],
  )

  return (
    <Stepper
      steps={steps}
      activeStepId={activeStepId}
      header={
        <YStack gap="$2">
          {header && (
            <Text variant="caption" color={header.color} fontWeight="700">
              {header.label}
            </Text>
          )}
          {!hasAvailableBalance && status === 'summary' && (
            <Text secondary>No migration available for this wallet yet.</Text>
          )}
        </YStack>
      }
    />
  )
}
