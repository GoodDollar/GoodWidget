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

function formatJourneyLabel(label: string | null): string | null {
  if (!label) return null
  return label
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
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

  const summaryAction = useMemo(() => {
    if (!state.address) {
      return {
        label: 'Connect wallet',
        disabled: false,
        onPress: () => {
          void actions.connect()
        },
      }
    }

    if (!state.hasRequiredConfig || state.isBalanceLoading || isZeroBalance) {
      return null
    }

    if (state.status === 'wrong-network') {
      return {
        label: 'Switch to Fuse',
        disabled: false,
        onPress: () => {
          void actions.switchToFuse()
        },
      }
    }

    if (state.status === 'approval-pending') {
      return null
    }

    if (state.status === 'migrating') {
      return null
    }

    if (state.status === 'success') {
      return {
        label: 'Refresh balance',
        disabled: false,
        onPress: () => {
          void actions.refresh()
        },
      }
    }

    if (state.status === 'error' || state.status === 'approval-failed') {
      return {
        label: 'Retry migration',
        disabled: false,
        onPress: () => {
          void actions.retryMigration()
        },
      }
    }

    return {
      label: 'Approve and Migrate',
      disabled: false,
      onPress: () => {
        void actions.approveAndMigrate()
      },
    }
  }, [actions, isZeroBalance, state.address, state.hasRequiredConfig, state.isBalanceLoading, state.status])

  const summaryStatusMessage = useMemo(() => {
    if (state.status === 'approval-pending') {
      return 'Waiting for wallet approval on Fuse.'
    }

    if (state.status === 'migrating') {
      return state.activeStep
        ? `${formatJourneyLabel(state.activeStep)} is in progress.`
        : 'Migration is in progress.'
    }

    return undefined
  }, [state.activeStep, state.status])

  const shouldShowStatusNotice =
    state.status === 'missing-config' ||
    state.status === 'wrong-network' ||
    state.status === 'approval-failed'

  return (
    <YStack gap="$4" padding="$4">
      <Card>
        <YStack gap="$4" padding="$4">
          <MigrationSummaryCard
            stakedAmount={state.stakedAmount}
            isZeroBalance={isZeroBalance}
            actionLabel={summaryAction?.label}
            actionDisabled={summaryAction?.disabled}
            statusMessage={summaryStatusMessage}
            actionHint={
              isZeroBalance && state.address
                ? 'No staked sG$ available to migrate from Fuse for this wallet.'
                : undefined
            }
            onPrimaryAction={summaryAction?.onPress}
          />

          <MigrationProgressTimeline
            status={state.status}
            completedSteps={state.completedSteps}
            activeStep={state.activeStep}
            failedStep={state.failedStep}
            error={state.error}
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
              compact={state.status === 'success' || state.status === 'error'}
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
