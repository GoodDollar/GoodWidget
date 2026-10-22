import { createMiniAppElement } from '@goodwidget/embed'
import { BridgingWidget } from './BridgingWidget'
import type React from 'react'

export const BridgingWidgetElement = createMiniAppElement(
  BridgingWidget as React.ComponentType<Record<string, unknown>>,
  { shadow: true, defaultTheme: 'dark', events: [] },
)
