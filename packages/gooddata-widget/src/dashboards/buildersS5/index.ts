import { registerConnectorFactory } from '../../connectors/registry'
import { registerDashboard } from '../registry'
import { BUILDERS_S5_CONNECTOR_ID, createBuildersS5Connector, type BuildersS5ConnectorConfig } from './connector'
import { BuildersS5Dashboard } from './BuildersS5Dashboard'

export type BuildersS5DashboardConfig = BuildersS5ConnectorConfig

let isRegistered = false

/**
 * Registers the builders season 5 connector factory and dashboard definition. Idempotent, like
 * registerAiCreditsDashboard, so the host app can call it unconditionally at startup.
 */
export function registerBuildersS5Dashboard(config: BuildersS5DashboardConfig = {}): void {
  if (isRegistered) return
  isRegistered = true
  registerConnectorFactory(BUILDERS_S5_CONNECTOR_ID, createBuildersS5Connector, config)
  registerDashboard({
    id: 'builders-s5',
    path: 'builders-s5',
    label: 'Builders Season 5',
    component: BuildersS5Dashboard,
  })
}

export { BuildersS5Dashboard, BuildersS5DashboardView } from './BuildersS5Dashboard'
export type { BuildersS5DashboardProps, BuildersS5DashboardViewProps } from './BuildersS5Dashboard'
export type { BuildersS5LoadState } from './useBuildersS5Data'
export type { BuildersReport, BuildersS5Data, TeamReport } from './connector'
