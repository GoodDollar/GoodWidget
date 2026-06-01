import React from 'react'
import { Heading, Text, YStack } from '@goodwidget/ui'
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

function formatStepLabel(step: string): string {
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

  const statusColor =
    status === 'success'
      ? '$success'
      : status === 'error' || status === 'approval-failed'
        ? '$error'
        : status === 'wrong-network' || status === 'missing-config'
          ? '$warning'
          : '$primary'

  return (
    <YStack gap="$3">
      <YStack gap="$2">
        <Text variant="caption" color={statusColor} fontWeight="700">
          {statusLabel}
        </Text>
        <Heading level={4}>Migration journey</Heading>
        <Text secondary>{timelineDescription}</Text>
      </YStack>

      <YStack gap="$2">
        <MigrationStepRow
          step="Approve on Fuse"
          description={getApproveDescription(status, error)}
          isCompleted={approvalCompleted}
          isActive={approvalActive}
          isFailed={approvalFailed}
          isFirst
        />
        {STEP_ORDER.map((step, index) => (
          <MigrationStepRow
            key={step}
            step={formatStepLabel(step)}
            description={getStepDescription(step, status, activeStep, failedStep, error)}
            isCompleted={completedSteps.includes(step)}
            isActive={activeStep === step}
            isFailed={failedStep === step}
            isLast={index === STEP_ORDER.length - 1}
          />
        ))}
      </YStack>
    </YStack>
  )
}
