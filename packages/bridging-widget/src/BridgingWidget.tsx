import React from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import { ToastContainer } from '@goodwidget/ui'
import { useBridgingAdapter } from './adapter'
import { BridgingWidgetView } from './components/BridgingWidgetView'
import type {
  BridgingWidgetAdapterResult,
  BridgingWidgetProps,
  BridgingWidgetTab,
} from './widgetRuntimeContract'

function BridgingWidgetRuntime() {
  const adapter = useBridgingAdapter()

  return <BridgingWidgetView adapter={adapter} />
}

export interface BridgingWidgetPreviewProps
  extends Pick<BridgingWidgetProps, 'themeOverrides' | 'config' | 'defaultTheme'> {
  adapter: BridgingWidgetAdapterResult
  initialTab?: BridgingWidgetTab
}

// Deterministic render path for Storybook/test fixtures that provide a fixed adapter.
export function BridgingWidgetPreview({
  adapter,
  initialTab,
  themeOverrides,
  config,
  defaultTheme = 'dark',
}: BridgingWidgetPreviewProps) {
  return (
    <GoodWidgetProvider
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
      addressOverride={adapter.state.address}
      chainIdOverride={adapter.state.walletChainId}
    >
      <BridgingWidgetView adapter={adapter} initialTab={initialTab} />
      <ToastContainer />
    </GoodWidgetProvider>
  )
}

export function BridgingWidget({
  provider,
  themeOverrides,
  config,
  defaultTheme = 'dark',
}: BridgingWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <BridgingWidgetRuntime />
      <ToastContainer />
    </GoodWidgetProvider>
  )
}
