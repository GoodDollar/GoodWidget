export const stakingMigrationIntegration = {
  id: 'staking-migration',
  capabilitySource: 'stakingMigrationCapabilities',
  uses: ['approve', 'migrate', 'status', 'statusStream'],
  chains: [122],
  states: [
    'summary',
    'approval-pending',
    'approval-failed',
    'migrating',
    'success',
    'error',
    'wrong-network',
    'missing-config',
  ],
  events: ['migration-success', 'migration-error'],
} as const

export type StakingMigrationIntegration = typeof stakingMigrationIntegration
