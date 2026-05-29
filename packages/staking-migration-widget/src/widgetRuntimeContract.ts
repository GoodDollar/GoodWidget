import type { Address } from 'viem'
import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/ui'

// This is the expected network for Fuse staking approvals.
export const FUSE_CHAIN_ID = 122

// This address is sourced from GoodProtocol releases/deployment.json -> production.FuseStaking.
export const FUSE_STAKING_CONTRACT_ADDRESS: Address = '0xA199F0C353E25AdF022378B0c208D600f39a6505'

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
}

export interface StakingMigrationWidgetActions {
  connect: () => Promise<void>
  switchToFuse: () => Promise<void>
  refresh: () => Promise<void>
  approveAndMigrate: () => Promise<void>
  retryApproval: () => Promise<void>
  retryMigration: () => Promise<void>
}

export interface StakingMigrationWidgetAdapterResult {
  state: StakingMigrationWidgetState
  actions: StakingMigrationWidgetActions
}

export interface StakingMigrationWidgetAdapterFactoryInput {
  config: StakingMigrationWidgetConfig
}

export type StakingMigrationWidgetAdapterFactory = (
  input: StakingMigrationWidgetAdapterFactoryInput,
) => StakingMigrationWidgetAdapterResult

export interface StakingMigrationWidgetConfig {
  migrationApiBaseUrl?: string
  migrationOperator?: Address
  migrationApiToken?: string
}

export interface StakingMigrationWidgetProps {
  provider?: unknown
  config?: GoodWidgetConfig
  defaultTheme?: 'light' | 'dark'
  themeOverrides?: GoodWidgetThemeOverrides
  migrationConfig?: StakingMigrationWidgetConfig
  onMigrationSuccess?: (detail: StakingMigrationSuccessDetail) => void
  onMigrationError?: (detail: StakingMigrationErrorDetail) => void
  adapterFactory?: StakingMigrationWidgetAdapterFactory
}
