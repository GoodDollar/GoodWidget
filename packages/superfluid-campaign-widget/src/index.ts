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

// Mock dataset
export { DEFAULT_CAMPAIGN_MOCK_DATA, CONNECTED_CAMPAIGN_MOCK_DATA } from './mockData'

// Widget component
export { SuperfluidCampaignWidget } from './SuperfluidCampaignWidget'
