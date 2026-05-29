import React, { useMemo } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import { Card, ToastContainer, YStack } from '@goodwidget/ui'
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

  const shouldShowStatusNotice =
    state.status === 'missing-config' ||
    state.status === 'wrong-network' ||
    state.status === 'approval-failed' ||
    state.status === 'error' ||
    state.status === 'success'

  return (
    <YStack gap="$4" padding="$4">
      <Card>
        <YStack gap="$4" padding="$4">
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

          <MigrationProgressTimeline
            status={state.status}
            completedSteps={state.completedSteps}
            activeStep={state.activeStep}
            failedStep={state.failedStep}
          />

          {shouldShowStatusNotice && (
            <MigrationStatusNotice
              status={
                state.status === 'success' ? 'success' : state.status === 'error' || state.status === 'approval-failed' ? 'error' : 'warning'
              }
              title={
                state.status === 'missing-config'
                  ? 'Missing migration configuration'
                  : state.status === 'wrong-network'
                    ? 'Wrong network'
                    : state.status === 'approval-failed'
                      ? 'Approval failed'
                      : state.status === 'success'
                        ? 'Migration complete'
                        : 'Migration failed'
              }
              message={
                state.status === 'missing-config'
                  ? 'Provide migrationApiBaseUrl and migrationOperator in migrationConfig before enabling migration.'
                  : state.status === 'wrong-network'
                    ? 'Switch wallet network to Fuse to approve migration.'
                    : state.status === 'approval-failed'
                      ? state.error ?? 'Approval was rejected or failed. Retry to continue migration.'
                      : state.status === 'success'
                        ? 'Your staked position has been migrated to Celo savings.'
                        : state.failedStep
                          ? `Failed at ${state.failedStep}: ${state.error ?? 'Unknown backend error'}`
                          : state.error ?? 'Unknown backend error'
              }
              actionLabel={
                state.status === 'wrong-network'
                  ? 'Refresh'
                  : state.status === 'approval-failed'
                    ? 'Retry approval'
                    : state.status === 'error'
                      ? 'Retry migration'
                      : state.status === 'success'
                        ? 'Refresh balance'
                        : undefined
              }
              onAction={
                state.status === 'wrong-network'
                  ? () => void actions.refresh()
                  : state.status === 'approval-failed'
                    ? () => void actions.retryApproval()
                    : state.status === 'error'
                      ? () => void actions.retryMigration()
                      : state.status === 'success'
                        ? () => void actions.refresh()
                        : undefined
              }
            />
          )}
        </YStack>
      </Card>
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
