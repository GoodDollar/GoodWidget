import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
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

function MockStoryShell({ adapterFactory }: { adapterFactory: StakingMigrationWidgetAdapterFactory }) {
  try {
    const provider = createCustodialEip1193Provider()
    return (
      <YStack data-testid="StakingMigrationWidget-mock" style={{ width: 420 }}>
        <StakingMigrationWidget provider={provider} adapterFactory={adapterFactory} />
      </YStack>
    )
  } catch (error: unknown) {
    return (
      <YStack style={{ width: 420 }}>
        {error instanceof globalThis.Error ? error.message : 'Custodial fixture not configured'}
      </YStack>
    )
  }
}

function InjectedWalletStory() {
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

const meta: Meta<typeof StakingMigrationWidget> = {
  title: 'Widgets/StakingMigrationWidget',
  component: StakingMigrationWidget,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

export const InjectedWallet: Story = {
  parameters: {
    goodWidgetProvider: {
      useShell: false,
    },
  },
  render: () => <InjectedWalletStory />,
}

export const EmptyBalance: Story = {
  render: () => (
    <MockStoryShell
      adapterFactory={createAdapterFactory('summary', {
        stakedAmount: '0',
        stakedAmountRaw: 0n,
      })}
    />
  ),
}

export const Ready: Story = {
  render: () => <MockStoryShell adapterFactory={createAdapterFactory('summary')} />,
}

export const WrongNetwork: Story = {
  render: () => (
    <MockStoryShell
      adapterFactory={createAdapterFactory('wrong-network', {
        isWrongNetwork: true,
      })}
    />
  ),
}

export const ApprovalPending: Story = {
  render: () => <MockStoryShell adapterFactory={createAdapterFactory('approval-pending')} />,
}

export const Migrating: Story = {
  render: () => (
    <MockStoryShell
      adapterFactory={createAdapterFactory('migrating', {
        completedSteps: ['unstake', 'bridge sent'],
        activeStep: 'bridge received',
      })}
    />
  ),
}

export const Success: Story = {
  render: () => (
    <MockStoryShell
      adapterFactory={createAdapterFactory('success', {
        completedSteps: ['unstake', 'bridge sent', 'bridge received', 'stake'],
      })}
    />
  ),
}

export const ErrorState: Story = {
  render: () => (
    <MockStoryShell
      adapterFactory={createAdapterFactory('error', {
        completedSteps: ['unstake', 'bridge sent'],
        activeStep: 'bridge received',
        failedStep: 'bridge received',
        error: 'Bridge finalization timeout',
      })}
    />
  ),
}

export const LightThemeReady: Story = {
  parameters: {
    goodWidgetProvider: {
      useShell: false,
    },
  },
  render: () => (
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
  ),
}
