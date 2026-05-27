import React, { useEffect } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import { ReserveSwapView } from './ReserveSwapView'
import { useGoodReserveAdapter } from './useGoodReserveAdapter'
import type { ReserveSwapWidgetProps } from './widgetRuntimeContract'

function GoodReserveWidgetInner({
  onSwapSuccess,
  onSwapError,
  mockState,
}: Pick<ReserveSwapWidgetProps, 'onSwapSuccess' | 'onSwapError' | 'mockState'>) {
  const adapter = useGoodReserveAdapter(mockState)

  // Emits swap lifecycle callbacks for host integrations.
  useEffect(() => {
    if (adapter.state.status === 'swap_success' && adapter.state.txHash) {
      onSwapSuccess?.({
        address: adapter.state.address,
        chainId: adapter.state.chainId,
        transactionHash: adapter.state.txHash,
      })
      return
    }

    if (adapter.state.status === 'swap_error' && adapter.state.error) {
      onSwapError?.({
        address: adapter.state.address,
        chainId: adapter.state.chainId,
        message: adapter.state.error,
      })
    }
  }, [adapter.state, onSwapError, onSwapSuccess])

  return <ReserveSwapView adapter={adapter} />
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
}: ReserveSwapWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <GoodReserveWidgetInner
        onSwapSuccess={onSwapSuccess}
        onSwapError={onSwapError}
        mockState={mockState}
      />
    </GoodWidgetProvider>
  )
}
