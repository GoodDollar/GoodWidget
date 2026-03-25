import { useContext } from 'react'
import { WalletContext, HostContext, GoodWidgetContext } from './provider'

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error('useWallet must be used within a GoodWidgetProvider')
  }
  return ctx
}

export function useHost() {
  const ctx = useContext(HostContext)
  if (!ctx) {
    throw new Error('useHost must be used within a GoodWidgetProvider')
  }
  return ctx
}

export function useGoodWidget() {
  const ctx = useContext(GoodWidgetContext)
  if (!ctx) {
    throw new Error('useGoodWidget must be used within a GoodWidgetProvider')
  }
  return ctx
}
