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
  const { status, txHash, error, address, chainId } = adapter.state

  // Emits swap lifecycle callbacks for host integrations. Depending on the
  // discrete lifecycle fields (status/txHash/error) rather than the whole state
  // object prevents the success/error callbacks from re-firing on unrelated
  // state changes such as balance refreshes or quote updates.
  useEffect(() => {
    if (status === 'swap_success' && txHash) {
      onSwapSuccess?.({ address, chainId, transactionHash: txHash })
      return
    }

    if (status === 'swap_error' && error) {
      onSwapError?.({ address, chainId, message: error })
    }
  }, [status, txHash, error, address, chainId, onSwapError, onSwapSuccess])

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
