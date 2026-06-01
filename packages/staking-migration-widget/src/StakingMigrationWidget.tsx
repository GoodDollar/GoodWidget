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

  const journeyAction = useMemo(() => {
    if (state.isBalanceLoading) {
      return {
        label: 'Loading...',
        disabled: true,
        showWarningIcon: false,
        onPress: undefined,
      }
    }

    if (!state.hasRequiredConfig || state.status === 'missing-config') {
      return {
        label: 'Setup required',
        disabled: true,
        showWarningIcon: false,
        onPress: undefined,
      }
    }

    if (isZeroBalance) {
      return {
        label: 'No balance',
        disabled: true,
        showWarningIcon: false,
        onPress: undefined,
      }
    }

    if (!state.address) {
      return {
        label: 'Connect wallet',
        disabled: false,
        showWarningIcon: false,
        onPress: () => {
          void actions.connect()
        },
      }
    }

    if (state.status === 'wrong-network') {
      return {
        label: 'Switch to Fuse',
        disabled: false,
        showWarningIcon: true,
        onPress: () => {
          void actions.switchToFuse()
        },
      }
    }

    if (state.status === 'approval-pending') {
      return {
        label: 'Approval pending',
        disabled: true,
        showWarningIcon: false,
        onPress: undefined,
      }
    }

    if (state.status === 'migrating') {
      return {
        label: 'Migrating',
        disabled: true,
        showWarningIcon: false,
        onPress: undefined,
      }
    }

    if (state.status === 'success') {
      return {
        label: 'Refresh balance',
        disabled: false,
        showWarningIcon: false,
        onPress: () => {
          void actions.refresh()
        },
      }
    }

    if (state.status === 'approval-failed') {
      return {
        label: 'Retry approval',
        disabled: false,
        showWarningIcon: true,
        onPress: () => {
          void actions.retryMigration()
        },
      }
    }

    if (state.status === 'error') {
      return {
        label: 'Retry migration',
        disabled: false,
        showWarningIcon: false,
        onPress: () => {
          void actions.retryMigration()
        },
      }
    }

    return {
      label: 'Approve & Migrate',
      disabled: false,
      showWarningIcon: false,
      onPress: () => {
        void actions.approveAndMigrate()
      },
    }
  }, [
    actions,
    isZeroBalance,
    state.address,
    state.hasRequiredConfig,
    state.isBalanceLoading,
    state.status,
  ])

  const summaryStatusMessage = useMemo(() => {
    if (state.status === 'migrating') {
      return state.activeStep
        ? `${formatJourneyLabel(state.activeStep)} is in progress.`
        : 'Migration is in progress.'
    }

    return undefined
  }, [state.activeStep, state.status])

  const shouldShowStatusNotice =
    state.status === 'missing-config'

  return (
    <YStack gap="$4" padding="$4">
      <MigrationSummaryCard
        stakedAmount={state.stakedAmount}
        statusMessage={summaryStatusMessage}
        actionLabel={journeyAction.label}
        actionDisabled={journeyAction.disabled}
        onPrimaryAction={journeyAction.onPress}
        showWarningIcon={journeyAction.showWarningIcon}
      />

      <Card>
        <YStack gap="$4">
          <MigrationProgressTimeline
            status={state.status}
            completedSteps={state.completedSteps}
            activeStep={state.activeStep}
            failedStep={state.failedStep}
            error={state.error}
            hasAvailableBalance={!isZeroBalance}
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
