import { createMiniAppElement } from '@goodwidget/embed'
import type React from 'react'
import { GoodReserveWidget } from './GoodReserveWidget'

// Custom element wrapper for HTML hosts embedding the reserve widget.
export const GoodReserveWidgetElement = createMiniAppElement(
  GoodReserveWidget as React.ComponentType<Record<string, unknown>>,
  {
    shadow: true,
    defaultTheme: 'dark',
    events: ['swap-success', 'swap-error'],
  },
)
