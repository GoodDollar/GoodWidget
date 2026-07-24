import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '@goodwidget/core'
import { createPublicClient, createWalletClient, custom, isAddress, type Chain, type PublicClient } from 'viem'
import { IdentitySDK, SupportedChains } from '@goodsdks/citizen-sdk'
import { createDialog, closeDialog, createToast, updateToast } from '@goodwidget/ui'
import {
  CONNECT_A_WALLET_CHAINS,
  type ConnectAWalletChainId,
  type ConnectAWalletChainLinkState,
  type ConnectAWalletLinkErrorDetail,
  type ConnectAWalletLinkEventDetail,
  type ConnectAWalletWidgetAdapterActions,
  type ConnectAWalletWidgetAdapterResult,
  type ConnectAWalletWidgetAdapterState,
  type ConnectAWalletWidgetEnvironment,
  type ConnectAWalletWidgetStatus,
} from './widgetRuntimeContract'

// ---------------------------------------------------------------------------
// Minimal viem chain descriptors — same RPC endpoints as citizen-claim-widget,
// kept in sync since both packages target the same citizen-sdk deployment.
// ---------------------------------------------------------------------------
const CHAIN_CONFIGS: Record<ConnectAWalletChainId, Chain> = {
  [SupportedChains.FUSE]: {
    id: SupportedChains.FUSE,
    name: 'Fuse',
    nativeCurrency: { name: 'Fuse', symbol: 'FUSE', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.fuse.io'] } },
  } as Chain,
  [SupportedChains.CELO]: {
    id: SupportedChains.CELO,
    name: 'Celo',
    nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
    rpcUrls: { default: { http: ['https://forno.celo.org'] } },
  } as Chain,
  [SupportedChains.XDC]: {
    id: SupportedChains.XDC,
    name: 'XDC Network',
    nativeCurrency: { name: 'XDC', symbol: 'XDC', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.ankr.com/xdc'] } },
  } as Chain,
}

const CHAIN_NAMES: Record<ConnectAWalletChainId, string> = {
  [SupportedChains.FUSE]: 'Fuse',
  [SupportedChains.CELO]: 'Celo',
  [SupportedChains.XDC]: 'XDC',
}

const DEFAULT_CHAIN: ConnectAWalletChainId = SupportedChains.CELO

function humanReadableError(err: unknown): string {
  console.error('[ConnectAWalletWidget]', err)
  if (!(err instanceof Error)) return 'Something went wrong. Please try again.'
  const msg = err.message
  if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('4001')) {
    return 'Rejected by wallet.'
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ECONNREFUSED')) {
    return 'Unable to reach the network. Check your connection and try again.'
  }
  return 'Something went wrong. Please try again.'
}

/**
 * Opens a blocking GoodWidgetDialog and resolves once the user accepts or
 * rejects it. Mirrors citizen-sdk's WalletLinkOptions.onSecurityMessage
 * contract: resolve(true) to proceed with the transaction, resolve(false) to
 * cancel it. Confirmed by Bounty Lead sign-off: this must block before the
 * transaction executes, using packages/ui's Dialog.
 */
function confirmSecurityMessageViaDialog(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    createDialog({
      title: 'Security Confirmation',
      body: message,
      acceptLabel: 'Confirm',
      rejectLabel: 'Cancel',
      onAccept: () => {
        resolve(true)
      },
      onReject: () => {
        resolve(false)
      },
    })
  })
}

export interface UseConnectAWalletAdapterOptions {
  environment?: ConnectAWalletWidgetEnvironment
  onLinkSuccess?: (detail: ConnectAWalletLinkEventDetail) => void
  onLinkError?: (detail: ConnectAWalletLinkErrorDetail) => void
  onUnlinkSuccess?: (detail: ConnectAWalletLinkEventDetail) => void
}

/**
 * Core adapter hook: bridges @goodsdks/citizen-sdk's wallet-link API to
 * GoodWidget state/actions.
 *
 * Runtime path:
 *   host provider → GoodWidgetProvider → useWallet() → this adapter → citizen-sdk
 *
 * Calls IdentitySDK.connectAccount/disconnectAccount/checkConnectedStatus
 * directly — no @goodsdks/react-hooks, since those hooks require a Wagmi v2
 * provider tree and GoodWidget's provider-first architecture only exposes a
 * raw EIP-1193 provider via useWallet(). Confirmed against every other widget
 * in this repo: none of them pull in react-hooks/Wagmi either.
 */
