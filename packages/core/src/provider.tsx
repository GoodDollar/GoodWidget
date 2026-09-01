import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { TamaguiProvider } from 'tamagui'
import { createGoodWidgetConfig, mergeThemeOverrides, YStack, Stack } from '@goodwidget/ui'
import type { IconName } from '@goodwidget/ui'
import { detectHost } from './detect'
import {
  resolveLiveAddress,
  resolveTrackedAddress,
  resolveVerifiedAddress,
} from './walletLiveness'
import type { EIP1193Provider } from './eip1193'
import type {
  GoodWidgetProviderProps,
  HostEnvironment,
  HostCapabilities,
  WalletState,
  HostState,
  GoodWidgetState,
} from './types'

/** Collapses the focus + visibilitychange pair a single tab return fires into one probe. */
const WAKE_PROBE_MIN_INTERVAL_MS = 1000

const DEFAULT_CAPABILITIES: HostCapabilities = {
  batchTransactions: false,
  feeCurrency: false,
  haptics: false,
  notifications: false,
  signin: false,
}

export interface WalletContextValue extends WalletState {
  connect: () => Promise<void>
  /**
   * Re-reads the wallet's authorized accounts and returns the live address, or
   * `null` when it has none — locked, disconnected, or permissions revoked.
   *
   * `isConnected` is a rendered snapshot and a wallet can lock at any moment
   * after it, so anything that is about to ask for a signature should await this
   * first and fail with its own message rather than letting the wallet throw.
   * Resolves to the current address when no provider can answer, so callers on
   * exotic hosts are not blocked by an unanswerable question.
   */
  verifyAccount: () => Promise<string | null>
  /**
   * Ends the wallet session when supported.
   * @throws Error with message `DISCONNECT_UNAVAILABLE_ERROR` when `canDisconnect` is false.
   */
  disconnect: () => Promise<void>
  /**
   * Whether `disconnect` can actually end the session. False for connectors
   * that give a dApp no way to do it — an injected provider with no
   * `disconnectOverride`, since EIP-1193 has no disconnect method. UI should
   * read this instead of offering an action that cannot fire.
   */
  canDisconnect: boolean
  /** Label for the disconnect action; see `GoodWidgetProviderProps.disconnectLabel`. */
  disconnectLabel: string
  /** Icon for the disconnect action; see `GoodWidgetProviderProps.disconnectIcon`. */
  disconnectIcon: IconName
  switchChain: (chainId: number) => Promise<void>
}

export type HostContextValue = HostState

export interface GoodWidgetContextValue extends GoodWidgetState {
  connect: () => Promise<void>
  /** See `WalletContextValue.verifyAccount`. */
  verifyAccount: () => Promise<string | null>
  disconnect: () => Promise<void>
  /** See `WalletContextValue.canDisconnect`. */
  canDisconnect: boolean
  disconnectLabel: string
  disconnectIcon: IconName
  switchChain: (chainId: number) => Promise<void>
}

export const DISCONNECT_UNAVAILABLE_ERROR =
  'This connector cannot be disconnected by the site — end the session from your wallet'
const SWITCH_CHAIN_UNAVAILABLE_ERROR = 'No wallet provider available to switch chains'
const SWITCH_CHAIN_TIMEOUT_ERROR = 'Timed out waiting for the wallet to respond to the network switch request'
const SWITCH_CHAIN_REQUEST_TIMEOUT_MS = 10_000

const noopSwitchChain = async () => {
  throw new Error(SWITCH_CHAIN_UNAVAILABLE_ERROR)
}

/**
 * Races a promise against a timeout so a request the wallet never settles
 * (some WalletConnect sessions never resolve or reject
 * wallet_switchEthereumChain at all) doesn't hang the caller forever — a
 * timeout is treated the same as any other rejection, so switchChain's
 * existing override fallback below still applies.
 */
function raceWithTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

/**
 * EIP-1193's standard user-rejection code (4001), plus ethers v6's
 * ACTION_REJECTED — both mean the wallet's own switch-chain prompt was
 * shown and the user explicitly declined it, as opposed to the request
 * being unsupported or never resolving. Falling back to the integrator's
 * switch-chain override on a rejection would re-prompt via a second modal
 * right after the user just said no to the first one.
 */
function isUserRejectedSwitchChain(err: unknown): boolean {
  const code = (err as { code?: number | string } | undefined)?.code
  return Number(code) === 4001 || code === 'ACTION_REJECTED'
}

