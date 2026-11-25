export { GoodDataWidget } from './GoodDataWidget'
export type { GoodDataWidgetProps } from './GoodDataWidget'

export type { DataConnector, DataConnectorFactory } from './connectors/types'
export { registerConnectorFactory, getConnector, isConnectorRegistered, listRegisteredConnectorIds } from './connectors/registry'

export type { DashboardDefinition } from './dashboards/types'
export { registerDashboard, getDashboard, listDashboards } from './dashboards/registry'

export { registerBuildersS5Dashboard, BuildersS5Dashboard, BuildersS5DashboardView } from './dashboards/buildersS5'
export type {
  BuildersS5DashboardConfig,
  BuildersS5DashboardProps,
  BuildersS5DashboardViewProps,
  BuildersS5LoadState,
  BuildersReport,
  BuildersS5Data,
  TeamReport,
} from './dashboards/buildersS5'

export { registerAiCreditsDashboard, AiCreditsDashboard } from './dashboards/aiCredits'
export type {
  AiCreditsDashboardConfig,
  AiCreditsDashboardProps,
  AiCreditsDashboardMockState,
  AnalyticsResponse,
  DailyAnalyticsRecord,
  GlobalAnalyticsSummary,
  LastRunSummary,
  AnalyticsDataSource,
} from './dashboards/aiCredits'
