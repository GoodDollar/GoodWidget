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

export interface WalletContextValue extends WalletState {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  /** Label for the disconnect action; see `GoodWidgetProviderProps.disconnectLabel`. */
  disconnectLabel: string
  switchChain: (chainId: number) => Promise<void>
}

export type HostContextValue = HostState

export interface GoodWidgetContextValue extends GoodWidgetState {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  disconnectLabel: string
  switchChain: (chainId: number) => Promise<void>
}

const noopSwitchChain = async () => {
  throw new Error('No wallet provider available to switch chains')
}

export const WalletContext = React.createContext<WalletContextValue>({
  address: null,
  chainId: null,
  isConnected: false,
  provider: null,
  connect: async () => {},
  disconnect: async () => {},
  disconnectLabel: 'Disconnect',
  switchChain: noopSwitchChain,
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
  disconnect: async () => {},
  disconnectLabel: 'Disconnect',
  switchChain: noopSwitchChain,
})

export function GoodWidgetProvider({
  provider: explicitProvider,
  connectOverride,
  disconnectOverride,
  addressOverride,
  chainIdOverride,
  switchChainOverride,
  disconnectLabel = 'Disconnect',
  config: authorConfig,
  themeOverrides,
  defaultTheme = 'dark',
  contentMaxWidth = 480,
  children,
}: GoodWidgetProviderProps) {
  const [resolvedProvider, setResolvedProvider] = useState<EIP1193Provider | null>(
    explicitProvider ?? null,
  )
  const [host, setHost] = useState<HostEnvironment>('injected')
  const [capabilities, setCapabilities] = useState<HostCapabilities>(DEFAULT_CAPABILITIES)
  const [trackedAddress, setTrackedAddress] = useState<string | null>(null)
  const [trackedChainId, setTrackedChainId] = useState<number | null>(null)

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

  // When the integrator supplies a live address/chain id (e.g. from a wallet
  // connection SDK's own reactive hooks), that becomes the single source of
  // truth and the raw EIP-1193 event listeners below are skipped entirely —
  // some connectors (WalletConnect sessions bridged through AppKit in
  // particular) do not reliably emit accountsChanged/chainChanged, which
  // otherwise leaves this state stale after a connect/disconnect/switch.
  const hasAddressOverride = addressOverride !== undefined
  const hasChainIdOverride = chainIdOverride !== undefined

  useEffect(() => {
    if (hasAddressOverride && hasChainIdOverride) return
    if (!resolvedProvider) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (!hasAddressOverride) setTrackedAddress(accounts[0] ?? null)
    }
    const handleChainChanged = (newChainId: string) => {
      if (!hasChainIdOverride) setTrackedChainId(parseInt(newChainId, 16))
    }

    resolvedProvider.on('accountsChanged', handleAccountsChanged)
    resolvedProvider.on('chainChanged', handleChainChanged)

    if (!hasAddressOverride) {
      resolvedProvider
        .request({ method: 'eth_accounts' })
        .then((accounts) => {
          const accs = accounts as string[]
          if (accs.length > 0) setTrackedAddress(accs[0])
        })
        .catch(() => {})
    }

    if (!hasChainIdOverride) {
      resolvedProvider
        .request({ method: 'eth_chainId' })
        .then((id) => setTrackedChainId(parseInt(id as string, 16)))
        .catch(() => {})
    }

    return () => {
      resolvedProvider.removeListener('accountsChanged', handleAccountsChanged)
      resolvedProvider.removeListener('chainChanged', handleChainChanged)
    }
  }, [resolvedProvider, hasAddressOverride, hasChainIdOverride])

  const address = hasAddressOverride ? (addressOverride ?? null) : trackedAddress
  const chainId = hasChainIdOverride ? (chainIdOverride ?? null) : trackedChainId

  const connect = useCallback(async () => {
    if (connectOverride) {
      await connectOverride()
      return
    }

    if (!resolvedProvider) return
    const accounts = (await resolvedProvider.request({
      method: 'eth_requestAccounts',
    })) as string[]
    if (accounts.length > 0 && !hasAddressOverride) {
      setTrackedAddress(accounts[0])
    }
  }, [connectOverride, resolvedProvider, hasAddressOverride])

  // Wallet session ownership stays with the integrator. Provider/account
  // updates after the override resolves flow back through addressOverride/
  // chainIdOverride when supplied, otherwise through the normal EIP-1193
  // accountsChanged event or a changed provider prop.
  const disconnect = useCallback(async () => {
    await disconnectOverride?.()
  }, [disconnectOverride])

  // Tries the standard EIP-3326 request first; falls back to the
  // integrator's own switch/network-modal flow (e.g. AppKit) when the
  // active connector rejects or does not support it — some WalletConnect
  // sessions never resolve wallet_switchEthereumChain at all.
  const switchChain = useCallback(
    async (targetChainId: number) => {
      if (resolvedProvider) {
        try {
          await resolvedProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${targetChainId.toString(16)}` }],
          })
          return
        } catch (err) {
          if (!switchChainOverride) throw err
        }
      }
      if (!switchChainOverride) {
        throw new Error('No wallet provider available to switch chains')
      }
      await switchChainOverride(targetChainId)
    },
    [resolvedProvider, switchChainOverride],
  )

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
      disconnectLabel,
      switchChain,
    }),
    [address, chainId, resolvedProvider, connect, disconnect, disconnectLabel, switchChain],
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
              maxWidth={contentMaxWidth}
              $sm={{ maxWidth: 480 }}
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
