// Runtime contract types
export type {
  ActivityType,
  ActivityIconColorVariant,
  ActivityIconSpec,
  CampaignActionLinkOverrides,
  CampaignActionCtaKind,
  CampaignActionDefinition,
  CampaignDefinition,
  CampaignPoolId,
  CampaignPoolAddresses,
  CampaignPoolDefinition,
  FaqItemDefinition,
  LeaderboardEntry,
  SuperfluidCampaignView,
  SuperfluidCampaignWidgetEnvironment,
  SuperfluidCampaignWidgetProps,
} from './widgetRuntimeContract'
export { ACTIVITY_ICON_MAP } from './widgetRuntimeContract'

export type { AirdropStatus, AirdropStatusAdapterResult } from './hooks/useAirdropStatus'

// Live campaign leaderboard response types
export type {
  CampaignLeaderboardData,
  CampaignLeaderboardResult,
  CampaignPointsAccount,
  CampaignPointsPagination,
  CampaignPointsSummary,
} from './hooks/useCampaignLeaderboard'

// Live SUP program response types
export type { ProgramSupTotals, ProgramSupTotalsResult } from './hooks/useProgramSupTotals'

// Stable campaign definition
export { DEFAULT_CAMPAIGN_DEFINITION } from './campaignDefinition'

// Widget component
export { SuperfluidCampaignWidget } from './SuperfluidCampaignWidget'
