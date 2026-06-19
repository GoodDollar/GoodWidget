import React from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import { ToastContainer } from '@goodwidget/ui'
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
}

function StreamingWidgetRuntime({ environment, apiKey }: StreamingWidgetRuntimeProps) {
  const adapter = useStreamingAdapter({ environment, apiKey })

  return <StreamingWidgetView adapter={adapter} />
}

export interface StreamingWidgetPreviewProps
  extends Pick<StreamingWidgetProps, 'themeOverrides' | 'config' | 'defaultTheme'> {
  adapter: StreamingWidgetAdapterResult
  initialTab?: StreamingWidgetTab
  initialStreamsFormOpen?: boolean
}

// Deterministic render path for Storybook/test fixtures that provide a fixed adapter.
export function StreamingWidgetPreview({
  adapter,
  initialTab,
  initialStreamsFormOpen,
  themeOverrides,
  config,
  defaultTheme = 'light',
}: StreamingWidgetPreviewProps) {
  return (
    <GoodWidgetProvider
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <StreamingWidgetView
        adapter={adapter}
        initialTab={initialTab}
        initialStreamsFormOpen={initialStreamsFormOpen}
      />
      <ToastContainer />
    </GoodWidgetProvider>
  )
}

export function StreamingWidget({
  provider,
  environment = 'production',
  themeOverrides,
  config,
  defaultTheme = 'light',
  apiKey,
}: StreamingWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <StreamingWidgetRuntime environment={environment} apiKey={apiKey} />
      <ToastContainer />
    </GoodWidgetProvider>
  )
}
