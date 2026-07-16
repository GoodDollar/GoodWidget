import { createMiniAppElement } from '@goodwidget/embed'
import { BuyGdWidget } from './BuyGdWidget'
import type React from 'react'

export const BuyGdWidgetElement = createMiniAppElement(
  BuyGdWidget as React.ComponentType<Record<string, unknown>>,
  {
    shadow: true,
    defaultTheme: 'dark',
    events: ['buy-success', 'buy-error'],
  },
)
