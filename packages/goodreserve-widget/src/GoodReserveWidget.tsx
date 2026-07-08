import React, { useEffect, useMemo, useRef } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import { mergeThemeOverrides } from '@goodwidget/ui'
import type { EIP1193Provider } from '@goodwidget/core'
import { ReserveSwapView } from './ReserveSwapView'
import { useGoodReserveAdapter } from './useGoodReserveAdapter'
import type { ReserveSwapWidgetProps } from './widgetRuntimeContract'
import { goodReserveWidgetConfig } from './config'

function GoodReserveWidgetInner({
  onSwapSuccess,
  onSwapError,
  mockState,
  preferredChainId,
}: Pick<
  ReserveSwapWidgetProps,
  'onSwapSuccess' | 'onSwapError' | 'mockState' | 'preferredChainId'
>) {
  const adapter = useGoodReserveAdapter(mockState)
  const { status, txHash, error, address, chainId } = adapter.state

  // Hold the host callbacks in refs so inline arrow functions (a new reference
  // each parent render) do not re-run the lifecycle effect and re-fire the
  // callbacks on an unchanged swap_success / swap_error state.
  const onSwapSuccessRef = useRef(onSwapSuccess)
  const onSwapErrorRef = useRef(onSwapError)
  useEffect(() => {
    onSwapSuccessRef.current = onSwapSuccess
  }, [onSwapSuccess])
  useEffect(() => {
    onSwapErrorRef.current = onSwapError
  }, [onSwapError])

  // Emits swap lifecycle callbacks for host integrations, keyed only on the
  // discrete lifecycle fields so it fires once per real status transition.
  useEffect(() => {
    if (status === 'swap_success' && txHash) {
      onSwapSuccessRef.current?.({ address, chainId, transactionHash: txHash })
      return
    }

    if (status === 'swap_error' && error) {
      onSwapErrorRef.current?.({ address, chainId, message: error })
    }
  }, [status, txHash, error, address, chainId])

  return <ReserveSwapView adapter={adapter} preferredChainId={preferredChainId} />
}

/**
 * Merges the reserve-widget author defaults with any host-provided config.
 * Precedence: goodReserveWidgetConfig < host config < themeOverrides.
 * This follows the same pattern as the governance widget's GovernanceWidgetProvider.
 */
function createReserveWidgetConfig(hostConfig?: ReserveSwapWidgetProps['config']) {
  return mergeThemeOverrides(goodReserveWidgetConfig, hostConfig)
}

// Public widget entry wired to GoodWidget runtime context + theming contract.
export function GoodReserveWidget({
  provider,
  config,
  themeOverrides,
  defaultTheme = 'dark',
  onSwapSuccess,
  onSwapError,
  mockState,
  preferredChainId,
}: ReserveSwapWidgetProps) {
  // Merge the widget author config with any host config. Memoised so the
  // Tamagui config object is stable across parent renders.
  const mergedConfig = useMemo(() => createReserveWidgetConfig(config), [config])

  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
      config={mergedConfig}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <GoodReserveWidgetInner
        onSwapSuccess={onSwapSuccess}
        onSwapError={onSwapError}
        mockState={mockState}
        preferredChainId={preferredChainId}
      />
    </GoodWidgetProvider>
  )
}
