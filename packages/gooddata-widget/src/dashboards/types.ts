import type { ComponentType } from 'react'

/**
 * A DashboardDefinition is what gets registered with the widget: a stable
 * subpath, a label for the dashboard selector, and the React component that
 * renders it. Adding a new dashboard means registering one of these — no new
 * app, no copy-pasted host.
 */
export interface DashboardDefinition {
  id: string
  path: string
  label: string
  component: ComponentType
}
