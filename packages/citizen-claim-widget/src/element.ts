import { createMiniAppElement } from '@goodwidget/embed'
import { CitizenClaimWidget } from './CitizenClaimWidget'
import type React from 'react'
import type { CitizenClaimWidgetProps } from './widgetRuntimeContract'

/**
 * A Custom Element class wrapping the CitizenClaimWidget React component.
 *
 * Register it with any tag name:
 *   customElements.define('gw-citizen-claim', CitizenClaimWidgetElement)
 *
 * Then use in HTML:
 *   <gw-citizen-claim></gw-citizen-claim>
 *
 * Set the wallet provider and theme overrides via JS properties:
 *   const el = document.querySelector('gw-citizen-claim')
 *   el.provider = window.ethereum
 *   el.themeOverrides = { tokens: { color: { primary: '#00AFFE' } } }
 */
const CitizenClaimWidgetElementBase = createMiniAppElement(
  CitizenClaimWidget as React.ComponentType<Record<string, unknown>>,
  {
    shadow: true,
    defaultTheme: 'dark',
    props: {
      chainId: 'property',
      claimExecution: 'property',
      clientFactory: 'property',
      environment: 'property',
      initialTab: 'property',
      nextTaskContent: 'property',
      nextTaskResolveNavigation: 'property',
    },
    events: [
      'claim-success',
      'claim-error',
      'next-task-shown',
      'next-task-clicked',
      'next-task-dismissed',
    ],
  },
)

export class CitizenClaimWidgetElement extends CitizenClaimWidgetElementBase {
  declare chainId: CitizenClaimWidgetProps['chainId']
  declare claimExecution: CitizenClaimWidgetProps['claimExecution']
  declare clientFactory: CitizenClaimWidgetProps['clientFactory']
  declare environment: CitizenClaimWidgetProps['environment']
  declare initialTab: CitizenClaimWidgetProps['initialTab']
  declare nextTaskContent: CitizenClaimWidgetProps['nextTaskContent']
  declare nextTaskResolveNavigation: CitizenClaimWidgetProps['nextTaskResolveNavigation']
}
