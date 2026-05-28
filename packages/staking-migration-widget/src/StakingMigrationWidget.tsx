import React, { useMemo } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import { ToastContainer, YStack } from '@goodwidget/ui'
import { MigrationProgressTimeline } from './MigrationProgressTimeline'
import { MigrationStatusNotice } from './MigrationStatusNotice'
import { MigrationSummaryCard } from './MigrationSummaryCard'
import { useStakingMigrationAdapter } from './adapter'
import type {
  StakingMigrationWidgetAdapterFactory,
  StakingMigrationWidgetProps,
} from './widgetRuntimeContract'

interface StakingMigrationInnerProps {
  migrationConfig: StakingMigrationWidgetProps['migrationConfig']
  adapterFactory?: StakingMigrationWidgetAdapterFactory
  onMigrationSuccess?: StakingMigrationWidgetProps['onMigrationSuccess']
  onMigrationError?: StakingMigrationWidgetProps['onMigrationError']
}

// This inner component renders all migration states while staying inside provider context.
function StakingMigrationInner({
  migrationConfig,
  adapterFactory,
  onMigrationSuccess,
  onMigrationError,
}: StakingMigrationInnerProps) {
  const defaultAdapter = useStakingMigrationAdapter({
    migrationConfig,
    onMigrationSuccess,
    onMigrationError,
  })

  const activeAdapter = useMemo(
    () =>
      adapterFactory
        ? adapterFactory({
            config: migrationConfig ?? {},
          })
        : defaultAdapter,
    [adapterFactory, defaultAdapter, migrationConfig],
  )

  const { state, actions } = activeAdapter
  const isZeroBalance = state.stakedAmountRaw <= 0n
  const isApprovalPending = state.status === 'approval-pending'

  const isSummaryActionDisabled =
    isApprovalPending ||
    !state.hasRequiredConfig ||
    state.isWrongNetwork ||
    state.isBalanceLoading ||
    isZeroBalance

  return (
    <YStack gap="$4" padding="$4">
      {state.status === 'missing-config' && (
        <MigrationStatusNotice
          status="warning"
          title="Missing migration configuration"
          message="Provide migrationApiBaseUrl and migrationOperator in migrationConfig before enabling migration."
        />
      )}

      {state.status === 'wrong-network' && (
        <MigrationStatusNotice
          status="warning"
          title="Wrong network"
          message="Switch wallet network to Fuse to approve migration."
          actionLabel="Refresh"
          onAction={() => void actions.refresh()}
        />
      )}

      {state.status === 'approval-failed' && (
        <MigrationStatusNotice
          status="error"
          title="Approval failed"
          message={state.error ?? 'Approval was rejected or failed. Retry to continue migration.'}
          actionLabel="Retry approval"
          onAction={() => void actions.retryApproval()}
        />
      )}

      {(state.status === 'migrating' || state.status === 'error' || state.status === 'success') && (
        <MigrationProgressTimeline completedSteps={state.completedSteps} activeStep={state.activeStep} />
      )}

      {state.status === 'error' && (
        <MigrationStatusNotice
          status="error"
          title="Migration failed"
          message={
            state.failedStep
              ? `Failed at ${state.failedStep}: ${state.error ?? 'Unknown backend error'}`
              : state.error ?? 'Unknown backend error'
          }
          actionLabel="Retry migration"
          onAction={() => void actions.retryMigration()}
        />
      )}

      {state.status === 'success' && (
        <MigrationStatusNotice
          status="success"
          title="Migration complete"
          message="Your staked position has been migrated to Celo savings."
          actionLabel="Refresh balance"
          onAction={() => void actions.refresh()}
        />
      )}

      <MigrationSummaryCard
        stakedAmount={state.stakedAmount}
        isZeroBalance={isZeroBalance}
        isApprovalPending={isApprovalPending}
        isDisabled={isSummaryActionDisabled}
        actionLabel={state.address ? 'Approve and migrate' : 'Connect wallet'}
        onPrimaryAction={() => {
          if (!state.address) {
            void actions.connect()
            return
          }
          void actions.approveAndMigrate()
        }}
      />
    </YStack>
  )
}

// This is the public React widget entrypoint with provider-first mounting.
export function StakingMigrationWidget({
  provider,
  config,
  defaultTheme = 'light',
  themeOverrides,
  migrationConfig,
  onMigrationSuccess,
  onMigrationError,
  adapterFactory,
}: StakingMigrationWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
      config={config}
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    >
      <StakingMigrationInner
        migrationConfig={migrationConfig}
        onMigrationSuccess={onMigrationSuccess}
        onMigrationError={onMigrationError}
        adapterFactory={adapterFactory}
      />
      <ToastContainer />
    </GoodWidgetProvider>
  )
}
