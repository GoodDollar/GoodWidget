import React, { useCallback, useMemo } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import { Card, Text, ToastContainer, YStack } from '@goodwidget/ui'
import { MigrationProgressTimeline } from './MigrationProgressTimeline'
import { MigrationSummaryCard } from './MigrationSummaryCard'
import { useStakingMigrationAdapter } from './adapter'
import type { StakingMigrationWidgetProps } from './widgetRuntimeContract'

type StakingMigrationInnerProps = Pick<
  StakingMigrationWidgetProps,
  | 'migrationApiBaseUrl'
  | 'adapterFactory'
  | 'onMigrationSuccess'
  | 'onMigrationError'
>

function formatJourneyLabel(label: string | null): string | null {
  if (!label) return null
  return label
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function StakingMigrationInner({
  migrationApiBaseUrl,
  adapterFactory,
  onMigrationSuccess,
  onMigrationError,
}: StakingMigrationInnerProps) {
  const defaultAdapter = useStakingMigrationAdapter({
    migrationApiBaseUrl,
    onMigrationSuccess,
    onMigrationError,
  })

  const activeAdapter = useMemo(
    () =>
      adapterFactory
        ? adapterFactory({
            migrationApiBaseUrl,
          })
        : defaultAdapter,
    [adapterFactory, defaultAdapter, migrationApiBaseUrl],
  )

  const { state, actions } = activeAdapter
  const isZeroBalance = state.stakedAmountRaw <= 0n
  const isPrimaryPending =
    state.isBalanceLoading ||
    state.status === 'approval-pending' ||
    state.status === 'migrating'

  const handlePrimaryAction = useCallback(async () => {
    switch (state.primaryAction) {
      case 'connect':
        await actions.connect()
        break
      case 'switch_chain':
        await actions.switchToFuse()
        break
      case 'migrate':
        await actions.approveAndMigrate()
        break
      case 'retry':
        await actions.retryMigration()
        break
      case 'refresh':
        await actions.refresh()
        break
      default:
        break
    }
  }, [actions, state.primaryAction])

  const summaryAction = useMemo(
    () => ({
      label: state.primaryLabel,
      disabled: state.primaryAction === 'none' || isPrimaryPending,
      pending: isPrimaryPending,
      onPress:
        state.primaryAction === 'none' || isPrimaryPending
          ? undefined
          : () => {
              void handlePrimaryAction()
            },
    }),
    [handlePrimaryAction, isPrimaryPending, state.primaryAction, state.primaryLabel],
  )

  const summaryStatusMessage = useMemo(() => {
    if (state.status === 'migrating') {
      return state.activeStep
        ? `${formatJourneyLabel(state.activeStep)} is in progress.`
        : 'Migration is in progress.'
    }

    return undefined
  }, [state.activeStep, state.status])

  return (
    <YStack gap="$4" padding="$4">
      <MigrationSummaryCard
        stakedAmount={state.stakedAmount}
        statusMessage={summaryStatusMessage}
        action={summaryAction}
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

          {state.status === 'missing-config' && (
            <Text secondary>
              <Text color="$warning">Missing migration configuration:</Text> Provide a migration API base
              URL before enabling migration.
            </Text>
          )}
        </YStack>
      </Card>
    </YStack>
  )
}

export function StakingMigrationWidget({
  provider,
  config,
  defaultTheme = 'light',
  themeOverrides,
  migrationApiBaseUrl,
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
        migrationApiBaseUrl={migrationApiBaseUrl}
        onMigrationSuccess={onMigrationSuccess}
        onMigrationError={onMigrationError}
        adapterFactory={adapterFactory}
      />
      <ToastContainer />
    </GoodWidgetProvider>
  )
}
