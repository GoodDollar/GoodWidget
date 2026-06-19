import React from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import { MiniAppShell, YStack } from '@goodwidget/ui'
import {
  StakingMigrationWidget,
  derivePrimaryAction,
  derivePrimaryLabel,
  type MigrationStep,
  type StakingMigrationWidgetAdapterFactory,
  type StakingMigrationWidgetState,
  type StakingMigrationWidgetStatus,
} from '@goodwidget/staking-migration-widget'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'

function createMockState(
  status: StakingMigrationWidgetStatus,
  overrides: {
    stakedAmount?: string
    stakedAmountRaw?: bigint
    completedSteps?: MigrationStep[]
    activeStep?: MigrationStep | null
    failedStep?: MigrationStep | null
    error?: string | null
    hasRequiredConfig?: boolean
    isWrongNetwork?: boolean
  } = {},
): StakingMigrationWidgetState {
  const stakedAmountRaw = overrides.stakedAmountRaw ?? 250000n
  const state: StakingMigrationWidgetState = {
    status,
    address: '0x329377cbeeF39f01b0Ea04B80465c9eB47D3ED1',
    chainId: 122,
    stakedAmount: overrides.stakedAmount ?? '2500',
    stakedAmountRaw,
    stakedTokenSymbol: 'sG$',
    hasRequiredConfig: overrides.hasRequiredConfig ?? true,
    isWrongNetwork: overrides.isWrongNetwork ?? false,
    isBalanceLoading: false,
    completedSteps: overrides.completedSteps ?? [],
    activeStep: overrides.activeStep ?? null,
    failedStep: overrides.failedStep ?? null,
    approvalTxHash: '0xapprovalhash',
    migrationId: 'migration-1',
    error: overrides.error ?? null,
    primaryAction: 'none',
    primaryLabel: '',
  }
  const primaryAction = derivePrimaryAction(state)
  return {
    ...state,
    primaryAction,
    primaryLabel: derivePrimaryLabel(state, primaryAction),
  }
}

function createAdapterFactory(
  status: StakingMigrationWidgetStatus,
  overrides: Parameters<typeof createMockState>[1] = {},
): StakingMigrationWidgetAdapterFactory {
  return () => ({
    state: createMockState(status, overrides),
    actions: {
      connect: async () => {},
      switchToFuse: async () => {},
      refresh: async () => {},
      approveAndMigrate: async () => {},
      retryMigration: async () => {},
    },
  })
}

function MockStoryShell({
  adapterFactory,
  dataTestId,
}: {
  adapterFactory: StakingMigrationWidgetAdapterFactory
  dataTestId: string
}) {
  try {
    const provider = createCustodialEip1193Provider()
    return (
      <YStack data-testid={dataTestId} style={{ width: 420 }}>
        <StakingMigrationWidget provider={provider} adapterFactory={adapterFactory} />
      </YStack>
    )
  } catch (error: unknown) {
    return (
      <YStack data-testid="StakingMigrationWidget-custodial-config-error" style={{ width: 420 }}>
        <strong>Custodial fixture not configured</strong>
        <span>
          {error instanceof Error ? error.message : 'Set a local private key in custodialEip1193.ts'}
        </span>
      </YStack>
    )
  }
}

export function InjectedWalletStory() {
  const injectedProvider = getInjectedEip1193Provider()
  const migrationApiBaseUrl = import.meta.env.VITE_MIGRATION_API_BASE_URL

  if (!isInjectedProviderUsable(injectedProvider)) {
    return (
      <YStack data-testid="StakingMigrationWidget-no-wallet" style={{ width: 420 }} gap="$3">
        <strong>No injected wallet found</strong>
        <span>
          Install or enable MetaMask (or another EIP-1193 wallet) in this browser, then refresh
          Storybook.
        </span>
      </YStack>
    )
  }

  return (
    <YStack data-testid="StakingMigrationWidget-injected-wallet" style={{ width: 420 }}>
      <StakingMigrationWidget
        provider={injectedProvider}
        migrationApiBaseUrl={migrationApiBaseUrl}
      />
      {!migrationApiBaseUrl && (
        <YStack marginTop="$3">
          <span>
            Set `VITE_MIGRATION_API_BASE_URL` in `examples/storybook/.env.local` to enable the
            migration backend.
          </span>
        </YStack>
      )}
    </YStack>
  )
}

export function EmptyBalanceStory() {
  return (
    <MockStoryShell
      dataTestId="StakingMigrationWidget-empty-balance"
      adapterFactory={createAdapterFactory('summary', {
        stakedAmount: '0',
        stakedAmountRaw: 0n,
      })}
    />
  )
}

export function ReadyStory() {
  return (
    <MockStoryShell
      dataTestId="StakingMigrationWidget-ready"
      adapterFactory={createAdapterFactory('summary')}
    />
  )
}

export function WrongNetworkStory() {
  return (
    <MockStoryShell
      dataTestId="StakingMigrationWidget-wrong-network"
      adapterFactory={createAdapterFactory('wrong-network', {
        isWrongNetwork: true,
      })}
    />
  )
}

export function ApprovalPendingStory() {
  return (
    <MockStoryShell
      dataTestId="StakingMigrationWidget-approval-pending"
      adapterFactory={createAdapterFactory('approval-pending')}
    />
  )
}

export function MigratingStory() {
  return (
    <MockStoryShell
      dataTestId="StakingMigrationWidget-migrating"
      adapterFactory={createAdapterFactory('migrating', {
        completedSteps: ['unstake', 'bridge sent'],
        activeStep: 'bridge received',
      })}
    />
  )
}

export function SuccessStory() {
  return (
    <MockStoryShell
      dataTestId="StakingMigrationWidget-success"
      adapterFactory={createAdapterFactory('success', {
        completedSteps: ['unstake', 'bridge sent', 'bridge received', 'stake'],
      })}
    />
  )
}

export function ErrorStateStory() {
  return (
    <MockStoryShell
      dataTestId="StakingMigrationWidget-error-state"
      adapterFactory={createAdapterFactory('error', {
        completedSteps: ['unstake', 'bridge sent'],
        activeStep: 'bridge received',
        failedStep: 'bridge received',
        error: 'Bridge finalization timeout',
      })}
    />
  )
}

export function LightThemeReadyStory() {
  return (
    <GoodWidgetProvider defaultTheme="light">
      <MiniAppShell title="StakingMigrationWidget">
        <YStack data-testid="StakingMigrationWidget-light-ready" style={{ width: 420 }}>
          <StakingMigrationWidget
            adapterFactory={createAdapterFactory('summary')}
            defaultTheme="light"
          />
        </YStack>
      </MiniAppShell>
    </GoodWidgetProvider>
  )
}
