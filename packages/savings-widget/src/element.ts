import { createMiniAppElement } from '@goodwidget/embed'
import { SavingsWidget } from './SavingsWidget'

/**
 * A Custom Element class wrapping the SavingsWidget React component.
 *
 * Register it with any tag name:
 *   customElements.define('gw-savings', SavingsWidgetElement)
 *
 * Then use in HTML:
 *   <gw-savings></gw-savings>
 *
 * Set the wallet provider and theme overrides via JS properties:
 *   const el = document.querySelector('gw-savings')
 *   el.provider = window.ethereum
 *   el.themeOverrides = { tokens: { color: { primary: '#7B61FF' } } }
 */
export const SavingsWidgetElement = createMiniAppElement(
  SavingsWidget as React.ComponentType<Record<string, unknown>>,
  {
    shadow: true,
    defaultTheme: 'light',
    events: ['stake-success', 'unstake-success', 'claim-success', 'savings-error'],
  },
)
