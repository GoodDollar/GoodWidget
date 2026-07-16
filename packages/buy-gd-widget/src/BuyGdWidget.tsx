import React, { useEffect, useMemo, useRef } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import { DAppProvider } from '@usedapp/core'
import { Spinner, Text, YStack } from '@goodwidget/ui'
import { BuyGdView } from './BuyGdView'
import type { BuyGdWidgetProps } from './widgetRuntimeContract'

const LazyLiveBuyGdWidgetInner = React.lazy(() =>
  import('./LiveBuyGdWidgetInner').then((module) => ({ default: module.LiveBuyGdWidgetInner })),
)

function createOnramperUrl({
  onramperApiKey,
  onramperThemeMode,
  onramperOnlyCryptos,
  onramperDefaultCrypto,
  onramperDefaultFiat,
}: Pick<
  BuyGdWidgetProps,
  | 'onramperApiKey'
  | 'onramperThemeMode'
  | 'onramperOnlyCryptos'
  | 'onramperDefaultCrypto'
  | 'onramperDefaultFiat'
>): string {
  const params = new URLSearchParams()
  if (onramperApiKey) params.set('apiKey', onramperApiKey)
  params.set('themeName', onramperThemeMode ?? 'dark')
  params.set('defaultCrypto', onramperDefaultCrypto ?? 'cUSD')
  params.set('defaultFiat', onramperDefaultFiat ?? 'USD')
  if (onramperOnlyCryptos) params.set('onlyCryptos', onramperOnlyCryptos)
  return `https://buy.onramper.com?${params.toString()}`
}

function BuyGdWidgetInner({
  onBuySuccess,
  onBuyError,
  adapterFactory,
  onramperUrl,
  pollIntervalMs,
}: Pick<BuyGdWidgetProps, 'onBuySuccess' | 'onBuyError' | 'adapterFactory'> & {
  onramperUrl: string
  pollIntervalMs: number
}) {
  const adapter = useMemo(() => {
    if (!adapterFactory) return null
    return adapterFactory({ onramperUrl, pollIntervalMs })
  }, [adapterFactory, onramperUrl, pollIntervalMs])

  const onBuySuccessRef = useRef(onBuySuccess)
  const onBuyErrorRef = useRef(onBuyError)

  useEffect(() => {
    onBuySuccessRef.current = onBuySuccess
  }, [onBuySuccess])

  useEffect(() => {
    onBuyErrorRef.current = onBuyError
  }, [onBuyError])

  useEffect(() => {
    if (!adapter) return
    if (adapter.state.status === 'success') {
      onBuySuccessRef.current?.({
        address: adapter.state.address,
        chainId: adapter.state.chainId,
        transactionHash: adapter.state.txHash,
      })
      return
    }

    if (adapter.state.status === 'error' && adapter.state.error) {
      onBuyErrorRef.current?.({
        address: adapter.state.address,
        chainId: adapter.state.chainId,
        message: adapter.state.error,
      })
    }
  }, [adapter])

  if (adapter) {
    return <BuyGdView adapter={adapter} onramperUrl={onramperUrl} />
  }

  return (
    <React.Suspense
      fallback={
        <YStack data-testid="BuyGdWidget-loading-live-adapter" alignItems="center" gap="$2">
          <Spinner />
          <Text secondary>Loading buy adapter…</Text>
        </YStack>
      }
    >
      <LazyLiveBuyGdWidgetInner onramperUrl={onramperUrl} pollIntervalMs={pollIntervalMs} />
    </React.Suspense>
  )
}

export function BuyGdWidget({
  provider,
  config,
  themeOverrides,
  defaultTheme = 'dark',
  onramperApiKey,
  onramperThemeMode,
  onramperOnlyCryptos,
  onramperDefaultCrypto,
  onramperDefaultFiat,
  pollIntervalMs = 5000,
  adapterFactory,
  onBuySuccess,
  onBuyError,
}: BuyGdWidgetProps) {
  const onramperUrl = useMemo(
    () =>
      createOnramperUrl({
        onramperApiKey,
        onramperThemeMode,
        onramperOnlyCryptos,
        onramperDefaultCrypto,
        onramperDefaultFiat,
      }),
    [
      onramperApiKey,
      onramperThemeMode,
      onramperOnlyCryptos,
      onramperDefaultCrypto,
      onramperDefaultFiat,
    ],
  )

  const dappConfig = useMemo(
    () => ({
      readOnlyChainId: 42220,
      readOnlyUrls: {
        42220: 'https://forno.celo.org',
      },
    }),
    [],
  )

  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <DAppProvider config={dappConfig}>
        <YStack width="100%" padding="$4">
          <BuyGdWidgetInner
            onBuySuccess={onBuySuccess}
            onBuyError={onBuyError}
            adapterFactory={adapterFactory}
            onramperUrl={onramperUrl}
            pollIntervalMs={pollIntervalMs}
          />
        </YStack>
      </DAppProvider>
    </GoodWidgetProvider>
  )
}
