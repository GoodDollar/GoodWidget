import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '@goodwidget/core'
import { createPublicClient, createWalletClient, custom, http, isAddress, type Chain, type PublicClient } from 'viem'
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
  if (msg === 'Wallet changed') return 'Wallet changed. Check the address status again.'
  if (msg === 'Transaction reverted') return 'Transaction reverted. Please check the address status and retry.'
  if (msg.includes('cancelled: user did not confirm')) return 'Cancelled by user.'
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
function confirmSecurityMessageViaDialog(
  message: string,
  onPending: (cancel: (() => void) | null) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (accepted: boolean) => {
      onPending(null)
      resolve(accepted)
    }
    onPending(() => {
      closeDialog()
      finish(false)
    })
    createDialog({
      title: 'Security Confirmation',
      body: message,
      acceptLabel: 'Confirm',
      rejectLabel: 'Cancel',
      onAccept: () => {
        finish(true)
      },
      onReject: () => {
        finish(false)
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
  const { address, chainId, isConnected, provider, connect, verifyAccount } = useWallet()

  const isActiveChainSupported =
    chainId !== null && (CONNECT_A_WALLET_CHAINS as readonly number[]).includes(chainId)

  const [isConnectingWallet, setIsConnectingWallet] = useState(false)
  const [secondaryAddressInput, setSecondaryAddressInputState] = useState('')
  const [secondaryAddress, setSecondaryAddress] = useState<`0x${string}` | null>(null)
  const [status, setStatus] = useState<ConnectAWalletWidgetStatus>('not_connected')
  const [error, setError] = useState<string | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  // The ref closes the gap before React renders disabled controls.
  const busyRef = useRef(false)
  const walletVersion = useRef(0)
  const cancelConfirmation = useRef<(() => void) | null>(null)
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
      cancelConfirmation.current?.()
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
      const publicClient = createPublicClient({ chain, transport: http() })
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
          acc[id] = createPublicClient({ chain, transport: http() })
          return acc
        },
        {} as Record<ConnectAWalletChainId, PublicClient>,
      ),
    [],
  )

  // ---------------------------------------------------------------------------
  // checkSecondaryAddress — validates the typed-in address, then loads its
  // wallet-link status on all 3 supported chains in a single SDK call.
  // ---------------------------------------------------------------------------
  const checkSecondaryAddress = useCallback(async (): Promise<void> => {
    if (busyRef.current) return
    if (!isConnected || !provider || !address) {
      setError('Wallet not connected.')
      return
    }
    const trimmed = secondaryAddressInput.trim()
    if (!isAddress(trimmed)) {
      setStatus('connected_no_input')
      setAddressError('Enter a valid wallet address.')
      return
    }

    busyRef.current = true
    setIsBusy(true)
    const version = walletVersion.current
    setAddressError(null)
    setSecondaryAddress(trimmed)
    setStatus('checking_address')
    setError(null)
    setChainLinks(CONNECT_A_WALLET_CHAINS.map((id) => ({ chainId: id, chainName: CHAIN_NAMES[id], status: 'checking' })))

    try {
      const sdk = createIdentitySdkForChain(isActiveChainSupported ? (chainId as ConnectAWalletChainId) : DEFAULT_CHAIN)
      if (!sdk) throw new Error('Wallet changed')
      const statuses = await sdk.checkConnectedStatus(trimmed, undefined, publicClientsByChain)
      if (!mountedRef.current || walletVersion.current !== version) return
      // The SDK resolves per-chain RPC failures as entries, rather than throwing.
      const unavailable = CONNECT_A_WALLET_CHAINS.filter((id) => {
        const entry = statuses.find((result) => result.chainId === id)
        return !entry || entry.error
      })
      if (unavailable.length) {
        setStatus('error')
        setError(`Unable to check status on ${unavailable.map((id) => CHAIN_NAMES[id]).join(', ')}. Please retry.`)
        return
      }
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
      if (!mountedRef.current || walletVersion.current !== version) return
      setStatus('error')
      setError(humanReadableError(err))
    } finally {
      busyRef.current = false
      if (mountedRef.current) setIsBusy(false)
    }
  }, [secondaryAddressInput, createIdentitySdkForChain, isActiveChainSupported, chainId, publicClientsByChain, isConnected, provider, address])

  const setSecondaryAddressInput = useCallback((value: string) => {
    if (busyRef.current) return
    setSecondaryAddressInputState(value)
    setAddressError(null)
  }, [])

  // Lets the user re-open the address form from the 'ready' state to check a
  // different address, since there's otherwise no way back to it once a
  // secondary address has been validated.
  const changeSecondaryAddress = useCallback(() => {
    if (busyRef.current) return
    setSecondaryAddress(null)
    setSecondaryAddressInputState('')
    setError(null)
    setAddressError(null)
    setStatus('connected_no_input')
  }, [])

  const handleConnectWallet = useCallback(async (): Promise<void> => {
    if (busyRef.current) return
    if (!provider) {
      setError('No wallet provider available. Connect a wallet in the host app.')
      return
    }
    busyRef.current = true
    setError(null)
    setIsConnectingWallet(true)
    try {
      await connect()
    } catch (err: unknown) {
      if (mountedRef.current) setError(humanReadableError(err))
    } finally {
      busyRef.current = false
      if (mountedRef.current) setIsConnectingWallet(false)
    }
  }, [connect, provider])

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

  const confirmForWallet = useCallback(async (message: string, version: number) => {
    if (!mountedRef.current || walletVersion.current !== version) return false
    const accepted = await confirmSecurityMessageViaDialog(message, (cancel) => {
      cancelConfirmation.current = cancel
    })
    if (!accepted || !mountedRef.current || walletVersion.current !== version) return false
    const liveAddress = await verifyAccount()
    return mountedRef.current && walletVersion.current === version && liveAddress?.toLowerCase() === address?.toLowerCase()
  }, [address, verifyAccount])

  const connectChain = useCallback(
    async (targetChainId: ConnectAWalletChainId): Promise<void> => {
      if (busyRef.current || !secondaryAddress || !isConnected || !provider || !address) return
      if (chainLinks.find((row) => row.chainId === targetChainId)?.status !== 'not_connected') return
      busyRef.current = true
      setIsBusy(true)
      const version = walletVersion.current
      const previousStatus = chainLinks.find((row) => row.chainId === targetChainId)?.status ?? 'not_connected'
      setRowStatus(targetChainId, 'connecting')

      const toastId = createToast({
        message: `Linking on ${CHAIN_NAMES[targetChainId]}…`,
        status: 'pending',
        duration: 0,
      })

      try {
        await switchWalletToChain(targetChainId)
        if (!mountedRef.current || walletVersion.current !== version) throw new Error('Wallet changed')
        const sdk = createIdentitySdkForChain(targetChainId)
        if (!sdk) throw new Error('Unable to initialize SDK clients for target chain')

        let transactionHash: string | undefined
        const receipt = await sdk.connectAccount(secondaryAddress, {
          onSecurityMessage: (message) => confirmForWallet(message, version),
          onHash: (hash: `0x${string}`) => {
            transactionHash = hash
          },
        })
        if (receipt.status !== 'success') throw new Error('Transaction reverted')

        if (!mountedRef.current || walletVersion.current !== version) {
          updateToast(toastId, { message: 'Wallet changed. Check the address status again.', status: 'error', duration: 3200 })
          return
        }
        closeDialog()
        setRowStatus(targetChainId, 'connected')
        updateToast(toastId, {
          message: `Linked on ${CHAIN_NAMES[targetChainId]}`,
          status: 'success',
          duration: 3200,
        })
        onLinkSuccess?.({ address: secondaryAddress, chainId: targetChainId, transactionHash })
      } catch (err: unknown) {
        closeDialog()
        if (mountedRef.current && walletVersion.current === version) setRowStatus(targetChainId, previousStatus)
        updateToast(toastId, {
          message: `Failed to link on ${CHAIN_NAMES[targetChainId]}: ${humanReadableError(err)}`,
          status: 'error',
          duration: 0,
        })
        if (mountedRef.current && walletVersion.current === version) onLinkError?.({
          address: secondaryAddress,
          chainId: targetChainId,
          message: humanReadableError(err),
        })
      } finally {
        busyRef.current = false
        if (mountedRef.current) setIsBusy(false)
      }
    },
    [secondaryAddress, chainLinks, setRowStatus, switchWalletToChain, createIdentitySdkForChain, onLinkSuccess, onLinkError, isConnected, provider, address, confirmForWallet],
  )

  const disconnectChain = useCallback(
    async (targetChainId: ConnectAWalletChainId): Promise<void> => {
      if (busyRef.current || !secondaryAddress || !isConnected || !provider || !address) return
      if (chainLinks.find((row) => row.chainId === targetChainId)?.status !== 'connected') return
      busyRef.current = true
      setIsBusy(true)
      const version = walletVersion.current
      const previousStatus = chainLinks.find((row) => row.chainId === targetChainId)?.status ?? 'connected'
      setRowStatus(targetChainId, 'disconnecting')

      const toastId = createToast({
        message: `Unlinking on ${CHAIN_NAMES[targetChainId]}…`,
        status: 'pending',
        duration: 0,
      })

      try {
        await switchWalletToChain(targetChainId)
        if (!mountedRef.current || walletVersion.current !== version) throw new Error('Wallet changed')
        const sdk = createIdentitySdkForChain(targetChainId)
        if (!sdk) throw new Error('Unable to initialize SDK clients for target chain')

        let transactionHash: string | undefined
        const receipt = await sdk.disconnectAccount(secondaryAddress, {
          onSecurityMessage: (message) => confirmForWallet(message, version),
          onHash: (hash: `0x${string}`) => {
            transactionHash = hash
          },
        })
        if (receipt.status !== 'success') throw new Error('Transaction reverted')

        if (!mountedRef.current || walletVersion.current !== version) {
          updateToast(toastId, { message: 'Wallet changed. Check the address status again.', status: 'error', duration: 3200 })
          return
        }
        closeDialog()
        setRowStatus(targetChainId, 'not_connected')
        updateToast(toastId, {
          message: `Unlinked on ${CHAIN_NAMES[targetChainId]}`,
          status: 'success',
          duration: 3200,
        })
        onUnlinkSuccess?.({ address: secondaryAddress, chainId: targetChainId, transactionHash })
      } catch (err: unknown) {
        closeDialog()
        if (mountedRef.current && walletVersion.current === version) setRowStatus(targetChainId, previousStatus)
        updateToast(toastId, {
          message: `Failed to unlink on ${CHAIN_NAMES[targetChainId]}: ${humanReadableError(err)}`,
          status: 'error',
          duration: 0,
        })
        if (mountedRef.current && walletVersion.current === version) onLinkError?.({
          address: secondaryAddress,
          chainId: targetChainId,
          message: humanReadableError(err),
        })
      } finally {
        busyRef.current = false
        if (mountedRef.current) setIsBusy(false)
      }
    },
    [secondaryAddress, chainLinks, setRowStatus, switchWalletToChain, createIdentitySdkForChain, onUnlinkSuccess, onLinkError, isConnected, provider, address, confirmForWallet],
  )

  // Reset to not_connected / connected_no_input whenever wallet identity changes.
  useEffect(() => {
    walletVersion.current += 1
    cancelConfirmation.current?.()
    setSecondaryAddress(null)
    setSecondaryAddressInputState('')
    setAddressError(null)
    setError(null)
    if (!isConnected || !provider) {
      setStatus('not_connected')
      return
    }
    setStatus('connected_no_input')
  }, [isConnected, address, provider])

  const state: ConnectAWalletWidgetAdapterState = useMemo(
    () => ({
      isWalletConnected: isConnected && !!provider,
      walletAddress: address ?? null,
      activeChainId: chainId ?? null,
      isActiveChainSupported,
      status: isConnectingWallet ? 'connecting' : status,
      error,
      addressError,
      isBusy,
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
      addressError,
      isBusy,
      provider,
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
      changeSecondaryAddress,
      connectChain,
      disconnectChain,
    }),
    [
      handleConnectWallet,
      setSecondaryAddressInput,
      checkSecondaryAddress,
      changeSecondaryAddress,
      connectChain,
      disconnectChain,
    ],
  )

  return { state, actions }
}
