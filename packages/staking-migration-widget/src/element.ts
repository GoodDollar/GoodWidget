import { createMiniAppElement } from '@goodwidget/embed'
import { StakingMigrationWidget } from './StakingMigrationWidget'
import type React from 'react'

// This custom element wraps the staking migration widget for HTML integrators.
export const StakingMigrationWidgetElement = createMiniAppElement(
  StakingMigrationWidget as React.ComponentType<Record<string, unknown>>,
  {
    shadow: true,
    defaultTheme: 'dark',
    events: ['migration-success', 'migration-error'],
  },
)
