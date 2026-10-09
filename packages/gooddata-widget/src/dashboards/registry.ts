import type { DashboardDefinition } from './types'

const dashboardRegistry = new Map<string, DashboardDefinition>()

export function registerDashboard(dashboard: DashboardDefinition): void {
  dashboardRegistry.set(dashboard.id, dashboard)
}

export function getDashboard(id: string): DashboardDefinition | undefined {
  return dashboardRegistry.get(id)
}

export function listDashboards(): DashboardDefinition[] {
  return Array.from(dashboardRegistry.values())
}
