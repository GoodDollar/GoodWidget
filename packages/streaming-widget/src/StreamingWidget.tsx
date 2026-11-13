import React from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import { ToastContainer } from '@goodwidget/ui'
import { version } from '../package.json'
import { WidgetVersion } from '@goodwidget/ui'
import { useStreamingAdapter } from './adapter'
import { StreamingWidgetView } from './components/StreamingWidgetView'
import type {
  StreamingWidgetAdapterResult,
  StreamingWidgetProps,
  StreamingWidgetTab,
} from './widgetRuntimeContract'

interface StreamingWidgetRuntimeProps {
  environment: StreamingWidgetProps['environment']
  apiKey?: string
  hideHeader?: boolean
}

function StreamingWidgetRuntime({ environment, apiKey, hideHeader }: StreamingWidgetRuntimeProps) {
  const adapter = useStreamingAdapter({ environment, apiKey })

  return <StreamingWidgetView adapter={adapter} hideHeader={hideHeader} />
}

export interface StreamingWidgetPreviewProps extends Pick<
  StreamingWidgetProps,
  'themeOverrides' | 'config' | 'defaultTheme' | 'hideHeader'
> {
  adapter: StreamingWidgetAdapterResult
  initialTab?: StreamingWidgetTab
  initialStreamsFormOpen?: boolean
}

// Deterministic render path for Storybook/test fixtures that provide a fixed adapter.
export function StreamingWidgetPreview({
  adapter,
  initialTab,
  initialStreamsFormOpen,
  hideHeader,
  themeOverrides,
  config,
  defaultTheme = 'dark',
}: StreamingWidgetPreviewProps) {
  return (
    <GoodWidgetProvider config={config} themeOverrides={themeOverrides} defaultTheme={defaultTheme}>
      <StreamingWidgetView
        adapter={adapter}
        initialTab={initialTab}
        initialStreamsFormOpen={initialStreamsFormOpen}
        hideHeader={hideHeader}
      />
      <ToastContainer />
      <WidgetVersion name="Streaming" version={version} />
    </GoodWidgetProvider>
  )
}

export function StreamingWidget({
  provider,
  addressOverride,
  chainIdOverride,
  connectOverride,
  switchChainOverride,
  availableChainIdsOverride,
  hideHeader = false,
  environment = 'production',
  themeOverrides,
  config,
  defaultTheme = 'dark',
  apiKey,
}: StreamingWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
      addressOverride={addressOverride}
      chainIdOverride={chainIdOverride}
      connectOverride={connectOverride}
      switchChainOverride={switchChainOverride}
      availableChainIdsOverride={availableChainIdsOverride}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <StreamingWidgetRuntime environment={environment} apiKey={apiKey} hideHeader={hideHeader} />
      <ToastContainer />
      <WidgetVersion name="Streaming" version={version} />
    </GoodWidgetProvider>
  )
}
