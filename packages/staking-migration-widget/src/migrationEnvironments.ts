import type { Address } from 'viem'

export type StakingMigrationWidgetEnvironment = 'production' | 'staging' | 'development'

export const stakingMigrationCapabilities = {
  environments: ['production', 'staging', 'development'] as const,
  chains: [122],
  events: ['migration-success', 'migration-error'],
} as const

export const MIGRATION_OPERATOR_ADDRESS: Address = '0xE3441bA0863AEFBf28eca5F6fAAFb4A2B608F3A1'

interface MigrationEnvironmentPreset {
  migrationApiBaseUrl: string
}

const MIGRATION_ENVIRONMENT_PRESETS: Record<
  StakingMigrationWidgetEnvironment,
  MigrationEnvironmentPreset
> = {
  development: {
    migrationApiBaseUrl: 'http://localhost:8787',
  },
  staging: {
    migrationApiBaseUrl: 'https://monitoringworker-staging.gooddollar.workers.dev',
  },
  production: {
    migrationApiBaseUrl: 'https://monitoringworker.gooddollar.workers.dev',
  },
}

export interface ResolvedStakingMigrationConfig {
  migrationApiBaseUrl: string
  migrationOperator: Address
  migrationApiToken?: string
}

export function resolveMigrationConfigForEnvironment(
  environment: StakingMigrationWidgetEnvironment,
  migrationApiToken?: string,
): ResolvedStakingMigrationConfig {
  const preset = MIGRATION_ENVIRONMENT_PRESETS[environment]
  return {
    migrationApiBaseUrl: preset.migrationApiBaseUrl,
    migrationOperator: MIGRATION_OPERATOR_ADDRESS,
    migrationApiToken,
  }
}

export function normalizeStakingMigrationEnvironment(
  environment?: StakingMigrationWidgetEnvironment,
): StakingMigrationWidgetEnvironment {
  if (environment && stakingMigrationCapabilities.environments.includes(environment)) {
    return environment
  }
  return 'production'
}
