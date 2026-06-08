import type { Address } from 'viem'

export type StakingMigrationWidgetEnvironment = 'production' | 'staging' | 'development'

export const stakingMigrationCapabilities = {
  environments: ['production', 'staging', 'development'] as const,
  chains: [122],
  events: ['migration-success', 'migration-error'],
} as const

export const MIGRATION_OPERATOR_ADDRESS: Address = '0xE3441bA0863AEFBf28eca5F6fAAFb4A2B608F3A1'

const MIGRATION_API_BASE_URLS: Record<StakingMigrationWidgetEnvironment, string> = {
  development: 'http://localhost:8787',
  staging: 'https://monitoringworker-staging.gooddollar.workers.dev',
  production: 'https://monitoringworker.gooddollar.workers.dev',
}

const MIGRATION_API_TOKENS: Record<StakingMigrationWidgetEnvironment, string | undefined> = {
  development: 'migration-test-token',
  staging: undefined,
  production: undefined,
}

export interface ResolvedStakingMigrationConfig {
  migrationApiBaseUrl: string
  migrationOperator: Address
  migrationApiToken?: string
}

export function resolveMigrationConfigForEnvironment(
  environment: StakingMigrationWidgetEnvironment,
): ResolvedStakingMigrationConfig {
  return {
    migrationApiBaseUrl: MIGRATION_API_BASE_URLS[environment],
    migrationOperator: MIGRATION_OPERATOR_ADDRESS,
    migrationApiToken: MIGRATION_API_TOKENS[environment],
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
