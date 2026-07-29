import { createMiniAppElement } from '@goodwidget/embed'
import { SuperfluidCampaignWidget } from './SuperfluidCampaignWidget'
import type React from 'react'

/**
 * A Custom Element class wrapping the SuperfluidCampaignWidget React component.
 *
 * Register it with any tag name:
 *   customElements.define('gw-superfluid-campaign', SuperfluidCampaignWidgetElement)
 *
 * Then use in HTML:
 *   <gw-superfluid-campaign></gw-superfluid-campaign>
 *
 * Set the wallet provider via JS properties:
 *   const el = document.querySelector('gw-superfluid-campaign')
 *   el.provider = window.ethereum
 */
export const SuperfluidCampaignWidgetElement = createMiniAppElement(
  SuperfluidCampaignWidget as React.ComponentType<Record<string, unknown>>,
  {
    shadow: true,
    defaultTheme: 'dark',
    events: [],
  },
)
