import React from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import { GoodWidgetDialog, ToastContainer } from '@goodwidget/ui'
import { usePasskeyLoginAdapter, type PasskeyLoginAdapterResult } from './adapter.ts'
import { passkeyLoginWidgetConfig } from './config.ts'
import { PasskeyLoginWidgetView } from './components/PasskeyLoginWidgetView.tsx'
import type { PasskeyLoginWidgetProps } from './widgetRuntimeContract.ts'

/** Runs the flow and renders it; must sit inside the provider. */
function PasskeyLoginWidgetRuntime({
  'data-testid': dataTestId,
  ...adapterProps
}: Omit<PasskeyLoginWidgetProps, 'themeOverrides' | 'config' | 'defaultTheme'>) {
  const adapter = usePasskeyLoginAdapter(adapterProps)
  return <PasskeyLoginWidgetView adapter={adapter} data-testid={dataTestId} />
}

/** Widget-local component themes first, so a host `config` can still override them. */
function useMergedConfig(hostConfig: PasskeyLoginWidgetProps['config']) {
  return React.useMemo(
    () => ({ ...hostConfig, themes: { ...passkeyLoginWidgetConfig.themes, ...hostConfig?.themes } }),
    [hostConfig],
  )
}

export interface PasskeyLoginWidgetPreviewProps
  extends Pick<PasskeyLoginWidgetProps, 'themeOverrides' | 'config' | 'defaultTheme'> {
  adapter: PasskeyLoginAdapterResult
  'data-testid'?: string
}

/** Deterministic render path for Storybook / test fixtures that provide a fixed adapter result. */
export function PasskeyLoginWidgetPreview({
  adapter,
  themeOverrides,
  config,
  defaultTheme = 'dark',
  'data-testid': dataTestId,
}: PasskeyLoginWidgetPreviewProps) {
  const mergedConfig = useMergedConfig(config)
  return (
    <GoodWidgetProvider config={mergedConfig} themeOverrides={themeOverrides} defaultTheme={defaultTheme}>
      <PasskeyLoginWidgetView adapter={adapter} data-testid={dataTestId} />
      <ToastContainer />
      <GoodWidgetDialog />
    </GoodWidgetProvider>
  )
}

export function PasskeyLoginWidget({
  themeOverrides,
  config,
  defaultTheme = 'dark',
  ...runtimeProps
}: PasskeyLoginWidgetProps) {
  const mergedConfig = useMergedConfig(config)
  return (
    <GoodWidgetProvider config={mergedConfig} themeOverrides={themeOverrides} defaultTheme={defaultTheme}>
      <PasskeyLoginWidgetRuntime {...runtimeProps} />
      <ToastContainer />
      <GoodWidgetDialog />
    </GoodWidgetProvider>
  )
}
