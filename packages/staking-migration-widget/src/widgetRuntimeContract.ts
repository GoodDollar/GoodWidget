import type { Address } from 'viem'
import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/ui'
import type { StakingMigrationWidgetEnvironment } from './migrationEnvironments'

export type { StakingMigrationWidgetEnvironment } from './migrationEnvironments'

export const FUSE_CHAIN_ID = 122

export const FUSE_STAKING_CONTRACT_ADDRESS: Address = '0xB7C3e738224625289C573c54d402E9Be46205546'

export type MigrationStep = 'unstake' | 'bridge sent' | 'bridge received' | 'stake'

export type StakingMigrationWidgetStatus =
  | 'summary'
  | 'approval-pending'
  | 'approval-failed'
  | 'migrating'
  | 'success'
  | 'error'
  | 'wrong-network'
  | 'missing-config'

export type StakingMigrationPrimaryAction =
  | 'connect'
  | 'switch_chain'
  | 'migrate'
  | 'retry'
  | 'refresh'
  | 'none'

export interface StakingMigrationSuccessDetail {
  address: string
  approvalTxHash: string
  migrationId: string
  completedSteps: MigrationStep[]
}

export interface StakingMigrationErrorDetail {
  address: string | null
  reason: string
  failedStep: MigrationStep | null
}

export interface StakingMigrationWidgetState {
  status: StakingMigrationWidgetStatus
  address: string | null
  chainId: number | null
  stakedAmount: string
  stakedAmountRaw: bigint
  stakedTokenSymbol: 'sG$'
  hasRequiredConfig: boolean
  isWrongNetwork: boolean
  isBalanceLoading: boolean
  completedSteps: MigrationStep[]
  activeStep: MigrationStep | null
  failedStep: MigrationStep | null
  approvalTxHash: string | null
  migrationId: string | null
  error: string | null
  primaryAction: StakingMigrationPrimaryAction
  primaryLabel: string
}

export interface StakingMigrationWidgetActions {
  connect: () => Promise<void>
  switchToFuse: () => Promise<void>
  refresh: () => Promise<void>
  approveAndMigrate: () => Promise<void>
  retryMigration: () => Promise<void>
}

export interface StakingMigrationWidgetAdapterResult {
  state: StakingMigrationWidgetState
  actions: StakingMigrationWidgetActions
}

export interface StakingMigrationWidgetAdapterFactoryInput {
  environment: StakingMigrationWidgetEnvironment
}

export type StakingMigrationWidgetAdapterFactory = (
  input: StakingMigrationWidgetAdapterFactoryInput,
) => StakingMigrationWidgetAdapterResult

export interface StakingMigrationWidgetProps {
  provider?: unknown
  config?: GoodWidgetConfig
  defaultTheme?: 'light' | 'dark'
  themeOverrides?: GoodWidgetThemeOverrides
  environment?: StakingMigrationWidgetEnvironment
  onMigrationSuccess?: (detail: StakingMigrationSuccessDetail) => void
  onMigrationError?: (detail: StakingMigrationErrorDetail) => void
  adapterFactory?: StakingMigrationWidgetAdapterFactory
}
