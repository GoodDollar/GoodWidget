import React from 'react'
import { Button, ButtonText, Heading, Text, YStack } from '@goodwidget/ui'
import { MigrationStepRow } from './MigrationStepRow'
import type { MigrationStep, StakingMigrationWidgetStatus } from './widgetRuntimeContract'

const STEP_ORDER: MigrationStep[] = ['unstake', 'bridge sent', 'bridge received', 'stake']

interface MigrationProgressTimelineProps {
  status: StakingMigrationWidgetStatus
  completedSteps: MigrationStep[]
  activeStep: MigrationStep | null
  failedStep: MigrationStep | null
  error: string | null
  hasAvailableBalance: boolean
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
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
  actionLabel,
  onAction,
  actionDisabled,
}: MigrationProgressTimelineProps) {
  const approvalCompleted = status === 'migrating' || status === 'success' || status === 'error'
  const approvalActive =
    ((status === 'summary' || status === 'wrong-network') && hasAvailableBalance) ||
    status === 'approval-pending' ||
    status === 'approval-failed'
  const approvalFailed = status === 'approval-failed'
  const approveNeedsAttention = status === 'wrong-network' || status === 'approval-failed'
  const showFooterAction = Boolean(actionLabel && onAction) && status === 'success'

  const statusColor =
    status === 'success'
      ? '$success'
      : status === 'error' || status === 'approval-failed'
        ? '$error'
        : status === 'wrong-network' || status === 'missing-config'
          ? '$warning'
          : '$primary'

  const statusLabel = getStepStatusLabel(status)

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
          actionLabel={approvalActive || approvalFailed ? actionLabel : undefined}
          onAction={approvalActive || approvalFailed ? onAction : undefined}
          actionDisabled={actionDisabled}
          needsAttention={approveNeedsAttention}
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
            actionLabel={failedStep === step ? actionLabel : undefined}
            onAction={failedStep === step ? onAction : undefined}
            actionDisabled={actionDisabled}
            needsAttention={failedStep === step}
            isCompleted={completedSteps.includes(step)}
            isActive={activeStep === step}
            isFailed={failedStep === step}
            isLast={index === STEP_ORDER.length - 1}
          />
        ))}
      </YStack>

      {showFooterAction && (
        <Button
          variant="ghost"
          onPress={onAction}
          disabled={actionDisabled}
          fullWidth
          size="md"
          borderRadius="$3"
          backgroundColor="$warning"
          hoverStyle={{ backgroundColor: '$warning', opacity: 0.92 }}
          pressStyle={{ backgroundColor: '$warning', opacity: 0.86 }}
        >
          <ButtonText color="$background" fontWeight="700">
            {actionLabel}
          </ButtonText>
        </Button>
      )}
    </YStack>
  )
}
