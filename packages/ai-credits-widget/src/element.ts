import { createMiniAppElement } from '@goodwidget/embed'
import { AiCreditsWidget } from './AiCreditsWidget'
import type React from 'react'

/**
 * A Custom Element class wrapping the AiCreditsWidget React component.
 *
 * Register it with any tag name:
 *   customElements.define('ai-credits-widget', AiCreditsWidgetElement)
 *
 * Then use in HTML:
 *   <ai-credits-widget></ai-credits-widget>
 *
 * Set the wallet provider and theme overrides via JS properties:
 *   const el = document.querySelector('ai-credits-widget')
 *   el.provider = window.ethereum
 *   el.backendUrl = 'https://api.antseed.xyz'
 *   el.fundingVaultAddress = '0xYourVaultAddress'
 *   el.themeOverrides = { tokens: { color: { primary: '#00AFFE' } } }
 */
const AiCreditsWidgetElementBase = createMiniAppElement(
  AiCreditsWidget as React.ComponentType<Record<string, unknown>>,
  {
    shadow: true,
    defaultTheme: 'dark',
    props: {
      backendUrl: 'property',
      fundingVaultAddress: 'property',
    },
    events: ['pay-success', 'pay-error'],
  },
)

export class AiCreditsWidgetElement extends AiCreditsWidgetElementBase {
  declare backendUrl: string | undefined
  declare fundingVaultAddress: string | undefined
}
