import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  http,
  parseAbi,
  parseUnits,
  type Address,
  type Chain,
} from 'viem'
import {
  MockAiCreditsBackendClient,
  ProductionAiCreditsBackendClient,
} from './mockBackendClient'
import type { AiCreditsBackendClient } from './mockBackendClient'
import type {
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterResult,
  AiCreditsWidgetAdapterState,
  AiCreditsWidgetEnvironment,
  AiCreditsPaySuccessDetail,
  AiCreditsPayErrorDetail,
  AiCreditsQuote,
} from './widgetRuntimeContract'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Celo mainnet chain ID — the payer chain */
const CELO_CHAIN_ID = 42220

/** Minimum G$ deposit amount in formatted units */
const MIN_DEPOSIT_AMOUNT = '1'

/** Minimum G$ stream amount in formatted units */
const MIN_STREAM_AMOUNT = '1'

/** AntseedBuyerOperator contract address on Base (settlement chain) */
const ANTSEED_BUYER_OPERATOR_ADDRESS: Address = '0x0000000000000000000000000000000000000001'

/** G$ token contract on Celo */
const G_TOKEN_CELO_ADDRESS: Address = '0x62B8B11039FcfE5aB0C56E502b1C372A3d462a4'

const G_TOKEN_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
])

const CELO_CHAIN: Chain = {
  id: CELO_CHAIN_ID,
  name: 'Celo',
  nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://forno.celo.org'] },
    public: { http: ['https://forno.celo.org'] },
  },
}

// ---------------------------------------------------------------------------
// EIP-712 domain and type definitions for AntseedBuyerOperator consent
// ---------------------------------------------------------------------------

const EIP712_DOMAIN = {
  name: 'AntseedBuyerOperator',
  version: '1',
  chainId: 8453, // Base — where credits settle
}

const EIP712_TYPES = {
  OperatorConsent: [
    { name: 'buyerKey', type: 'address' },
    { name: 'operator', type: 'address' },
    { name: 'nonce', type: 'uint256' },
  ],
}

// ---------------------------------------------------------------------------
// Initial adapter state
// ---------------------------------------------------------------------------

const INITIAL_STATE: AiCreditsWidgetAdapterState = {
  status: 'disconnected',
  address: null,
  chainId: null,
  gBalance: null,
  aiCreditsBalance: null,
  isGoodIdVerified: false,
  buyerKey: null,
  buyerKeyConfirmed: false,
  operatorConsentSigned: false,
  depositAmount: MIN_DEPOSIT_AMOUNT,
  streamAmount: '0',
  bonusPercent: 10,
  quote: null,
  setupSnippet: null,
  usageLog: [],
  error: null,
  primaryAction: 'connect',
  primaryLabel: 'Connect Wallet',
}

// ---------------------------------------------------------------------------
// Helper: derive next status from current wallet + widget data
// ---------------------------------------------------------------------------

function deriveStatus(params: {
  isConnected: boolean
  chainId: number | null
  gBalance: string | null
  aiCreditsBalance: string | null
  buyerKey: string | null
  buyerKeyConfirmed: boolean
  operatorConsentSigned: boolean
  depositAmount: string
  streamAmount: string
  error: string | null
  currentStatus: AiCreditsWidgetAdapterState['status']
}): AiCreditsWidgetAdapterState['status'] {
  const {
    isConnected,
    chainId,
    gBalance,
    aiCreditsBalance,
    buyerKey,
    buyerKeyConfirmed,
    operatorConsentSigned,
    depositAmount,
    streamAmount,
    error,
    currentStatus,
  } = params

  // Preserve terminal states set explicitly by action handlers
  if (
    currentStatus === 'payment_pending' ||
    currentStatus === 'payment_confirmed' ||
    currentStatus === 'payment_failed' ||
    currentStatus === 'backend_unavailable'
  ) {
    return currentStatus
  }

  if (!isConnected) return 'disconnected'

  if (chainId !== null && chainId !== CELO_CHAIN_ID) return 'unsupported_chain'

  if (error && currentStatus !== 'has_credits' && currentStatus !== 'usage_active') {
    return 'payment_failed'
  }

  if (aiCreditsBalance !== null) {
    const credits = Number.parseFloat(aiCreditsBalance)
    if (credits > 0) return 'usage_active'
    if (currentStatus === 'has_credits') return 'usage_empty'
    if (credits === 0 && currentStatus === 'usage_active') return 'usage_empty'
  }

  if (gBalance === null) return 'connected_empty'

  const balance = Number.parseFloat(gBalance)
  if (balance <= 0) return 'connected_empty'

  const deposit = Number.parseFloat(depositAmount)
  const stream = Number.parseFloat(streamAmount)
  const minDeposit = Number.parseFloat(MIN_DEPOSIT_AMOUNT)
  const minStream = Number.parseFloat(MIN_STREAM_AMOUNT)

  if (balance < minDeposit) return 'insufficient_g_balance'

  const hasValidDeposit = deposit >= minDeposit
  const hasValidStream = stream === 0 || stream >= minStream

  if (!buyerKey) return 'connected_empty'
  if (!buyerKeyConfirmed) return 'connected_empty'
  if (!operatorConsentSigned) return 'connected_empty'

  if (hasValidDeposit && hasValidStream) return 'quote_ready'

  return 'connected_empty'
}

