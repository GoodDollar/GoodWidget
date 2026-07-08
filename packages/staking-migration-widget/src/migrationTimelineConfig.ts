import type { StepperStepItem } from '@goodwidget/ui'
import type { MigrationStep, StakingMigrationWidgetStatus } from './widgetRuntimeContract'

export const MIGRATION_STEP_ORDER: MigrationStep[] = ['unstake', 'bridge sent', 'bridge received', 'stake']

const STEP_LABELS: Partial<Record<MigrationStep, string>> = {
  'bridge sent': 'Bridge to Celo',
  stake: 'Stake on Celo',
}

const STEP_DESCRIPTIONS: Record<MigrationStep, string> = {
  unstake: 'Release the staked position on Fuse.',
  'bridge sent': 'Send the migrated assets from Fuse.',
  'bridge received': 'Finalize the bridge transfer on Celo.',
  stake: 'Deposit the migrated assets into Celo savings.',
}

const APPROVE_CONFIRMED = 'Approval confirmed on Fuse.'

const APPROVE_DESCRIPTION: Partial<Record<StakingMigrationWidgetStatus, string>> = {
  'wrong-network': 'Switch to the Fuse network to approve the migration.',
  'approval-pending': 'Confirm the approval transaction in your wallet.',
  summary: 'Approve the migration from your Fuse wallet.',
}

export const STATUS_HEADER: Partial<
  Record<StakingMigrationWidgetStatus, { label: string; color: string }>
> = {
  success: { label: 'Completed', color: '$success' },
  error: { label: 'Failed', color: '$error' },
  'approval-failed': { label: 'Failed', color: '$error' },
  'missing-config': { label: 'Configuration required', color: '$warning' },
}

type StepContext = {
  isCompleted: boolean
  isActive: boolean
  isFailed: boolean
  needsAttention: boolean
}

export function formatStepLabel(step: MigrationStep): string {
  return (
    STEP_LABELS[step] ??
    step
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  )
}

export function resolveStepStatus({
  isCompleted,
  isActive,
  isFailed,
  needsAttention,
}: StepContext): StepperStepItem['status'] {
  if (isCompleted) return 'completed'
  if (isFailed) return 'failed'
  if (isActive && needsAttention) return 'attention'
  if (isActive) return 'active'
  return 'pending'
}

export function getApproveDescription(
  status: StakingMigrationWidgetStatus,
  error: string | null,
): string {
  if (status === 'approval-failed') {
    return error ?? 'Approval did not complete. Retry to continue.'
  }
  if (status === 'migrating' || status === 'success' || status === 'error') {
    return APPROVE_CONFIRMED
  }
  return APPROVE_DESCRIPTION[status] ?? 'Approve the migration from your Fuse wallet.'
}

export function getStepDescription(
  step: MigrationStep,
  status: StakingMigrationWidgetStatus,
  activeStep: MigrationStep | null,
  failedStep: MigrationStep | null,
  error: string | null,
): string {
  if (failedStep === step) {
    return error ?? 'This step failed. Retry the migration to continue.'
  }
  if (activeStep === step) return 'Currently in progress.'
  if (status === 'success' || status === 'error' || status === 'migrating') {
    return STEP_DESCRIPTIONS[step]
  }
  return 'Pending'
}

export function buildTimelineStep(
  id: string,
  title: string,
  description: string,
  context: StepContext,
): StepperStepItem {
  return { id, title, description, status: resolveStepStatus(context) }
}
