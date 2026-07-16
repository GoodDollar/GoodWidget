import { useEffect, useMemo, useState } from 'react'
import { useWallet } from '@goodwidget/core'
import { useEthers } from '@usedapp/core'
import { useBuyGd } from '@gooddollar/web3sdk-v2/dist/esm/sdk/buygd/react'
import type {
  BuyGdWidgetActions,
  BuyGdWidgetAdapterResult,
  BuyGdWidgetState,
} from './widgetRuntimeContract'

const CELO_CHAIN_ID = 42220

const INITIAL_STATE: BuyGdWidgetState = {
  status: 'no_wallet',
  chainId: null,
  address: null,
  hasProvider: false,
  fiatAmount: '100',
  stableMinAmount: '0',
  currency: 'USD',
  error: null,
  txHash: null,
}

function getTxHash(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const tx = (value as { transaction?: { hash?: string } }).transaction
  return tx?.hash ?? null
}

function getStatus(value: unknown): string {
  if (!value || typeof value !== 'object') return 'None'
  return (value as { status?: string }).status ?? 'None'
}

function getErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  return (value as { errorMessage?: string }).errorMessage ?? null
}

export function useBuyGdAdapter({
  pollIntervalMs,
}: {
  pollIntervalMs: number
}): BuyGdWidgetAdapterResult {
  const wallet = useWallet()
  const { account, activate, activateBrowserWallet } = useEthers()
  const { createAndSwap, triggerSwapTx, createState, swapState } = useBuyGd({ withSwap: true })
  const [state, setState] = useState<BuyGdWidgetState>(INITIAL_STATE)

  useEffect(() => {
    if (!wallet.provider || !wallet.address || account) return
    const provider = wallet.provider as Parameters<typeof activate>[0]
    activate(provider).catch(() => {
      activateBrowserWallet()
    })
  }, [wallet.provider, wallet.address, account, activate, activateBrowserWallet])

  useEffect(() => {
    const hasProvider = Boolean(wallet.provider)
    const chainId = wallet.chainId ?? null
    const address = wallet.address ?? null

    if (!hasProvider || !wallet.isConnected) {
      setState((prev) => ({ ...prev, hasProvider, chainId, address, status: 'no_wallet' }))
      return
    }

    if (chainId !== CELO_CHAIN_ID) {
      setState((prev) => ({
        ...prev,
        hasProvider,
        chainId,
        address,
        status: 'error',
        error: 'Wrong network. Please switch to Celo Mainnet.',
      }))
      return
    }

    setState((prev) => ({ ...prev, hasProvider, chainId, address, status: prev.status === 'no_wallet' ? 'idle' : prev.status }))
  }, [wallet.provider, wallet.chainId, wallet.address, wallet.isConnected])

  useEffect(() => {
    const statuses = [getStatus(createState), getStatus(swapState)]
    const txHash = getTxHash(createState) ?? getTxHash(swapState)

    if (statuses.some((status) => status === 'Mining' || status === 'PendingSignature')) {
      setState((prev) => ({ ...prev, status: 'transaction_pending', txHash }))
      return
    }

    if (statuses.some((status) => status === 'Success')) {
      setState((prev) => ({ ...prev, status: 'success', txHash }))
      return
    }

    if (statuses.some((status) => status === 'Exception' || status === 'Fail')) {
      const message = getErrorMessage(createState) ?? getErrorMessage(swapState) ?? 'Buy G$ transaction failed. Please retry.'
      setState((prev) => ({ ...prev, status: 'error', error: message, txHash }))
    }
  }, [createState, swapState])

  useEffect(() => {
    if (state.status !== 'transaction_pending') return
    const timer = window.setInterval(() => {
      triggerSwapTx().catch(() => {})
    }, pollIntervalMs)
    return () => {
      window.clearInterval(timer)
    }
  }, [state.status, pollIntervalMs, triggerSwapTx])

  const actions = useMemo<BuyGdWidgetActions>(
    () => ({
      connect: async () => {
        await wallet.connect()
      },
      openOnramper: () => {
        setState((prev) => ({ ...prev, status: 'onramper', error: null }))
      },
      setFiatAmount: (value: string) => {
        setState((prev) => ({ ...prev, fiatAmount: value }))
      },
      setStableMinAmount: (value: string) => {
        setState((prev) => ({ ...prev, stableMinAmount: value }))
      },
      setCurrency: (value: string) => {
        setState((prev) => ({ ...prev, currency: value }))
      },
      startBuy: async () => {
        if (!wallet.address || !account) {
          setState((prev) => ({ ...prev, status: 'error', error: 'Connect wallet before buying G$.' }))
          return
        }
        try {
          setState((prev) => ({ ...prev, status: 'loading', error: null }))
          await createAndSwap(state.stableMinAmount || '0')
          setState((prev) => ({ ...prev, status: 'transaction_pending' }))
        } catch (error) {
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: error instanceof Error ? error.message : 'Buy G$ transaction failed. Please retry.',
          }))
        }
      },
      retry: () => {
        setState((prev) => ({ ...prev, status: wallet.isConnected ? 'idle' : 'no_wallet', error: null }))
      },
      refresh: async () => {
        try {
          await triggerSwapTx()
        } catch (error) {
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unable to refresh transaction status.',
          }))
        }
      },
    }),
    [wallet, account, createAndSwap, state.stableMinAmount, triggerSwapTx],
  )

  return { state, actions }
}