export function useConnectAWalletAdapter(
  options: UseConnectAWalletAdapterOptions = {},
): ConnectAWalletWidgetAdapterResult {
  const { onLinkSuccess, onLinkError, onUnlinkSuccess } = options
  const env = options.environment ?? 'production'
  const { address, chainId, isConnected, provider, connect } = useWallet()

  const isActiveChainSupported =
    chainId !== null && (CONNECT_A_WALLET_CHAINS as readonly number[]).includes(chainId)

  const [isConnectingWallet, setIsConnectingWallet] = useState(false)
  const [secondaryAddressInput, setSecondaryAddressInputState] = useState('')
  const [secondaryAddress, setSecondaryAddress] = useState<`0x${string}` | null>(null)
  const [status, setStatus] = useState<ConnectAWalletWidgetStatus>('not_connected')
  const [error, setError] = useState<string | null>(null)
  const [chainLinks, setChainLinks] = useState<ConnectAWalletChainLinkState[]>(
    CONNECT_A_WALLET_CHAINS.map((id) => ({
      chainId: id,
      chainName: CHAIN_NAMES[id],
      status: 'checking',
    })),
  )

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Client + SDK factory for one chain. The wallet client's account/chain are
  // only used when actually signing (connect/disconnect); reads pass an
  // explicit publicClients map so they never depend on the host wallet's
  // currently active chain.
  // ---------------------------------------------------------------------------
  const createIdentitySdkForChain = useCallback(
    (targetChainId: ConnectAWalletChainId) => {
      if (!provider || !address) return null
      const chain = CHAIN_CONFIGS[targetChainId]
      const transport = custom(provider as Parameters<typeof custom>[0])
      const publicClient = createPublicClient({ chain, transport })
      const walletClient = createWalletClient({
        account: address as `0x${string}`,
        chain,
        transport,
      })
      return new IdentitySDK({ publicClient, walletClient, env })
    },
    [provider, address, env],
  )

  const publicClientsByChain = useMemo(
    () =>
      CONNECT_A_WALLET_CHAINS.reduce(
        (acc, id) => {
          const chain = CHAIN_CONFIGS[id]
          acc[id] = createPublicClient({ chain, transport: custom(provider as Parameters<typeof custom>[0]) })
          return acc
        },
        {} as Record<ConnectAWalletChainId, PublicClient>,
      ),
    [provider],
  )

  // ---------------------------------------------------------------------------
  // checkSecondaryAddress — validates the typed-in address, then loads its
  // wallet-link status on all 3 supported chains in a single SDK call.
  // ---------------------------------------------------------------------------
  const checkSecondaryAddress = useCallback(async (): Promise<void> => {
    const trimmed = secondaryAddressInput.trim()
    if (!isAddress(trimmed)) {
      setStatus('connected_no_input')
      setError('Enter a valid wallet address.')
      return
    }

    setSecondaryAddress(trimmed)
    setStatus('checking_address')
    setError(null)
    setChainLinks(CONNECT_A_WALLET_CHAINS.map((id) => ({ chainId: id, chainName: CHAIN_NAMES[id], status: 'checking' })))

    const sdk = createIdentitySdkForChain(isActiveChainSupported ? (chainId as ConnectAWalletChainId) : DEFAULT_CHAIN)
    if (!sdk) {
      setStatus('error')
      setError('Wallet not connected.')
      return
    }

    try {
      const statuses = await sdk.checkConnectedStatus(trimmed, undefined, publicClientsByChain)
      if (!mountedRef.current) return
      setChainLinks(
        CONNECT_A_WALLET_CHAINS.map((id) => {
          const found = statuses.find((entry: { chainId: number }) => entry.chainId === id)
          return {
            chainId: id,
            chainName: CHAIN_NAMES[id],
            status: found?.isConnected ? 'connected' : 'not_connected',
          }
        }),
      )
      setStatus('ready')
    } catch (err: unknown) {
      if (!mountedRef.current) return
      setStatus('error')
      setError(humanReadableError(err))
    }
  }, [secondaryAddressInput, createIdentitySdkForChain, isActiveChainSupported, chainId, publicClientsByChain])

  const setSecondaryAddressInput = useCallback((value: string) => {
    setSecondaryAddressInputState(value)
  }, [])

  const handleConnectWallet = useCallback(async (): Promise<void> => {
    setIsConnectingWallet(true)
    try {
      await connect()
    } finally {
      if (mountedRef.current) setIsConnectingWallet(false)
    }
  }, [connect])

  // ---------------------------------------------------------------------------
  // connectChain / disconnectChain — link or unlink `secondaryAddress` on one
  // chain. Switches the host wallet to that chain first (EIP-3326), same
  // pattern as citizen-claim-widget's per-chain claim action. onSecurityMessage
  // blocks on a Dialog; tx result surfaces via Toast, never an inline error.
  // ---------------------------------------------------------------------------
  const setRowStatus = useCallback((targetChainId: ConnectAWalletChainId, rowStatus: ConnectAWalletChainLinkState['status']) => {
    setChainLinks((prev) =>
      prev.map((row) => (row.chainId === targetChainId ? { ...row, status: rowStatus } : row)),
    )
  }, [])

  const switchWalletToChain = useCallback(
    async (targetChainId: ConnectAWalletChainId) => {
      if (!provider) throw new Error('No wallet provider available')
      await (
        provider as { request: (args: { method: string; params: unknown[] }) => Promise<unknown> }
      ).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      })
    },
    [provider],
  )

  const connectChain = useCallback(
    async (targetChainId: ConnectAWalletChainId): Promise<void> => {
      if (!secondaryAddress) return
      const previousStatus = chainLinks.find((row) => row.chainId === targetChainId)?.status ?? 'not_connected'
      setRowStatus(targetChainId, 'connecting')

      const toastId = createToast({
        message: `Linking on ${CHAIN_NAMES[targetChainId]}…`,
        status: 'pending',
        duration: 0,
      })

      try {
        await switchWalletToChain(targetChainId)
        const sdk = createIdentitySdkForChain(targetChainId)
        if (!sdk) throw new Error('Unable to initialize SDK clients for target chain')

        let transactionHash: string | undefined
        await sdk.connectAccount(secondaryAddress, {
          onSecurityMessage: confirmSecurityMessageViaDialog,
          onHash: (hash: `0x${string}`) => {
            transactionHash = hash
          },
        })

        if (!mountedRef.current) return
        closeDialog()
        setRowStatus(targetChainId, 'connected')
        updateToast(toastId, {
          message: `Linked on ${CHAIN_NAMES[targetChainId]}`,
          status: 'success',
          duration: 3200,
        })
        onLinkSuccess?.({ address: secondaryAddress, chainId: targetChainId, transactionHash })
      } catch (err: unknown) {
        if (!mountedRef.current) return
        closeDialog()
        setRowStatus(targetChainId, previousStatus)
        updateToast(toastId, {
          message: `Failed to link on ${CHAIN_NAMES[targetChainId]}: ${humanReadableError(err)}`,
          status: 'error',
          duration: 0,
        })
        onLinkError?.({
          address: secondaryAddress,
          chainId: targetChainId,
          message: humanReadableError(err),
        })
      }
    },
    [secondaryAddress, chainLinks, setRowStatus, switchWalletToChain, createIdentitySdkForChain, onLinkSuccess, onLinkError],
  )

  const disconnectChain = useCallback(
    async (targetChainId: ConnectAWalletChainId): Promise<void> => {
      if (!secondaryAddress) return
      const previousStatus = chainLinks.find((row) => row.chainId === targetChainId)?.status ?? 'connected'
      setRowStatus(targetChainId, 'disconnecting')

      const toastId = createToast({
        message: `Unlinking on ${CHAIN_NAMES[targetChainId]}…`,
        status: 'pending',
        duration: 0,
      })

      try {
        await switchWalletToChain(targetChainId)
        const sdk = createIdentitySdkForChain(targetChainId)
        if (!sdk) throw new Error('Unable to initialize SDK clients for target chain')

        let transactionHash: string | undefined
        await sdk.disconnectAccount(secondaryAddress, {
          onSecurityMessage: confirmSecurityMessageViaDialog,
          onHash: (hash: `0x${string}`) => {
            transactionHash = hash
          },
        })

        if (!mountedRef.current) return
        closeDialog()
        setRowStatus(targetChainId, 'not_connected')
        updateToast(toastId, {
          message: `Unlinked on ${CHAIN_NAMES[targetChainId]}`,
          status: 'success',
          duration: 3200,
        })
        onUnlinkSuccess?.({ address: secondaryAddress, chainId: targetChainId, transactionHash })
      } catch (err: unknown) {
        if (!mountedRef.current) return
        closeDialog()
        setRowStatus(targetChainId, previousStatus)
        updateToast(toastId, {
          message: `Failed to unlink on ${CHAIN_NAMES[targetChainId]}: ${humanReadableError(err)}`,
          status: 'error',
          duration: 0,
        })
        onLinkError?.({
          address: secondaryAddress,
          chainId: targetChainId,
          message: humanReadableError(err),
        })
      }
    },
    [secondaryAddress, chainLinks, setRowStatus, switchWalletToChain, createIdentitySdkForChain, onUnlinkSuccess, onLinkError],
  )

  // Reset to not_connected / connected_no_input whenever wallet identity changes.
  useEffect(() => {
    if (!isConnected) {
      setStatus('not_connected')
      setSecondaryAddress(null)
      return
    }
    setStatus('connected_no_input')
  }, [isConnected, address])

  const state: ConnectAWalletWidgetAdapterState = useMemo(
    () => ({
      isWalletConnected: isConnected,
      walletAddress: address ?? null,
      activeChainId: chainId ?? null,
      isActiveChainSupported,
      status: isConnectingWallet ? 'connecting' : status,
      error,
      secondaryAddressInput,
      secondaryAddress,
      chainLinks,
    }),
    [
      isConnected,
      address,
      chainId,
      isActiveChainSupported,
      isConnectingWallet,
      status,
      error,
      secondaryAddressInput,
      secondaryAddress,
      chainLinks,
    ],
  )

  const actions: ConnectAWalletWidgetAdapterActions = useMemo(
    () => ({
      connectWallet: handleConnectWallet,
      setSecondaryAddressInput,
      checkSecondaryAddress,
      connectChain,
      disconnectChain,
    }),
    [handleConnectWallet, setSecondaryAddressInput, checkSecondaryAddress, connectChain, disconnectChain],
  )

  return { state, actions }
}
