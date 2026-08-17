import { createMiniAppElement } from '@goodwidget/embed'
import { SuperfluidCampaignWidget } from './SuperfluidCampaignWidget'
import type React from 'react'
import type { SuperfluidCampaignWidgetProps } from './widgetRuntimeContract'

/**
 * A Custom Element class wrapping the SuperfluidCampaignWidget React component.
 *
 * Register it with any tag name:
 *   customElements.define('gw-superfluid-campaign', SuperfluidCampaignWidgetElement)
 *
 * Then use in HTML:
 *   <gw-superfluid-campaign></gw-superfluid-campaign>
 *
 * Set the wallet provider and widget-specific integration props via JS properties:
 *   const el = document.querySelector('gw-superfluid-campaign')
 *   el.provider = window.ethereum
 *   el.initialView = 'leaderboard'
 *   el.poolAddresses = { 606: '0xYourPoolAddress' }
 *   el.themeOverrides = { tokens: { color: { primary: '#00AFFE' } } }
 */
const SuperfluidCampaignWidgetElementBase = createMiniAppElement(
  SuperfluidCampaignWidget as React.ComponentType<Record<string, unknown>>,
  {
    shadow: true,
    defaultTheme: 'dark',
    props: {
      actionLinks: 'property',
      citizenClaimEnvironment: 'property',
      citizenClaimExecution: 'property',
      disableClaim: 'property',
      connectOverride: 'property',
      contentMaxWidth: 'property',
      data: 'property',
      disconnectOverride: 'property',
      environment: 'property',
      initialView: 'property',
      poolAddresses: 'property',
    },
    events: [],
  },
)

export class SuperfluidCampaignWidgetElement extends SuperfluidCampaignWidgetElementBase {
  declare actionLinks: SuperfluidCampaignWidgetProps['actionLinks']
  declare citizenClaimEnvironment: SuperfluidCampaignWidgetProps['citizenClaimEnvironment']
  declare citizenClaimExecution: SuperfluidCampaignWidgetProps['citizenClaimExecution']
  declare disableClaim: SuperfluidCampaignWidgetProps['disableClaim']
  declare connectOverride: SuperfluidCampaignWidgetProps['connectOverride']
  declare contentMaxWidth: SuperfluidCampaignWidgetProps['contentMaxWidth']
  declare data: SuperfluidCampaignWidgetProps['data']
  declare disconnectOverride: SuperfluidCampaignWidgetProps['disconnectOverride']
  declare environment: SuperfluidCampaignWidgetProps['environment']
  declare initialView: SuperfluidCampaignWidgetProps['initialView']
  declare poolAddresses: SuperfluidCampaignWidgetProps['poolAddresses']
}
