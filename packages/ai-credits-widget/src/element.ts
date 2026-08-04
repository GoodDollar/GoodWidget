import { createMiniAppElement } from '@goodwidget/embed'
import { AiCreditsWidget } from './AiCreditsWidget'
import type React from 'react'

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
