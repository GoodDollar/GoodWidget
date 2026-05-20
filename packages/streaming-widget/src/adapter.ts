import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '@goodwidget/core'
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  parseUnits,
  type Chain,
} from 'viem'
import {
  StreamingSDK,
  GdaSDK,
  SupportedChains,
  calculateFlowRate,
  isSupportedChain,
  SubgraphClient,
} from '@goodsdks/streaming-sdk'
import type { Address } from 'viem'
import type { GDAPool, StreamInfo } from '@goodsdks/streaming-sdk'
import type {
  StreamingWidgetAdapterResult,
  StreamingWidgetAdapterState,
  StreamingWidgetAdapterActions,
  StreamingWidgetEnvironment,
  StreamListItem,
  PoolMembershipItem,
  SetStreamFormState,
  WriteStatus,
} from './widgetRuntimeContract'

// ---------------------------------------------------------------------------
// Minimal GDA Pool ABI for claimAll and getClaimableNow
// ---------------------------------------------------------------------------
const GDA_POOL_ABI = [
  {
    name: 'claimAll',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'pool', type: 'address' },
      { name: 'memberAddress', type: 'address' },
      { name: 'userData', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'getClaimableNow',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'member', type: 'address' }],
    outputs: [{ name: 'claimable', type: 'uint256' }],
  },
] as const

// ---------------------------------------------------------------------------
// Chain descriptors for Superfluid-supported chains (Celo and Base)
// ---------------------------------------------------------------------------
const VIEM_CHAINS: Record<number, Chain> = {
  [SupportedChains.CELO]: {
    id: SupportedChains.CELO,
    name: 'Celo',
    nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
    rpcUrls: { default: { http: ['https://forno.celo.org'] } },
  } as Chain,
  [SupportedChains.BASE]: {
    id: SupportedChains.BASE,
    name: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://mainnet.base.org'] } },
  } as Chain,
}

// ---------------------------------------------------------------------------
// Default form state — used on first render and after reset
// ---------------------------------------------------------------------------
const DEFAULT_FORM_STATE: SetStreamFormState = {
  receiver: '',
  amount: '',
  timeUnit: 'month',
  flowRate: null,
  validationError: null,
}

// ---------------------------------------------------------------------------
// humanReadableError — maps raw SDK/viem errors to user-facing strings
// ---------------------------------------------------------------------------
function humanReadableError(err: unknown): string {
  console.error('[StreamingWidget]', err)

  if (!(err instanceof Error)) {
    console.error('[StreamingWidget] non-Error thrown:', typeof err, err)
    return 'Something went wrong. Please try again.'
  }

  const msg = err.message

  // Network-level failures
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('NetworkError') ||
    msg.includes('net::ERR_') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT')
  ) {
    return 'Unable to reach the network. Check your connection and try again.'
  }

  // Timeout
  if (msg.includes('timeout') || msg.includes('Timeout') || msg.includes('timed out')) {
    return 'The request timed out. Please try again.'
  }

  // User rejected transaction
  if (
    msg.includes('User rejected') ||
    msg.includes('user rejected') ||
    msg.includes('4001') ||
    msg.includes('ACTION_REJECTED')
  ) {
    return 'Transaction cancelled by wallet.'
  }

  // Insufficient funds
  if (msg.includes('insufficient funds') || msg.includes('InsufficientFunds')) {
    return 'Insufficient funds to complete this transaction.'
  }

  // Contract revert — extract reason if available
  if (msg.includes('reverted') || msg.includes('revert')) {
    const reasonMatch = msg.match(/reason:\s*(.+?)(?:\n|$)/)
    if (reasonMatch) {
      const reason = reasonMatch[1].replace(/[^\x20-\x7E]/g, '').trim().slice(0, 80)
      if (reason) return `Transaction failed: ${reason}`
    }
    return 'Transaction was reverted. Please try again.'
  }

  // Unsupported chain
  if (msg.includes('unsupported chain') || msg.includes('Unsupported chain')) {
    return 'This network is not supported. Please switch to a supported chain.'
  }

  // Token not available
  if (msg.includes('Token address not available')) {
    return 'This token is not available on the current chain.'
  }

  return 'Something went wrong. Please try again.'
}

// ---------------------------------------------------------------------------
// Adapter options
// ---------------------------------------------------------------------------
export interface UseStreamingAdapterOptions {
  environment?: StreamingWidgetEnvironment
  apiKey?: string
}

