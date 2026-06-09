export { stakingMigrationIntegration } from './integration'
export type { StakingMigrationIntegration } from './integration'

export { StakingMigrationWidget } from './StakingMigrationWidget'
export {
  derivePrimaryAction,
  derivePrimaryLabel,
  useStakingMigrationAdapter,
} from './adapter'
export type { UseStakingMigrationAdapterOptions } from './adapter'

export type {
  MigrationStep,
  StakingMigrationErrorDetail,
  StakingMigrationSuccessDetail,
  StakingMigrationWidgetAdapterFactory,
  StakingMigrationWidgetAdapterFactoryInput,
  StakingMigrationWidgetAdapterResult,
  StakingMigrationWidgetActions,
  StakingMigrationWidgetProps,
  StakingMigrationWidgetState,
  StakingMigrationWidgetStatus,
  StakingMigrationPrimaryAction,
} from './widgetRuntimeContract'

export {
  FUSE_CHAIN_ID,
  FUSE_STAKING_CONTRACT_ADDRESS,
} from './widgetRuntimeContract'
