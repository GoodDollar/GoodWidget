import React from 'react'
import { Heading, Text, YStack } from '@goodwidget/ui'
import { getStepConnectorColor, MigrationStepRow } from './MigrationStepRow'
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

  const approveConnectorBelow = getStepConnectorColor(
    approvalCompleted,
    approvalFailed,
    approvalActive,
    approveNeedsAttention,
  )

  const migrationStepStates = STEP_ORDER.map((step) => {
    const isCompleted = completedSteps.includes(step)
    const isActive = activeStep === step
    const isFailed = failedStep === step
    const needsAttention = failedStep === step
    return {
      step,
      isCompleted,
      isActive,
      isFailed,
      needsAttention,
      connectorBelow: getStepConnectorColor(isCompleted, isFailed, isActive, needsAttention),
    }
  })

  return (
    <YStack gap="$3">
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

      <YStack gap="$2">
        <MigrationStepRow
          step="Approve on Fuse"
          description={getApproveDescription(status, error)}
          needsAttention={approveNeedsAttention}
          isCompleted={approvalCompleted}
          isActive={approvalActive}
          isFailed={approvalFailed}
          isFirst
        />
        {migrationStepStates.map((stepState, index) => {
          const connectorAbove =
            index === 0 ? approveConnectorBelow : migrationStepStates[index - 1].connectorBelow

          return (
            <MigrationStepRow
              key={stepState.step}
              step={formatStepLabel(stepState.step)}
              description={getStepDescription(
                stepState.step,
                status,
                activeStep,
                failedStep,
                error,
              )}
              needsAttention={stepState.needsAttention}
              isCompleted={stepState.isCompleted}
              isActive={stepState.isActive}
              isFailed={stepState.isFailed}
              isLast={index === migrationStepStates.length - 1}
              connectorAboveColor={connectorAbove}
            />
          )
        })}
      </YStack>
    </YStack>
  )
}