// ---------------------------------------------------------------------------
// Derive StreamListItem from the SDK StreamInfo
// ---------------------------------------------------------------------------
function toStreamListItem(stream: StreamInfo, address: Address): StreamListItem {
  const direction =
    stream.sender.toLowerCase() === address.toLowerCase() ? 'outgoing' : 'incoming'
  return {
    id: `${stream.sender}-${stream.receiver}-${stream.token}`,
    sender: stream.sender,
    receiver: stream.receiver,
    token: stream.token,
    flowRate: stream.flowRate,
    streamedSoFar: stream.streamedSoFar ?? 0n,
    createdAtTimestamp: stream.timestamp ? Number(stream.timestamp) : 0,
    updatedAtTimestamp: stream.timestamp ? Number(stream.timestamp) : 0,
    direction,
  }
}

// ---------------------------------------------------------------------------
// Derive PoolMembershipItem from the SDK GDAPool
// ---------------------------------------------------------------------------
function toPoolMembershipItem(pool: GDAPool, claimableAmount = 0n): PoolMembershipItem {
  return {
    poolId: pool.id,
    poolToken: pool.token,
    totalUnits: pool.totalUnits,
    totalAmountClaimed: pool.totalAmountClaimed,
    claimableAmount,
    isConnected: pool.isConnected ?? false,
  }
}

// ---------------------------------------------------------------------------
// Validate the set-stream form and compute the derived flowRate
// ---------------------------------------------------------------------------
function validateSetStreamForm(form: SetStreamFormState): SetStreamFormState {
  const trimmedReceiver = form.receiver.trim()
  const trimmedAmount = form.amount.trim()

  if (!trimmedReceiver) {
    return { ...form, flowRate: null, validationError: 'Recipient address is required.' }
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(trimmedReceiver)) {
    return {
      ...form,
      flowRate: null,
      validationError: 'Recipient must be a valid Ethereum address (0x…).',
    }
  }

  if (!trimmedAmount || Number.isNaN(Number(trimmedAmount)) || Number(trimmedAmount) <= 0) {
    return { ...form, flowRate: null, validationError: 'Enter a positive flow amount.' }
  }

  try {
    const amountWei = parseUnits(trimmedAmount, 18)
    const flowRate = calculateFlowRate(amountWei, form.timeUnit)
    return { ...form, flowRate, validationError: null }
  } catch {
    return { ...form, flowRate: null, validationError: 'Invalid amount.' }
  }
}

