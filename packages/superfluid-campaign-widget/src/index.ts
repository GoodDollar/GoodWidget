// Runtime contract types
export type {
  ActivityType,
  ActivityIconColorVariant,
  ActivityIconSpec,
  CampaignActionCtaKind,
  CampaignActionMockData,
  CampaignMockData,
  CampaignPoolId,
  CampaignPoolMockData,
  FaqItemMockData,
  LeaderboardEntryMockData,
  LeaderboardMockData,
  SuperfluidCampaignView,
  SuperfluidCampaignWidgetEnvironment,
  SuperfluidCampaignWidgetProps,
} from './widgetRuntimeContract'
export { ACTIVITY_ICON_MAP } from './widgetRuntimeContract'

// Airdrop status adapter DI seam (Storybook/Playwright fixtures)
export type { AirdropStatus, AirdropStatusAdapter, AirdropStatusAdapterResult } from './hooks/useAirdropStatus'

// Campaign leaderboard adapter DI seam (Storybook/Playwright fixtures)
export type {
  CampaignLeaderboardAdapter,
  CampaignLeaderboardData,
  CampaignLeaderboardResult,
  CampaignPointsAccount,
  CampaignPointsPagination,
  CampaignPointsSummary,
} from './hooks/useCampaignLeaderboard'

// SUP program totals adapter DI seam (Storybook/Playwright fixtures)
export type { ProgramSupTotals, ProgramSupTotalsAdapter, ProgramSupTotalsResult } from './hooks/useProgramSupTotals'

// Mock dataset
export { DEFAULT_CAMPAIGN_MOCK_DATA } from './mockData'

// Widget component
export { SuperfluidCampaignWidget } from './SuperfluidCampaignWidget'
