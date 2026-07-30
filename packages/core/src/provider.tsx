import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { TamaguiProvider } from 'tamagui'
import { createGoodWidgetConfig, mergeThemeOverrides, YStack, Stack } from '@goodwidget/ui'
import { detectHost } from './detect'
import type { EIP1193Provider } from './eip1193'
import type {
  GoodWidgetProviderProps,
  HostEnvironment,
  HostCapabilities,
  WalletState,
  HostState,
  GoodWidgetState,
} from './types'

const DEFAULT_CAPABILITIES: HostCapabilities = {
  batchTransactions: false,
  feeCurrency: false,
  haptics: false,
  notifications: false,
  signin: false,
}

// Injected wallets expose no way to ask "was this dApp explicitly disconnected?" —
// eth_accounts just returns whatever the wallet still authorizes, so the
// mount-time silent check below can't tell "never connected" apart from "the
// user pressed Disconnect a moment ago." Track that intent ourselves so a page
// reload right after Disconnect doesn't silently repopulate `address`.
const WALLET_DISCONNECTED_STORAGE_KEY = 'goodwidget:wallet-disconnected'

function readWalletDisconnectedFlag(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(WALLET_DISCONNECTED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeWalletDisconnectedFlag(disconnected: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (disconnected) {
      window.localStorage.setItem(WALLET_DISCONNECTED_STORAGE_KEY, 'true')
    } else {
      window.localStorage.removeItem(WALLET_DISCONNECTED_STORAGE_KEY)
    }
  } catch {
    // Ignore storage failures (e.g. private browsing) — worst case the silent
    // eth_accounts check below repopulates `address` as it did before this fix.
  }
}

export interface WalletContextValue extends WalletState {
  connect: () => Promise<void>
  disconnect: () => void
}

export type HostContextValue = HostState

export interface GoodWidgetContextValue extends GoodWidgetState {
  connect: () => Promise<void>
  disconnect: () => void
}

export const WalletContext = React.createContext<WalletContextValue>({
  address: null,
  chainId: null,
  isConnected: false,
  provider: null,
  connect: async () => {},
  disconnect: () => {},
})

export const HostContext = React.createContext<HostContextValue>({
  host: 'injected',
  capabilities: DEFAULT_CAPABILITIES,
})

export const GoodWidgetContext = React.createContext<GoodWidgetContextValue>({
  address: null,
  chainId: null,
  isConnected: false,
  provider: null,
  host: 'injected',
  capabilities: DEFAULT_CAPABILITIES,
  connect: async () => {},
  disconnect: () => {},
})

export function GoodWidgetProvider({
  provider: explicitProvider,
  connectOverride,
  config: authorConfig,
  themeOverrides,
  defaultTheme = 'dark',
  children,
}: GoodWidgetProviderProps) {
  const [resolvedProvider, setResolvedProvider] = useState<EIP1193Provider | null>(
    explicitProvider ?? null,
  )
  const [host, setHost] = useState<HostEnvironment>('injected')
  const [capabilities, setCapabilities] = useState<HostCapabilities>(DEFAULT_CAPABILITIES)
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    detectHost(explicitProvider).then((result) => {
      if (cancelled || !result) return
      setResolvedProvider(result.provider)
      setHost(result.host)
      setCapabilities(result.capabilities)
    })
    return () => {
      cancelled = true
    }
  }, [explicitProvider])

  useEffect(() => {
    if (!resolvedProvider) return

    const handleAccountsChanged = (accounts: string[]) => {
      setAddress(accounts[0] ?? null)
    }
    const handleChainChanged = (newChainId: string) => {
      setChainId(parseInt(newChainId, 16))
    }

    resolvedProvider.on('accountsChanged', handleAccountsChanged)
    resolvedProvider.on('chainChanged', handleChainChanged)

    resolvedProvider
      .request({ method: 'eth_accounts' })
      .then((accounts) => {
        if (readWalletDisconnectedFlag()) return
        const accs = accounts as string[]
        if (accs.length > 0) setAddress(accs[0])
      })
      .catch(() => {})

    resolvedProvider
      .request({ method: 'eth_chainId' })
      .then((id) => setChainId(parseInt(id as string, 16)))
      .catch(() => {})

    return () => {
      resolvedProvider.removeListener('accountsChanged', handleAccountsChanged)
      resolvedProvider.removeListener('chainChanged', handleChainChanged)
    }
  }, [resolvedProvider])

  const connect = useCallback(async () => {
    if (connectOverride) {
      await connectOverride()
      writeWalletDisconnectedFlag(false)
      return
    }

    if (!resolvedProvider) return
    const accounts = (await resolvedProvider.request({
      method: 'eth_requestAccounts',
    })) as string[]
    if (accounts.length > 0) {
      setAddress(accounts[0])
      writeWalletDisconnectedFlag(false)
    }
  }, [connectOverride, resolvedProvider])

  // Injected/host wallets expose no revoke-permission API, so "disconnect" only
  // clears GoodWidget's own connected-address state — the host wallet extension
  // or app stays available and can reconnect without a fresh permission prompt.
  // The persisted flag is what keeps that cleared state from being silently
  // undone by the eth_accounts mount-check above on the next page load.
  const disconnect = useCallback(() => {
    setAddress(null)
    writeWalletDisconnectedFlag(true)
  }, [])

  const mergedConfig = useMemo(() => {
    const finalConfig = mergeThemeOverrides(authorConfig, themeOverrides)
    return createGoodWidgetConfig(finalConfig ?? undefined)
  }, [authorConfig, themeOverrides])

  const walletValue = useMemo<WalletContextValue>(
    () => ({
      address,
      chainId,
      isConnected: address !== null,
      provider: resolvedProvider,
      connect,
      disconnect,
    }),
    [address, chainId, resolvedProvider, connect, disconnect],
  )

  const hostValue = useMemo<HostContextValue>(() => ({ host, capabilities }), [host, capabilities])

  const goodWidgetValue = useMemo<GoodWidgetContextValue>(
    () => ({
      ...walletValue,
      host,
      capabilities,
    }),
    [walletValue, host, capabilities],
  )

  return (
    <GoodWidgetContext.Provider value={goodWidgetValue}>
      <HostContext.Provider value={hostValue}>
        <WalletContext.Provider value={walletValue}>
          <TamaguiProvider config={mergedConfig} defaultTheme={defaultTheme}>
            <YStack
              backgroundColor="$background"
              width="100%"
              marginHorizontal="auto"
              flex={1}
              alignItems="center"
              maxWidth={480} // todo: fix or at least review, should be handling responsive layouts better
            >
              <Stack
                flex={1}
                gap="$4"
                width="100%"
                style={{
                  overflowX: 'hidden',
                }}
                alignItems="center"
              >
                {children}
              </Stack>
            </YStack>
          </TamaguiProvider>
        </WalletContext.Provider>
      </HostContext.Provider>
    </GoodWidgetContext.Provider>
  )
}
