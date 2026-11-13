import { useCallback, useMemo, useRef } from 'react'
import { useAppKit, useAppKitAccount, useAppKitNetwork, useAppKitProvider } from '@reown/appkit/react'
import type { AppKitNetwork } from '@reown/appkit/networks'
import type { EIP1193Provider } from '@goodwidget/core'
import { DEFAULT_APPKIT_NETWORKS } from './DefaultAppKitProvider'

export interface AppKitSessionOptions {
  /** Networks configured on the AppKit provider, used for programmatic switches. */
  networks?: readonly AppKitNetwork[]
  /** Wait for a provider before treating a restored connected account as resolved. Defaults to true. */
  requireProviderForConnected?: boolean
}

/**
 * Maps an AppKit session to GoodWidget wallet override props. Call under an
 * AppKit provider; disconnected and still-restoring accounts are distinct.
 */
export function useAppKitSession({
  networks = DEFAULT_APPKIT_NETWORKS,
  requireProviderForConnected = true,
}: AppKitSessionOptions = {}) {
  const { open } = useAppKit()
  const { address, status } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<EIP1193Provider | undefined>('eip155')
  const { chainId, switchNetwork, approvedCaipNetworkIds } = useAppKitNetwork()
  const addressRef = useRef(address)
  addressRef.current = address

  // AppKit reports no address both while restoring a prior session and once it
  // has settled on "no wallet". Only the second is a real override, so during
  // the unresolved window these stay undefined and the core provider's own
  // EIP-1193 tracking covers the gap.
  //
  // A restored 'connected' also needs its provider before it counts by default.
  // AppKit rehydrates the last account from storage without checking the wallet
  // behind it, so that address alone can describe a locked wallet — and the
  // widget can only catch that by asking the provider for its accounts.
  const isAccountResolved =
    status === 'disconnected' ||
    (status === 'connected' && (!requireProviderForConnected || Boolean(walletProvider)))

  // switchNetwork takes a network descriptor, not a chain id. AppKit's active
  // network is the source of truth for the current chain.
  const networksByChainId = useMemo(
    () => new Map(networks.map((network) => [Number(network.id), network])),
    [networks],
  )
  // CAIP ids look like "eip155:42220"; undefined means AppKit has not reported
  // yet, which is "no restriction known" rather than "nothing available".
  const availableChainIdsOverride = useMemo(
    () =>
      approvedCaipNetworkIds
        ? approvedCaipNetworkIds
            .map((caipId) => Number(caipId.split(':')[1]))
            .filter((id) => Number.isFinite(id))
        : null,
    [approvedCaipNetworkIds],
  )

  const connectOverride = useCallback(async () => {
    await open({ view: 'Connect' })
    if (!addressRef.current) throw new Error('wallet_connect_cancelled')
  }, [open])

  const switchChainOverride = useCallback(
    async (targetChainId: number) => {
      const targetNetwork = networksByChainId.get(targetChainId)
      if (targetNetwork) {
        try {
          await switchNetwork(targetNetwork)
          return
        } catch {
          // Fall through to the manual network selection modal.
        }
      }
      await open({ view: 'Networks' })
      // The modal only lets the user attempt the switch — it never confirms
      // one happened — so this throws rather than resolves.
      throw new Error('Select the network in the wallet dialog, then try again.')
    },
    [networksByChainId, open, switchNetwork],
  )

  return {
    provider: walletProvider,
    addressOverride: isAccountResolved ? (address ?? null) : undefined,
    chainIdOverride: isAccountResolved ? (chainId == null ? null : Number(chainId)) : undefined,
    availableChainIdsOverride,
    connectOverride,
    switchChainOverride,
    open,
  }
}
