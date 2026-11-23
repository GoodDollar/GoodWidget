import { createMiniAppElement } from '@goodwidget/embed'
import { ConnectAWalletWidget } from './ConnectAWalletWidget'
import type React from 'react'

/**
 * A Custom Element class wrapping the ConnectAWalletWidget React component.
 *
 * Register it with any tag name:
 *   customElements.define('gw-connect-a-wallet', ConnectAWalletWidgetElement)
 *
 * Then use in HTML:
 *   <gw-connect-a-wallet></gw-connect-a-wallet>
 *
 * Set the wallet provider and theme overrides via JS properties:
 *   const el = document.querySelector('gw-connect-a-wallet')
 *   el.provider = window.ethereum
 *   el.themeOverrides = { tokens: { color: { primary: '#00AFFE' } } }
 */
export const ConnectAWalletWidgetElement = createMiniAppElement(
  ConnectAWalletWidget as React.ComponentType<Record<string, unknown>>,
  {
    shadow: true,
    defaultTheme: 'dark',
    events: ['link-success', 'link-error', 'unlink-success'],
  },
)
