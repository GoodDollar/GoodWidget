import { createMiniAppElement } from '@goodwidget/embed'
import { ClaimWidget } from './ClaimWidget'

/**
 * A Custom Element class wrapping the ClaimWidget React component.
 *
 * Register it with any tag name:
 *   customElements.define('gw-claim', ClaimWidgetElement)
 *
 * Then use in HTML:
 *   <gw-claim></gw-claim>
 *
 * Set the wallet provider and theme overrides via JS properties:
 *   const el = document.querySelector('gw-claim')
 *   el.provider = window.ethereum
 *   el.themeOverrides = { tokens: { color: { primary: '#E91E63' } } }
 */
export const ClaimWidgetElement = createMiniAppElement(
  ClaimWidget as React.ComponentType<Record<string, unknown>>,
  {
    shadow: true,
    defaultTheme: 'light',
    events: ['claim-success', 'claim-error'],
  },
)