export const WalletContext = React.createContext<WalletContextValue>({
  address: null,
  chainId: null,
  isConnected: false,
  provider: null,
  availableChainIds: null,
  connect: async () => {},
  verifyAccount: async () => null,
  disconnect: async () => {},
  canDisconnect: false,
  disconnectLabel: 'Disconnect',
  disconnectIcon: 'log-out',
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
  availableChainIds: null,
  host: 'injected',
  capabilities: DEFAULT_CAPABILITIES,
  connect: async () => {},
  verifyAccount: async () => null,
  disconnect: async () => {},
  canDisconnect: false,
  disconnectLabel: 'Disconnect',
  disconnectIcon: 'log-out',
  switchChain: noopSwitchChain,
})

export function GoodWidgetProvider({
  provider: explicitProvider,
  connectOverride,
  disconnectOverride,
  addressOverride,
  chainIdOverride,
  switchChainOverride,
  availableChainIdsOverride,
  disconnectLabel = 'Disconnect',
  disconnectIcon = 'log-out',
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
  const [walletReportsNoAccounts, setWalletReportsNoAccounts] = useState(false)

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

  const hasAddressOverride = addressOverride !== undefined
  const hasChainIdOverride = chainIdOverride !== undefined

  // One subscription to the wallet, feeding two questions.
  //
  // 1. Tracking — when the integrator supplies no override, the raw
  //    accountsChanged/chainChanged events and their initial reads are where
  //    address and chain id come from.
  //
  // 2. Liveness — when the integrator *does* supply an address, it can still go
  //    stale: connection SDKs restore the last account from storage without
  //    checking the wallet, so AppKit reports a connected session while the
  //    wallet behind it is locked. The address is then real but dead — reads
  //    against it succeed, so the widget renders a healthy session until the
  //    first signature fails. An empty account list is the wallet contradicting
  //    that override.
  //
  // Only an explicitly supplied provider may contradict an override. One we
  // detected ourselves may be a different wallet than the one backing it — an
  // injected MetaMask sitting next to a live WalletConnect session — and its
  // empty account list would say nothing about that session.
  useEffect(() => {
    if (!resolvedProvider) return
    setWalletReportsNoAccounts(false)

    let cancelled = false
    let lastProbeAt = 0
    const mayVetoOverride = resolvedProvider === explicitProvider

    const applyAccounts = (accounts: string[], source: 'event' | 'poll') => {
      if (cancelled) return
      if (mayVetoOverride) setWalletReportsNoAccounts(accounts.length === 0)
      if (hasAddressOverride) return
      setTrackedAddress((current) => resolveTrackedAddress(current, accounts, source))
    }

    const handleAccountsChanged = (accounts: string[]) => applyAccounts(accounts, 'event')
    const handleChainChanged = (newChainId: string) => {
      if (!cancelled && !hasChainIdOverride) setTrackedChainId(parseInt(newChainId, 16))
    }

    const probeAccounts = () => {
      lastProbeAt = Date.now()
      resolvedProvider
        .request({ method: 'eth_accounts' })
        .then((accounts) => applyAccounts(accounts as string[], 'poll'))
        // A wallet that refuses the probe has told us nothing, so leave what we
        // have standing rather than reading a thrown request as "no accounts".
        .catch(() => {})
    }

    // accountsChanged is the fast path, but not every wallet emits it on lock and
    // a WalletConnect session can die on the phone with nothing reaching this tab.
    // Returning to the tab is when that is most likely to have happened — and
    // both events fire on a single return, hence the interval guard.
    const handleWake = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      if (Date.now() - lastProbeAt < WAKE_PROBE_MIN_INTERVAL_MS) return
      probeAccounts()
    }

    resolvedProvider.on('accountsChanged', handleAccountsChanged)
    resolvedProvider.on('chainChanged', handleChainChanged)
    if (mayVetoOverride && typeof window !== 'undefined') {
      window.addEventListener('focus', handleWake)
      document.addEventListener('visibilitychange', handleWake)
    }

    // Skippable only when nothing would read the result: an overridden address
    // that this provider is not entitled to contradict.
    if (!hasAddressOverride || mayVetoOverride) probeAccounts()

    if (!hasChainIdOverride) {
      resolvedProvider
        .request({ method: 'eth_chainId' })
        .then((id) => {
          if (!cancelled) setTrackedChainId(parseInt(id as string, 16))
        })
        .catch(() => {})
    }

    return () => {
      cancelled = true
      resolvedProvider.removeListener('accountsChanged', handleAccountsChanged)
      resolvedProvider.removeListener('chainChanged', handleChainChanged)
      if (mayVetoOverride && typeof window !== 'undefined') {
        window.removeEventListener('focus', handleWake)
        document.removeEventListener('visibilitychange', handleWake)
      }
    }
  }, [resolvedProvider, explicitProvider, hasAddressOverride, hasChainIdOverride])

  const overrideOrTrackedAddress = hasAddressOverride ? (addressOverride ?? null) : trackedAddress
  const address = resolveLiveAddress(overrideOrTrackedAddress, walletReportsNoAccounts)
  const chainId = hasChainIdOverride ? (chainIdOverride ?? null) : trackedChainId

  // Fresh read at the moment of asking, for callers that are about to request a
  // signature. Unlike the effect above this runs against whatever provider we
  // have — at the point of use, a detected provider answering "no accounts" is
  // still the best evidence available, and the alternative is handing the user a
  // raw wallet exception.
  const verifyAccount = useCallback(async (): Promise<string | null> => {
    if (!resolvedProvider) return address
    try {
      const accounts = (await resolvedProvider.request({ method: 'eth_accounts' })) as string[]
      setWalletReportsNoAccounts(accounts.length === 0)
      if (!hasAddressOverride) setTrackedAddress(accounts[0] ?? null)
      return resolveVerifiedAddress(accounts, {
        hasAddressOverride,
        candidate: overrideOrTrackedAddress,
      })
    } catch {
      // Unanswerable, not answered "no" — never block on a refused probe.
      return address
    }
  }, [resolvedProvider, address, overrideOrTrackedAddress, hasAddressOverride])

  const connect = useCallback(async () => {
    if (connectOverride) {
      await connectOverride()
      return
    }

    if (!resolvedProvider) return
    const accounts = (await resolvedProvider.request({
      method: 'eth_requestAccounts',
    })) as string[]
    if (accounts.length > 0) {
      // A granted request is first-hand proof of a live account, so lift the veto
      // here rather than waiting on an accountsChanged some wallets never emit.
      setWalletReportsNoAccounts(false)
      if (!hasAddressOverride) setTrackedAddress(accounts[0])
    }
  }, [connectOverride, resolvedProvider, hasAddressOverride])

  // Wallet session ownership stays with the integrator. Provider/account
  // updates after the override resolves flow back through addressOverride/
  // chainIdOverride when supplied, otherwise through the normal EIP-1193
  // accountsChanged event or a changed provider prop.
  const canDisconnect = Boolean(disconnectOverride)

  const disconnect = useCallback(async () => {
    // Rejecting beats resolving into nothing: a caller that skipped
    // `canDisconnect` gets told the session is still open rather than
    // reporting success for a disconnect that never happened.
    if (!disconnectOverride) {
      throw new Error(DISCONNECT_UNAVAILABLE_ERROR)
    }
    await disconnectOverride()
  }, [disconnectOverride])

  // Tries the standard EIP-3326 request first; falls back to the
  // integrator's own switch/network-modal flow (e.g. AppKit) when the
  // active connector rejects, does not support it, or never settles the
  // request at all (some WalletConnect sessions do this, hence the timeout
  // race below rather than a bare await).
  const switchChain = useCallback(
    async (targetChainId: number) => {
      if (resolvedProvider) {
        try {
          await raceWithTimeout(
            resolvedProvider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${targetChainId.toString(16)}` }],
            }),
            SWITCH_CHAIN_REQUEST_TIMEOUT_MS,
            SWITCH_CHAIN_TIMEOUT_ERROR,
          )
          return
        } catch (err) {
          if (!switchChainOverride || isUserRejectedSwitchChain(err)) throw err
        }
      }
      if (!switchChainOverride) {
        throw new Error(SWITCH_CHAIN_UNAVAILABLE_ERROR)
      }
      await switchChainOverride(targetChainId)
    },
    [resolvedProvider, switchChainOverride],
  )

  const availableChainIds = availableChainIdsOverride ?? null

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
      availableChainIds,
      connect,
      verifyAccount,
      disconnect,
      canDisconnect,
      disconnectLabel,
      disconnectIcon,
      switchChain,
    }),
    [
      address,
      chainId,
      resolvedProvider,
      availableChainIds,
      connect,
      verifyAccount,
      disconnect,
      canDisconnect,
      disconnectLabel,
      disconnectIcon,
      switchChain,
    ],
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
