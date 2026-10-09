import { registerConnectorFactory } from '../../connectors/registry'
import { registerDashboard } from '../registry'
import { AI_CREDITS_CONNECTOR_ID, createAiCreditsConnector, type AiCreditsConnectorConfig } from './connector'
import { AiCreditsDashboard } from './AiCreditsDashboard'

export type AiCreditsDashboardConfig = AiCreditsConnectorConfig

let isRegistered = false

/**
 * Registers the AI Credits connector factory and dashboard definition.
 * Idempotent — later calls are no-ops, so the host app can call this
 * unconditionally at startup without guarding it itself. Registering the
 * factory does not construct the connector; that only happens the first
 * time the dashboard actually fetches data (see connectors/registry.ts).
 */
export function registerAiCreditsDashboard(config: AiCreditsDashboardConfig = {}): void {
  if (isRegistered) return
  isRegistered = true
  registerConnectorFactory(AI_CREDITS_CONNECTOR_ID, createAiCreditsConnector, config)
  registerDashboard({
    id: 'ai-credits',
    path: 'ai-credits',
    label: 'AI Credits',
    component: AiCreditsDashboard,
  })
}

export { AiCreditsDashboard } from './AiCreditsDashboard'
export type { AiCreditsDashboardProps } from './AiCreditsDashboard'
export type { AiCreditsDashboardMockState } from './mockState'
export type { AnalyticsResponse, DailyAnalyticsRecord, GlobalAnalyticsSummary, LastRunSummary } from './connector'
export type { AnalyticsDataSource } from './useAiCreditsDashboardData'