// ---------------------------------------------------------------------------
// Helper: derive primary action and label from current status
// ---------------------------------------------------------------------------

function derivePrimaryAction(
  status: AiCreditsWidgetAdapterState['status'],
): AiCreditsWidgetAdapterState['primaryAction'] {
  switch (status) {
    case 'disconnected':
      return 'connect'
    case 'unsupported_chain':
      return 'switch_chain'
    case 'connected_empty':
      return 'generate_key'
    case 'quote_ready':
      return 'pay'
    case 'payment_pending':
    case 'payment_confirmed':
      return 'none'
    case 'payment_failed':
    case 'backend_unavailable':
      return 'retry'
    case 'has_credits':
    case 'usage_active':
    case 'usage_empty':
      return 'refresh'
    case 'insufficient_g_balance':
    case 'insufficient_ai_credits':
      return 'refresh'
    default:
      return 'none'
  }
}

function derivePrimaryLabel(action: AiCreditsWidgetAdapterState['primaryAction']): string {
  switch (action) {
    case 'connect':
      return 'Connect Wallet'
    case 'switch_chain':
      return 'Switch to Celo'
    case 'generate_key':
      return 'Set Up Buyer Key'
    case 'sign_consent':
      return 'Sign Consent'
    case 'pay':
      return 'Buy AI Credits'
    case 'retry':
      return 'Retry'
    case 'refresh':
      return 'Refresh'
    default:
      return ''
  }
}

// ---------------------------------------------------------------------------
// Adapter hook options
// ---------------------------------------------------------------------------

export interface UseAiCreditsAdapterOptions {
  environment?: AiCreditsWidgetEnvironment
  backendUrl?: string
  onPaySuccess?: (detail: AiCreditsPaySuccessDetail) => void
  onPayError?: (detail: AiCreditsPayErrorDetail) => void
}

// ---------------------------------------------------------------------------
// Main adapter hook
// ---------------------------------------------------------------------------