// ---------------------------------------------------------------------------
// Main adapter hook
// ---------------------------------------------------------------------------
export function useStreamingAdapter({
  environment = 'production',
  apiKey,
}: UseStreamingAdapterOptions = {}): StreamingWidgetAdapterResult {
  const { address, chainId, provider, isConnected, connect } = useWallet()

  // --- streams state ---
  const [streams, setStreams] = useState<StreamListItem[]>([])
  const [streamsLoading, setStreamsLoading] = useState(false)
  const [streamsError, setStreamsError] = useState<string | null>(null)

  // --- pools state ---
  const [pools, setPools] = useState<PoolMembershipItem[]>([])
  const [poolsLoading, setPoolsLoading] = useState(false)
  const [poolsError, setPoolsError] = useState<string | null>(null)

  // --- balance state ---
  const [superTokenBalance, setSuperTokenBalance] = useState<string | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [balanceError, setBalanceError] = useState<string | null>(null)

  // --- SUP reserve state (Base only) ---
  const [supReserveBalance, setSupReserveBalance] = useState<string | null>(null)
  const [supReserveLoading, setSupReserveLoading] = useState(false)
  const [supReserveError, setSupReserveError] = useState<string | null>(null)

  // --- set-stream form state ---
  const [setStreamForm, setSetStreamForm] = useState<SetStreamFormState>(DEFAULT_FORM_STATE)
  const [setStreamStatus, setSetStreamStatus] = useState<WriteStatus>('idle')
  const [setStreamError, setSetStreamError] = useState<string | null>(null)
  const [setStreamTxHash, setSetStreamTxHash] = useState<string | null>(null)

  // --- pool connect/disconnect state keyed by pool address ---
  const [poolConnectStatus, setPoolConnectStatus] = useState<Record<string, WriteStatus>>({})
  const [poolConnectError, setPoolConnectError] = useState<Record<string, string | null>>({})

  // --- pool claim state keyed by pool address ---
  const [poolClaimStatus, setPoolClaimStatus] = useState<Record<string, WriteStatus>>({})
  const [poolClaimError, setPoolClaimError] = useState<Record<string, string | null>>({})
  // Guard against state updates after unmount
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Chain validity
  const isWrongChain = !!chainId && !isSupportedChain(chainId)

  // ---------------------------------------------------------------------------
  // Build viem clients from the EIP-1193 provider
  // ---------------------------------------------------------------------------
  const viemClients = useMemo(() => {
    if (!provider || !chainId || !isSupportedChain(chainId)) return null

    const chain = VIEM_CHAINS[chainId]
    if (!chain) return null

    const transport = custom(provider as Parameters<typeof custom>[0])
    const publicClient = createPublicClient({ chain, transport })
    const walletClient = createWalletClient({ chain, transport })
    return { publicClient, walletClient }
  }, [provider, chainId])

  // SDK instances — recreated when clients change
  const streamingSDK = useMemo(
    () =>
      viemClients
        ? new StreamingSDK(viemClients.publicClient, viemClients.walletClient, {
            environment,
            apiKey,
          })
        : null,
    [viemClients, environment, apiKey],
  )

  const gdaSDK = useMemo(
    () =>
      viemClients
        ? new GdaSDK(viemClients.publicClient, viemClients.walletClient, {
            environment,
          })
        : null,
    [viemClients, environment],
  )

  // Subgraph client for reserve queries (Base only)
  const subgraphClient = useMemo(() => {
    if (!chainId || !isSupportedChain(chainId)) return null
    return new SubgraphClient(chainId, { apiKey })
  }, [chainId, apiKey])

  // ---------------------------------------------------------------------------
  // Fetch streams
  // ---------------------------------------------------------------------------
  const fetchStreams = useCallback(async () => {
    if (!streamingSDK || !address) return
    setStreamsLoading(true)
    setStreamsError(null)
    try {
      const result = await streamingSDK.getActiveStreams({
        account: address as Address,
        direction: 'all',
      })
      if (!mountedRef.current) return
      setStreams(result.map((s) => toStreamListItem(s, address as Address)))
    } catch (err) {
      if (!mountedRef.current) return
      setStreamsError(humanReadableError(err))
    } finally {
      if (mountedRef.current) setStreamsLoading(false)
    }
  }, [streamingSDK, address])

  // ---------------------------------------------------------------------------
  // Fetch pool memberships with claimable amounts
  // ---------------------------------------------------------------------------
  const fetchPools = useCallback(async () => {
    if (!gdaSDK || !address || !viemClients) return
    setPoolsLoading(true)
    setPoolsError(null)
    try {
      const result = await gdaSDK.getDistributionPools(address as Address)
      if (!mountedRef.current) return

      // Fetch claimable amounts for each pool in parallel
      const poolsWithClaimable = await Promise.all(
        result.map(async (pool) => {
          try {
            const claimable = await viemClients.publicClient.readContract({
              address: pool.id,
              abi: GDA_POOL_ABI,
              functionName: 'getClaimableNow',
              args: [address as Address],
            })
            return toPoolMembershipItem(pool, claimable)
          } catch {
            return toPoolMembershipItem(pool, 0n)
          }
        }),
      )
      setPools(poolsWithClaimable)
    } catch (err) {
      if (!mountedRef.current) return
      setPoolsError(humanReadableError(err))
    } finally {
      if (mountedRef.current) setPoolsLoading(false)
    }
  }, [gdaSDK, address, viemClients])

  // ---------------------------------------------------------------------------
  // Fetch Super Token balance
  // ---------------------------------------------------------------------------
  const fetchBalance = useCallback(async () => {
    if (!streamingSDK || !address) return
    setBalanceLoading(true)
    setBalanceError(null)
    try {
      const rawBalance = await streamingSDK.getSuperTokenBalance(address as Address)
      if (!mountedRef.current) return
      setSuperTokenBalance(formatUnits(rawBalance, 18))
    } catch (err) {
      if (!mountedRef.current) return
      setBalanceError(humanReadableError(err))
    } finally {
      if (mountedRef.current) setBalanceLoading(false)
    }
  }, [streamingSDK, address])

  // ---------------------------------------------------------------------------
  // Fetch SUP reserve balance (Base only)
  // ---------------------------------------------------------------------------
  const fetchSupReserve = useCallback(async () => {
    if (!subgraphClient || !address || chainId !== SupportedChains.BASE) {
      if (mountedRef.current) setSupReserveBalance(null)
      return
    }
    setSupReserveLoading(true)
    setSupReserveError(null)
    try {
      const lockers = await subgraphClient.querySUPReserves(address as Address)
      const total = lockers.reduce((sum, l) => sum + l.stakedBalance, 0n)
      if (!mountedRef.current) return
      setSupReserveBalance(formatUnits(total, 18))
    } catch (err) {
      if (!mountedRef.current) return
      setSupReserveError(humanReadableError(err))
    } finally {
      if (mountedRef.current) setSupReserveLoading(false)
    }
  }, [subgraphClient, address, chainId])

  // ---------------------------------------------------------------------------
  // Auto-fetch on wallet/chain change
  // ---------------------------------------------------------------------------
  const prevAddressRef = useRef<string | null>(null)
  const prevChainRef = useRef<number | null>(null)

  useEffect(() => {
    const addressChanged = address !== prevAddressRef.current
    const chainChanged = chainId !== prevChainRef.current
    prevAddressRef.current = address
    prevChainRef.current = chainId

    if (!isConnected || !address || isWrongChain) {
      setStreams([])
      setPools([])
      setSuperTokenBalance(null)
      setSupReserveBalance(null)
      return
    }

    if (!addressChanged && !chainChanged) return

    void fetchStreams()
    void fetchPools()
    void fetchBalance()
    void fetchSupReserve()
  }, [isConnected, address, chainId, isWrongChain, fetchStreams, fetchPools, fetchBalance, fetchSupReserve])

  // ---------------------------------------------------------------------------
  // Set-stream form update — recomputes flowRate on every change
  // ---------------------------------------------------------------------------
  const updateSetStreamForm = useCallback((partial: Partial<SetStreamFormState>) => {
    setSetStreamForm((prev) => validateSetStreamForm({ ...prev, ...partial }))
  }, [])

  // ---------------------------------------------------------------------------
  // Submit set-stream form
  // ---------------------------------------------------------------------------
  const submitSetStream = useCallback(async () => {
    if (!streamingSDK) return

    const validated = validateSetStreamForm(setStreamForm)
    setSetStreamForm(validated)

    if (!validated.flowRate || validated.validationError) return

    setSetStreamStatus('pending')
    setSetStreamError(null)
    setSetStreamTxHash(null)

    try {
      const hash = await streamingSDK.createOrUpdateStream({
        receiver: validated.receiver as Address,
        flowRate: validated.flowRate,
        onHash: (h) => setSetStreamTxHash(h),
      })
      setSetStreamTxHash(hash)
      setSetStreamStatus('success')
      // Refresh streams after a successful write
      void fetchStreams()
    } catch (err) {
      setSetStreamStatus('error')
      setSetStreamError(humanReadableError(err))
    }
  }, [streamingSDK, setStreamForm, fetchStreams])

  // ---------------------------------------------------------------------------
  // Reset set-stream form and write status
  // ---------------------------------------------------------------------------
  const resetSetStream = useCallback(() => {
    setSetStreamForm(DEFAULT_FORM_STATE)
    setSetStreamStatus('idle')
    setSetStreamError(null)
    setSetStreamTxHash(null)
  }, [])

  // ---------------------------------------------------------------------------
  // Pool connect/disconnect
  // ---------------------------------------------------------------------------
  const connectToPool = useCallback(
    async (poolAddress: Address) => {
      if (!gdaSDK) return

      setPoolConnectStatus((prev) => ({ ...prev, [poolAddress]: 'pending' }))
      setPoolConnectError((prev) => ({ ...prev, [poolAddress]: null }))

      try {
        await gdaSDK.connectToPool({
          poolAddress,
          onHash: () => {
            if (mountedRef.current) {
              setPoolConnectStatus((prev) => ({ ...prev, [poolAddress]: 'success' }))
            }
          },
        })
        setPoolConnectStatus((prev) => ({ ...prev, [poolAddress]: 'success' }))
        void fetchPools()
      } catch (err) {
        setPoolConnectStatus((prev) => ({ ...prev, [poolAddress]: 'error' }))
        setPoolConnectError((prev) => ({
          ...prev,
          [poolAddress]: humanReadableError(err),
        }))
      }
    },
    [gdaSDK, fetchPools],
  )

  const disconnectFromPool = useCallback(
    async (poolAddress: Address) => {
      if (!gdaSDK) return

      setPoolConnectStatus((prev) => ({ ...prev, [poolAddress]: 'pending' }))
      setPoolConnectError((prev) => ({ ...prev, [poolAddress]: null }))

      try {
        await gdaSDK.disconnectFromPool({
          poolAddress,
          onHash: () => {
            if (mountedRef.current) {
              setPoolConnectStatus((prev) => ({ ...prev, [poolAddress]: 'success' }))
            }
          },
        })
        setPoolConnectStatus((prev) => ({ ...prev, [poolAddress]: 'success' }))
        void fetchPools()
      } catch (err) {
        setPoolConnectStatus((prev) => ({ ...prev, [poolAddress]: 'error' }))
        setPoolConnectError((prev) => ({
          ...prev,
          [poolAddress]: humanReadableError(err),
        }))
      }
    },
    [gdaSDK, fetchPools],
  )

  // ---------------------------------------------------------------------------
  // Claim from pool — uses viem writeContract directly since GdaSDK lacks this
  // ---------------------------------------------------------------------------
  const claimFromPool = useCallback(
    async (poolAddress: Address) => {
      if (!viemClients || !address) return

      setPoolClaimStatus((prev) => ({ ...prev, [poolAddress]: 'pending' }))
      setPoolClaimError((prev) => ({ ...prev, [poolAddress]: null }))

      try {
        await viemClients.walletClient.writeContract({
          account: address as Address,
          address: poolAddress,
          abi: GDA_POOL_ABI,
          functionName: 'claimAll',
          args: [poolAddress, address as Address, '0x'],
        })
        if (!mountedRef.current) return
        setPoolClaimStatus((prev) => ({ ...prev, [poolAddress]: 'success' }))
        void fetchPools()
      } catch (err) {
        if (!mountedRef.current) return
        setPoolClaimStatus((prev) => ({ ...prev, [poolAddress]: 'error' }))
        setPoolClaimError((prev) => ({
          ...prev,
          [poolAddress]: humanReadableError(err),
        }))
      }
    },
    [viemClients, address, fetchPools],
  )

  // ---------------------------------------------------------------------------
  // Chain switch via EIP-1193
  // ---------------------------------------------------------------------------
  const switchChain = useCallback(
    async (targetChainId: number) => {
      if (!provider) return
      const hexId = `0x${targetChainId.toString(16)}`
      await (provider as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexId }],
      })
    },
    [provider],
  )

  // ---------------------------------------------------------------------------
  // Compose state and actions
  // ---------------------------------------------------------------------------
  const state: StreamingWidgetAdapterState = useMemo(
    () => ({
      isConnected,
      address: address as Address | null,
      chainId,
      isWrongChain,
      streams,
      streamsLoading,
      streamsError,
      pools,
      poolsLoading,
      poolsError,
      superTokenBalance,
      balanceLoading,
      balanceError,
      supReserveBalance,
      supReserveLoading,
      supReserveError,
      setStreamForm,
      setStreamStatus,
      setStreamError,
      setStreamTxHash,
      poolConnectStatus,
      poolConnectError,
      poolClaimStatus,
      poolClaimError,
    }),
    [
      isConnected,
      address,
      chainId,
      isWrongChain,
      streams,
      streamsLoading,
      streamsError,
      pools,
      poolsLoading,
      poolsError,
      superTokenBalance,
      balanceLoading,
      balanceError,
      supReserveBalance,
      supReserveLoading,
      supReserveError,
      setStreamForm,
      setStreamStatus,
      setStreamError,
      setStreamTxHash,
      poolConnectStatus,
      poolConnectError,
      poolClaimStatus,
      poolClaimError,
    ],
  )

  const actions: StreamingWidgetAdapterActions = useMemo(
    () => ({
      connect,
      switchChain,
      refreshStreams: fetchStreams,
      refreshPools: fetchPools,
      refreshBalance: fetchBalance,
      updateSetStreamForm,
      submitSetStream,
      resetSetStream,
      connectToPool,
      disconnectFromPool,
      claimFromPool,
    }),
    [
      connect,
      switchChain,
      fetchStreams,
      fetchPools,
      fetchBalance,
      updateSetStreamForm,
      submitSetStream,
      resetSetStream,
      connectToPool,
      disconnectFromPool,
      claimFromPool,
    ],
  )

  return { state, actions }
}
