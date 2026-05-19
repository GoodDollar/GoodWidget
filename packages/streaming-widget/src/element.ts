import { createMiniAppElement } from '@goodwidget/embed'
import { StreamingWidget } from './StreamingWidget'
import type React from 'react'

/**
 * A Custom Element class wrapping the StreamingWidget React component.
 *
 * Register it with any tag name:
 *   customElements.define('gw-streaming', StreamingWidgetElement)
 *
 * Then use in HTML:
 *   <gw-streaming></gw-streaming>
 *
 * Set the wallet provider via JS properties:
 *   const el = document.querySelector('gw-streaming')
 *   el.provider = window.ethereum
 */
export const StreamingWidgetElement = createMiniAppElement(
  StreamingWidget as React.ComponentType<Record<string, unknown>>,
  {
    shadow: true,
    defaultTheme: 'light',
    events: [],
  },
)
