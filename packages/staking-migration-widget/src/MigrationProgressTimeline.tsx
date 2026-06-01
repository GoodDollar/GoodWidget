import React, { useMemo } from 'react'
import { Heading, Stepper, Text, YStack, type StepperStepItem } from '@goodwidget/ui'
import type { MigrationStep, StakingMigrationWidgetStatus } from './widgetRuntimeContract'

const STEP_ORDER: MigrationStep[] = ['unstake', 'bridge sent', 'bridge received', 'stake']

interface MigrationProgressTimelineProps {
  status: StakingMigrationWidgetStatus
  completedSteps: MigrationStep[]
  activeStep: MigrationStep | null
  failedStep: MigrationStep | null
  error: string | null
  hasAvailableBalance: boolean
}

function formatStepLabel(step: MigrationStep): string {
  if (step === 'bridge sent') return 'Bridge to Celo'
  if (step === 'stake') return 'Stake on Celo'
  return step
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getApproveDescription(status: StakingMigrationWidgetStatus, error: string | null): string {
  if (status === 'wrong-network') {
    return 'Switch to the Fuse network to approve the migration.'
  }

  if (status === 'approval-pending') {
    return 'Confirm the approval transaction in your wallet.'
  }

  if (status === 'approval-failed') {
    return error ?? 'Approval did not complete. Retry to continue.'
  }

  if (status === 'migrating' || status === 'success' || status === 'error') {
    return 'Approval confirmed on Fuse.'
  }

  return 'Approve the migration from your Fuse wallet.'
}

function getStepDescription(
  step: MigrationStep,
  status: StakingMigrationWidgetStatus,
  activeStep: MigrationStep | null,
  failedStep: MigrationStep | null,
  error: string | null,
): string {
  if (failedStep === step) {
    return error ?? 'This step failed. Retry the migration to continue.'
  }

  if (activeStep === step) {
    return 'Currently in progress.'
  }

  if (status === 'success' || status === 'error' || status === 'migrating') {
    if (step === 'unstake') return 'Release the staked position on Fuse.'
    if (step === 'bridge sent') return 'Send the migrated assets from Fuse.'
    if (step === 'bridge received') return 'Finalize the bridge transfer on Celo.'
    return 'Deposit the migrated assets into Celo savings.'
  }

  return 'Pending'
}

function getStepStatusLabel(status: StakingMigrationWidgetStatus): string | null {
  if (status === 'success') return 'Completed'
  if (status === 'error' || status === 'approval-failed') return 'Failed'
  if (status === 'missing-config') return 'Configuration required'
  return null
}

function resolveMigrationStepStatus(
  isCompleted: boolean,
  isActive: boolean,
  isFailed: boolean,
  needsAttention: boolean,
): StepperStepItem['status'] {
  if (isCompleted) return 'completed'
  if (isFailed) return 'failed'
  if (isActive && needsAttention) return 'attention'
  if (isActive) return 'active'
  return 'pending'
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

  const statusColor =
    status === 'success'
      ? '$success'
      : status === 'error' || status === 'approval-failed'
        ? '$error'
        : status === 'wrong-network' || status === 'missing-config'
          ? '$warning'
          : '$primary'

  const statusLabel = getStepStatusLabel(status)

  const steps = useMemo<StepperStepItem[]>(() => {
    const approveStatus = resolveMigrationStepStatus(
      approvalCompleted,
      approvalActive,
      approvalFailed,
      approveNeedsAttention,
    )

    const migrationSteps = STEP_ORDER.map((step) => {
      const isCompleted = completedSteps.includes(step)
      const isActive = activeStep === step
      const isFailed = failedStep === step
      const needsAttention = failedStep === step

      return {
        id: step,
        title: formatStepLabel(step),
        description: getStepDescription(step, status, activeStep, failedStep, error),
        status: resolveMigrationStepStatus(isCompleted, isActive, isFailed, needsAttention),
      }
    })

    return [
      {
        id: 'approve-on-fuse',
        title: 'Approve on Fuse',
        description: getApproveDescription(status, error),
        status: approveStatus,
      },
      ...migrationSteps,
    ]
  }, [
    activeStep,
    approvalActive,
    approvalCompleted,
    approvalFailed,
    approveNeedsAttention,
    completedSteps,
    error,
    failedStep,
    status,
  ])

  const activeStepId = useMemo(() => {
    if (approvalActive || approvalFailed) return 'approve-on-fuse'
    if (failedStep) return failedStep
    if (activeStep) return activeStep
    return null
  }, [activeStep, approvalActive, approvalFailed, failedStep])

  return (
    <Stepper
      steps={steps}
      activeStepId={activeStepId}
      header={
        <YStack gap="$2">
          <Heading level={4}>Migration journey</Heading>
          {statusLabel && (
            <Text variant="caption" color={statusColor} fontWeight="700">
              {statusLabel}
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
