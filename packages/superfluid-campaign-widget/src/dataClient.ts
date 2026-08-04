import type { CampaignLeaderboardAdapter } from './hooks/useCampaignLeaderboard'
import type { ProgramSupTotalsAdapter } from './hooks/useProgramSupTotals'

/**
 * The single runtime boundary used by the shared widget implementation.
 * Production deliberately has no override functions, so its hooks always use
 * their live endpoints. The mocked entry point must provide every active source.
 */
export type SuperfluidCampaignDataClient =
  | ProductionSuperfluidCampaignDataClient
  | MockSuperfluidCampaignDataClient

export interface ProductionSuperfluidCampaignDataClient {
  kind: 'production'
}

export interface MockSuperfluidCampaignDataClient {
  kind: 'mock'
  leaderboard: CampaignLeaderboardAdapter
  programSupTotals: ProgramSupTotalsAdapter
}

export const PRODUCTION_SUPERFLUID_CAMPAIGN_DATA_CLIENT: ProductionSuperfluidCampaignDataClient = {
  kind: 'production',
}
