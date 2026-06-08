export { StakingMigrationWidget } from './StakingMigrationWidget'
export { useStakingMigrationAdapter } from './adapter'
export type { UseStakingMigrationAdapterOptions } from './adapter'

export type {
  MigrationStep,
  StakingMigrationErrorDetail,
  StakingMigrationSuccessDetail,
  StakingMigrationWidgetAdapterFactory,
  StakingMigrationWidgetAdapterFactoryInput,
  StakingMigrationWidgetAdapterResult,
  StakingMigrationWidgetActions,
  StakingMigrationWidgetEnvironment,
  StakingMigrationWidgetProps,
  StakingMigrationWidgetState,
  StakingMigrationWidgetStatus,
  StakingMigrationPrimaryAction,
} from './widgetRuntimeContract'

export {
  FUSE_CHAIN_ID,
  FUSE_STAKING_CONTRACT_ADDRESS,
} from './widgetRuntimeContract'

export {
  MIGRATION_OPERATOR_ADDRESS,
  normalizeStakingMigrationEnvironment,
  resolveMigrationConfigForEnvironment,
  stakingMigrationCapabilities,
} from './migrationEnvironments'

export type { ResolvedStakingMigrationConfig } from './migrationEnvironments'
