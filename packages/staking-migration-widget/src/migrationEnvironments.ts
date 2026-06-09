import type { Address } from 'viem'

export const stakingMigrationCapabilities = {
  environments: ['production', 'staging', 'development'] as const,
  chains: [122],
  events: ['migration-success', 'migration-error'],
} as const

export const MIGRATION_OPERATOR_ADDRESS: Address = '0xE3441bA0863AEFBf28eca5F6fAAFb4A2B608F3A1'

export interface ResolvedStakingMigrationConfig {
  migrationApiBaseUrl?: string
  migrationOperator: Address
  migrationApiToken?: string
}

export interface ResolveMigrationConfigInput {
  migrationApiBaseUrl?: string
  migrationApiToken?: string
}

export function resolveMigrationConfig(
  input: ResolveMigrationConfigInput = {},
): ResolvedStakingMigrationConfig {
  return {
    migrationApiBaseUrl: input.migrationApiBaseUrl,
    migrationOperator: MIGRATION_OPERATOR_ADDRESS,
    migrationApiToken: input.migrationApiToken,
  }
}
