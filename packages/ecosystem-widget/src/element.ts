import type React from 'react'
import { createMiniAppElement } from '@goodwidget/embed'
import { EcosystemWidget } from './EcosystemWidget'
import type { EcosystemWidgetProps } from './EcosystemWidget'

const Element = createMiniAppElement(EcosystemWidget as React.ComponentType<Record<string, unknown>>, {
  shadow: true,
  props: {
    widgets: 'property',
    defaultTheme: 'property',
    widgetProps: 'property',
    nativeMode: 'property',
    supportedChains: 'property',
    connectOverride: 'property',
    disconnectOverride: 'property',
    addressOverride: 'property',
    chainIdOverride: 'property',
    switchChainOverride: 'property',
    availableChainIdsOverride: 'property',
    disconnectLabel: 'property',
    disconnectIcon: 'property',
    contentMaxWidth: 'property',
  },
})

export class EcosystemWidgetElement extends Element {
  declare widgets: EcosystemWidgetProps['widgets']
  declare defaultTheme: EcosystemWidgetProps['defaultTheme']
  declare widgetProps: EcosystemWidgetProps['widgetProps']
  declare nativeMode: EcosystemWidgetProps['nativeMode']
  declare supportedChains: EcosystemWidgetProps['supportedChains']
  declare connectOverride: EcosystemWidgetProps['connectOverride']
  declare disconnectOverride: EcosystemWidgetProps['disconnectOverride']
  declare addressOverride: EcosystemWidgetProps['addressOverride']
  declare chainIdOverride: EcosystemWidgetProps['chainIdOverride']
  declare switchChainOverride: EcosystemWidgetProps['switchChainOverride']
  declare availableChainIdsOverride: EcosystemWidgetProps['availableChainIdsOverride']
  declare disconnectLabel: EcosystemWidgetProps['disconnectLabel']
  declare disconnectIcon: EcosystemWidgetProps['disconnectIcon']
  declare contentMaxWidth: EcosystemWidgetProps['contentMaxWidth']
}
