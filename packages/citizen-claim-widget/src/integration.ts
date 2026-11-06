export const citizenClaimIntegration = {
  id: 'citizen-claim',
  sdk: '@goodsdks/citizen-sdk',
  capabilitySource: 'citizenSdkCapabilities',
  uses: [
    'whitelistStatus',
    'claimStatus',
    'claimEntitlement',
    'genericClaimEntitlement',
    'dailyStats',
    'startVerification',
    'claim',
  ],
  chains: [122, 42220, 50],
  states: [
    'loading',
    'connecting',
    'not_connected',
    'not_whitelisted',
    'eligible',
    'already_claimed',
    'claiming',
    'success',
    'error',
  ],
  events: [
    'claim-success',
    'claim-error',
    'next-task-shown',
    'next-task-clicked',
    'next-task-dismissed',
  ],
} as const

export type CitizenClaimIntegration = typeof citizenClaimIntegration
