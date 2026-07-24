import React from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import { GoodWidgetDialog, ToastContainer } from '@goodwidget/ui'
import { useConnectAWalletAdapter } from './adapter'
import { ConnectAWalletWidgetView } from './components/ConnectAWalletWidgetView'
import type {
  ConnectAWalletWidgetAdapterResult,
  ConnectAWalletWidgetProps,
} from './widgetRuntimeContract'

/**
 * Thin entry point: wires the runtime adapter to the view. All visual
 * composition lives under components/, mirroring streaming-widget's
 * decomposition — a standing rule for GoodWidget packages going forward.
 */
interface ConnectAWalletWidgetRuntimeProps {
  environment: ConnectAWalletWidgetProps['environment']
  onLinkSuccess: ConnectAWalletWidgetProps['onLinkSuccess']
  onLinkError: ConnectAWalletWidgetProps['onLinkError']
  onUnlinkSuccess: ConnectAWalletWidgetProps['onUnlinkSuccess']
  'data-testid'?: string
}

function ConnectAWalletWidgetRuntime({
  environment,
  onLinkSuccess,
  onLinkError,
  onUnlinkSuccess,
  'data-testid': dataTestId,
}: ConnectAWalletWidgetRuntimeProps) {
  const adapter = useConnectAWalletAdapter({ environment, onLinkSuccess, onLinkError, onUnlinkSuccess })

  return <ConnectAWalletWidgetView adapter={adapter} data-testid={dataTestId} />
}

export interface ConnectAWalletWidgetPreviewProps
  extends Pick<ConnectAWalletWidgetProps, 'themeOverrides' | 'config' | 'defaultTheme'> {
  adapter: ConnectAWalletWidgetAdapterResult
  'data-testid'?: string
}

// Deterministic render path for Storybook/test fixtures that provide a fixed adapter.
export function ConnectAWalletWidgetPreview({
  adapter,
  themeOverrides,
  config,
  defaultTheme = 'dark',
  'data-testid': dataTestId,
}: ConnectAWalletWidgetPreviewProps) {
  return (
    <GoodWidgetProvider config={config} themeOverrides={themeOverrides} defaultTheme={defaultTheme}>
      <ConnectAWalletWidgetView adapter={adapter} data-testid={dataTestId} />
      <ToastContainer />
      <GoodWidgetDialog />
    </GoodWidgetProvider>
  )
}

export function ConnectAWalletWidget({
  provider,
  environment = 'production',
  onLinkSuccess,
  onLinkError,
  onUnlinkSuccess,
  themeOverrides,
  config,
  defaultTheme = 'dark',
  'data-testid': dataTestId,
}: ConnectAWalletWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <ConnectAWalletWidgetRuntime
        environment={environment}
        onLinkSuccess={onLinkSuccess}
        onLinkError={onLinkError}
        onUnlinkSuccess={onUnlinkSuccess}
        data-testid={dataTestId}
      />
      <ToastContainer />
      <GoodWidgetDialog />
    </GoodWidgetProvider>
  )
}
