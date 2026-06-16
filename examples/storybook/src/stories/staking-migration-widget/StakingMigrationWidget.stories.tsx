import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { GoodWidgetProvider } from '@goodwidget/core'
import { MiniAppShell } from '@goodwidget/ui'
import { YStack } from '@goodwidget/ui'
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

function StoryShell({ adapterFactory }: { adapterFactory: StakingMigrationWidgetAdapterFactory }) {
  try {
    const provider = createCustodialEip1193Provider()
    return (
      <YStack style={{ width: 420 }}>
        <StakingMigrationWidget provider={provider} adapterFactory={adapterFactory} />
      </YStack>
    )
  } catch (error: unknown) {
    return (
      <YStack style={{ width: 420 }}>
        {error instanceof Error ? error.message : 'Custodial fixture not configured'}
      </YStack>
    )
  }
}

const meta: Meta<typeof StakingMigrationWidget> = {
  title: 'Widgets/StakingMigrationWidget',
  component: StakingMigrationWidget,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

export const EmptyBalance: Story = {
  render: () => (
    <StoryShell
      adapterFactory={createAdapterFactory('summary', {
        stakedAmount: '0',
        stakedAmountRaw: 0n,
      })}
    />
  ),
}

export const Ready: Story = {
  render: () => <StoryShell adapterFactory={createAdapterFactory('summary')} />,
}

export const WrongNetwork: Story = {
  render: () => (
    <StoryShell
      adapterFactory={createAdapterFactory('wrong-network', {
        isWrongNetwork: true,
      })}
    />
  ),
}

export const ApprovalPending: Story = {
  render: () => <StoryShell adapterFactory={createAdapterFactory('approval-pending')} />,
}

export const Migrating: Story = {
  render: () => (
    <StoryShell
      adapterFactory={createAdapterFactory('migrating', {
        completedSteps: ['unstake', 'bridge sent'],
        activeStep: 'bridge received',
      })}
    />
  ),
}

export const Success: Story = {
  render: () => (
    <StoryShell
      adapterFactory={createAdapterFactory('success', {
        completedSteps: ['unstake', 'bridge sent', 'bridge received', 'stake'],
      })}
    />
  ),
}

export const Error: Story = {
  render: () => (
    <StoryShell
      adapterFactory={createAdapterFactory('error', {
        completedSteps: ['unstake', 'bridge sent'],
        activeStep: 'bridge received',
        failedStep: 'bridge received',
        error: 'Bridge finalization timeout',
      })}
    />
  ),
}

export const LightDemo: Story = {
  parameters: {
    goodWidgetProvider: {
      useShell: false,
    },
  },
  render: () => (
    <GoodWidgetProvider defaultTheme="light">
      <MiniAppShell title="StakingMigrationWidget">
        <YStack style={{ width: 420 }}>
          <StakingMigrationWidget
            provider={createCustodialEip1193Provider()}
            adapterFactory={createAdapterFactory('summary')}
            defaultTheme="light"
          />
        </YStack>
      </MiniAppShell>
    </GoodWidgetProvider>
  ),
}
