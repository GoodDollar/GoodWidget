import React, { useEffect, useRef } from 'react'
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