export function useAiCreditsAdapter({
  backendUrl,
  onPaySuccess,
  onPayError,
}: UseAiCreditsAdapterOptions): AiCreditsWidgetAdapterResult {
  const { address, chainId, isConnected, provider, connect } = useWallet()
  const [state, setState] = useState<AiCreditsWidgetAdapterState>(INITIAL_STATE)

  // Stable ref to latest provider to avoid stale closures in async callbacks
  const providerRef = useRef<EIP1193Provider | null>(null)
  providerRef.current = provider as EIP1193Provider | null

  // Instantiate the correct backend client once — mock if no backendUrl, production otherwise
  const backendClient = useMemo<AiCreditsBackendClient>(() => {
    if (!backendUrl) {
      return new MockAiCreditsBackendClient({ isGoodIdVerified: false })
    }
    return new ProductionAiCreditsBackendClient(backendUrl)
  }, [backendUrl])

  // ---------------------------------------------------------------------------
  // Load G$ balance whenever wallet state changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isConnected || !address) {
      setState((prev) => ({ ...prev, gBalance: null, status: 'disconnected' }))
      return
    }

    let cancelled = false

    async function loadBalance() {
      try {
        const publicClient = createPublicClient({ chain: CELO_CHAIN, transport: http() })
        const [rawBalance, decimals] = await Promise.all([
          publicClient.readContract({
            address: G_TOKEN_CELO_ADDRESS,
            abi: G_TOKEN_ABI,
            functionName: 'balanceOf',
            args: [address as Address],
          }),
          publicClient.readContract({
            address: G_TOKEN_CELO_ADDRESS,
            abi: G_TOKEN_ABI,
            functionName: 'decimals',
          }),
        ])

        if (cancelled) return

        const formatted = formatUnits(rawBalance as bigint, decimals as number)
        setState((prev) => {
          const nextStatus = deriveStatus({
            isConnected: true,
            chainId,
            gBalance: formatted,
            aiCreditsBalance: prev.aiCreditsBalance,
            buyerKey: prev.buyerKey,
            buyerKeyConfirmed: prev.buyerKeyConfirmed,
            operatorConsentSigned: prev.operatorConsentSigned,
            depositAmount: prev.depositAmount,
            streamAmount: prev.streamAmount,
            error: prev.error,
            currentStatus: prev.status,
          })
          const primaryAction = derivePrimaryAction(nextStatus)
          return {
            ...prev,
            address,
            chainId,
            gBalance: formatted,
            status: nextStatus,
            primaryAction,
            primaryLabel: derivePrimaryLabel(primaryAction),
          }
        })
      } catch {
        if (cancelled) return
        setState((prev) => ({
          ...prev,
          address,
          chainId,
          gBalance: '0',
          status:
            chainId !== null && chainId !== CELO_CHAIN_ID ? 'unsupported_chain' : 'connected_empty',
          primaryAction: chainId !== null && chainId !== CELO_CHAIN_ID ? 'switch_chain' : 'generate_key',
          primaryLabel:
            chainId !== null && chainId !== CELO_CHAIN_ID ? 'Switch to Celo' : 'Set Up Buyer Key',
        }))
      }
    }

    void loadBalance()
    return () => {
      cancelled = true
    }
  }, [isConnected, address, chainId])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleConnect = useCallback(async () => {
    await connect()
  }, [connect])

  const handleSwitchChain = useCallback(async () => {
    const prov = providerRef.current
    if (!prov) return
    await (prov as { request: (args: { method: string; params: unknown[] }) => Promise<unknown> }).request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${CELO_CHAIN_ID.toString(16)}` }],
    })
  }, [])

  const handleGenerateBuyerKey = useCallback(() => {
    // Generate a random 32-byte private key and derive its address for use as buyer key.
    // The private key is intentionally discarded — only the derived address is stored,
    // since the buyer key address is what AntseedBuyerOperator references on-chain.
    const randomBytes = crypto.getRandomValues(new Uint8Array(32))
    const hex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    const buyerKey = `0x${hex.slice(0, 40)}` // Use first 20 bytes as a pseudo-address

    setState((prev) => ({
      ...prev,
      buyerKey,
      buyerKeyConfirmed: false,
      operatorConsentSigned: false,
    }))
  }, [])

  const handlePasteBuyerKey = useCallback((key: string) => {
    const normalized = key.trim().toLowerCase().startsWith('0x') ? key.trim() : `0x${key.trim()}`
    setState((prev) => ({
      ...prev,
      buyerKey: normalized,
      buyerKeyConfirmed: true, // User-provided keys are pre-confirmed
      operatorConsentSigned: false,
    }))
  }, [])

  const handleConfirmBuyerKey = useCallback(() => {
    setState((prev) => ({ ...prev, buyerKeyConfirmed: true }))
  }, [])

  const handleSignOperatorConsent = useCallback(async () => {
    const currentState = state
    if (!currentState.buyerKey || !currentState.address || !providerRef.current) return

    try {
      const walletClient = createWalletClient({
        account: currentState.address as Address,
        chain: CELO_CHAIN,
        transport: custom(providerRef.current),
      })

      // Sign EIP-712 typed data in-browser; private key never leaves the browser
      await walletClient.signTypedData({
        domain: EIP712_DOMAIN,
        types: EIP712_TYPES,
        primaryType: 'OperatorConsent',
        message: {
          buyerKey: currentState.buyerKey as Address,
          operator: ANTSEED_BUYER_OPERATOR_ADDRESS,
          nonce: BigInt(Date.now()),
        },
      })

      setState((prev) => {
        const nextStatus = deriveStatus({
          isConnected: true,
          chainId: prev.chainId,
          gBalance: prev.gBalance,
          aiCreditsBalance: prev.aiCreditsBalance,
          buyerKey: prev.buyerKey,
          buyerKeyConfirmed: true,
          operatorConsentSigned: true,
          depositAmount: prev.depositAmount,
          streamAmount: prev.streamAmount,
          error: null,
          currentStatus: 'connected_empty',
        })
        const primaryAction = derivePrimaryAction(nextStatus)
        return {
          ...prev,
          operatorConsentSigned: true,
          error: null,
          status: nextStatus,
          primaryAction,
          primaryLabel: derivePrimaryLabel(primaryAction),
        }
      })
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Consent signature rejected',
      }))
    }
  }, [state])

  const handleSetDepositAmount = useCallback((amount: string) => {
    setState((prev) => {
      const nextStatus = deriveStatus({
        isConnected: true,
        chainId: prev.chainId,
        gBalance: prev.gBalance,
        aiCreditsBalance: prev.aiCreditsBalance,
        buyerKey: prev.buyerKey,
        buyerKeyConfirmed: prev.buyerKeyConfirmed,
        operatorConsentSigned: prev.operatorConsentSigned,
        depositAmount: amount,
        streamAmount: prev.streamAmount,
        error: prev.error,
        currentStatus: prev.status === 'payment_pending' ? 'payment_pending' : 'connected_empty',
      })
      const primaryAction = derivePrimaryAction(nextStatus)
      return {
        ...prev,
        depositAmount: amount,
        quote: null,
        status: nextStatus,
        primaryAction,
        primaryLabel: derivePrimaryLabel(primaryAction),
      }
    })
  }, [])

  const handleSetStreamAmount = useCallback((amount: string) => {
    setState((prev) => {
      const bonusPercent = Number.parseFloat(amount) > 0 && prev.isGoodIdVerified ? 20 : 10
      const nextStatus = deriveStatus({
        isConnected: true,
        chainId: prev.chainId,
        gBalance: prev.gBalance,
        aiCreditsBalance: prev.aiCreditsBalance,
        buyerKey: prev.buyerKey,
        buyerKeyConfirmed: prev.buyerKeyConfirmed,
        operatorConsentSigned: prev.operatorConsentSigned,
        depositAmount: prev.depositAmount,
        streamAmount: amount,
        error: prev.error,
        currentStatus: prev.status === 'payment_pending' ? 'payment_pending' : 'connected_empty',
      })
      const primaryAction = derivePrimaryAction(nextStatus)
      return {
        ...prev,
        streamAmount: amount,
        bonusPercent,
        quote: null,
        status: nextStatus,
        primaryAction,
        primaryLabel: derivePrimaryLabel(primaryAction),
      }
    })
  }, [])

  const handlePay = useCallback(async () => {
    const currentState = state

    if (!currentState.address || !currentState.buyerKey || !providerRef.current) return

    // Fetch a fresh quote before sending the transaction
    let quote: AiCreditsQuote
    try {
      quote = await backendClient.getQuote(
        currentState.address,
        currentState.depositAmount,
        currentState.streamAmount,
      )
    } catch {
      setState((prev) => ({
        ...prev,
        status: 'backend_unavailable',
        primaryAction: 'retry',
        primaryLabel: 'Retry',
        error: 'Backend unavailable — could not fetch quote',
      }))
      return
    }

    setState((prev) => ({
      ...prev,
      quote,
      status: 'payment_pending',
      primaryAction: 'none',
      primaryLabel: 'Processing…',
      error: null,
    }))

    try {
      const walletClient = createWalletClient({
        account: currentState.address as Address,
        chain: CELO_CHAIN,
        transport: custom(providerRef.current),
      })

      // Build the G$ transfer transaction to the AntseedBuyerOperator contract
      const totalG = Number.parseFloat(currentState.depositAmount) + Number.parseFloat(currentState.streamAmount)
      const amountWei = parseUnits(totalG.toFixed(2), 18)

      const txHash = await walletClient.writeContract({
        address: G_TOKEN_CELO_ADDRESS,
        abi: G_TOKEN_ABI,
        functionName: 'transfer',
        args: [ANTSEED_BUYER_OPERATOR_ADDRESS, amountWei],
      })

      setState((prev) => ({
        ...prev,
        status: 'payment_confirmed',
        primaryAction: 'none',
        primaryLabel: 'Settling…',
      }))

      // Notify backend and wait for Base settlement
      await backendClient.notifyPayment(currentState.buyerKey, txHash)
      const { credits } = await backendClient.waitForSettlement(currentState.buyerKey)

      const setupSnippet = buildSetupSnippet(currentState.buyerKey)

      setState((prev) => ({
        ...prev,
        aiCreditsBalance: credits,
        setupSnippet,
        status: 'has_credits',
        primaryAction: 'refresh',
        primaryLabel: 'Refresh',
        error: null,
      }))

      onPaySuccess?.({
        address: currentState.address!,
        chainId: CELO_CHAIN_ID,
        transactionHash: txHash,
        buyerKey: currentState.buyerKey,
        creditsReceived: credits,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed'
      setState((prev) => ({
        ...prev,
        status: 'payment_failed',
        primaryAction: 'retry',
        primaryLabel: 'Retry',
        error: message,
      }))
      onPayError?.({
        address: currentState.address,
        chainId: CELO_CHAIN_ID,
        message,
      })
    }
  }, [state, backendClient, onPaySuccess, onPayError])

  const handleRefresh = useCallback(async () => {
    const currentState = state
    if (!currentState.buyerKey) return

    try {
      const [balance, usageLog] = await Promise.all([
        backendClient.getCreditsBalance(currentState.buyerKey),
        backendClient.getUsageLog(currentState.buyerKey),
      ])

      setState((prev) => {
        const credits = Number.parseFloat(balance)
        const nextStatus = credits > 0 ? 'usage_active' : 'usage_empty'
        const primaryAction = derivePrimaryAction(nextStatus)
        return {
          ...prev,
          aiCreditsBalance: balance,
          usageLog,
          status: nextStatus,
          primaryAction,
          primaryLabel: derivePrimaryLabel(primaryAction),
        }
      })
    } catch {
      setState((prev) => ({
        ...prev,
        status: 'backend_unavailable',
        primaryAction: 'retry',
        primaryLabel: 'Retry',
        error: 'Could not reach backend — check your connection',
      }))
    }
  }, [state, backendClient])

  const handleRetry = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      status: 'connected_empty',
      error: null,
      primaryAction: 'generate_key',
      primaryLabel: 'Set Up Buyer Key',
    }))
  }, [])

  // ---------------------------------------------------------------------------
  // Stable actions object
  // ---------------------------------------------------------------------------

  const actions: AiCreditsWidgetAdapterActions = useMemo(
    () => ({
      connect: handleConnect,
      switchChain: handleSwitchChain,
      generateBuyerKey: handleGenerateBuyerKey,
      pasteBuyerKey: handlePasteBuyerKey,
      confirmBuyerKey: handleConfirmBuyerKey,
      signOperatorConsent: handleSignOperatorConsent,
      setDepositAmount: handleSetDepositAmount,
      setStreamAmount: handleSetStreamAmount,
      pay: handlePay,
      refresh: handleRefresh,
      retry: handleRetry,
    }),
    [
      handleConnect,
      handleSwitchChain,
      handleGenerateBuyerKey,
      handlePasteBuyerKey,
      handleConfirmBuyerKey,
      handleSignOperatorConsent,
      handleSetDepositAmount,
      handleSetStreamAmount,
      handlePay,
      handleRefresh,
      handleRetry,
    ],
  )

  return { state, actions }
}

// ---------------------------------------------------------------------------
// Helper: build the copyable API setup snippet shown after first purchase
// ---------------------------------------------------------------------------

function buildSetupSnippet(buyerKey: string): string {
  return `# AntSeed API Configuration
# Add these to your Cursor / Cline / VS Code Copilot settings:

ANTSEED_API_KEY="${buyerKey}"
ANTSEED_BASE_URL="https://api.antseed.xyz/v1"

# Example (Cursor settings.json):
# {
#   "antseed.apiKey": "${buyerKey}",
#   "antseed.baseUrl": "https://api.antseed.xyz/v1"
# }`
}
