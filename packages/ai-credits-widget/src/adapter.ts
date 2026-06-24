import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeAbiParameters,
  encodeFunctionData,
  formatUnits,
  http,
  parseAbi,
  parseUnits,
  type Address,
  type Chain,
} from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import {
  MockAiCreditsBackendClient,
  ProductionAiCreditsBackendClient,
} from './mockBackendClient'
import type { AiCreditsBackendClient } from './mockBackendClient'
import { signSetOperatorConsent } from './operatorConsent'
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

/**
 * CeloGdAntSeedVault contract address on Celo.
 * Set via adapter option (from env / backend config).
 * Falls back to this placeholder until a canonical address is deployed.
 */
const CELO_GD_ANTSEED_VAULT_FALLBACK: Address = '0x0000000000000000000000000000000000000002'

/** G$ SuperToken contract on Celo mainnet */
const G_TOKEN_CELO_ADDRESS: Address = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A'

/** Multicall3 on Celo mainnet — same canonical address as all EVM chains */
const MULTICALL3_ADDRESS: Address = '0xcA11bde05977b3631167028862bE2a173976CA11'

/** Superfluid host (Framework) on Celo mainnet */
const SUPERFLUID_HOST_ADDRESS: Address = '0xA4Ff07cF81C02CFD356184879D953970cA957585'

/**
 * keccak256("org.superfluid-finance.agreements.ConstantFlowAgreement.v1")
 * Used to resolve the live CFA contract from the Superfluid host at runtime.
 */
const CFA_AGREEMENT_TYPE =
  '0x4440dbc4df02395da68f8203b0eba06f9024fa3f8dc8cbde6c8a7e68f04fa3b7' as `0x${string}`

/** Seconds in a 30-day month — used for flowRate calculation */
const SECONDS_PER_MONTH = 30n * 24n * 3600n

const G_TOKEN_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function increaseAllowance(address spender, uint256 addedValue) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transferAndCall(address to, uint256 value, bytes data) returns (bool)',
])

const VAULT_ABI = parseAbi([
  'function deposit(uint256 amount, bytes calldata data) returns (uint256)',
  'function isGoodIDVerified(address account) view returns (bool)',
])

const SUPERFLUID_HOST_ABI = parseAbi([
  'function callAgreement(address agreementClass, bytes calldata callData, bytes calldata userData) external returns (bytes memory returnedData)',
  'function getAgreementClass(bytes32 agreementType) external view returns (address agreementClass)',
])

const CFA_ABI = parseAbi([
  'function createFlow(address token, address receiver, int96 flowRate, bytes ctx) external returns (bytes newCtx)',
  'function updateFlow(address token, address receiver, int96 flowRate, bytes ctx) external returns (bytes newCtx)',
  'function getFlow(address token, address sender, address receiver) external view returns (uint256 timestamp, int96 flowRate, uint256 deposit, uint256 owedDeposit)',
])

/** Multicall3 aggregate3 ABI — uses tuple[] for the calls and results */
const MULTICALL3_ABI = [
  {
    name: 'aggregate3',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'calls',
        type: 'tuple[]',
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'callData', type: 'bytes' },
        ],
      },
    ],
    outputs: [
      {
        name: 'returnData',
        type: 'tuple[]',
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' },
        ],
      },
    ],
  },
] as const

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
  buyerKeyPrivate: null,
  buyerKeyConfirmed: false,
  operatorConsentSigned: false,
  apiKey: null,
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
  /**
   * CeloGdAntSeedVault address on Celo mainnet.
   * Pass from env (e.g. import.meta.env.VITE_AI_CREDITS_VAULT_ADDRESS).
   * Falls back to a placeholder until the vault is deployed.
   */
  vaultAddress?: Address
  onPaySuccess?: (detail: AiCreditsPaySuccessDetail) => void
  onPayError?: (detail: AiCreditsPayErrorDetail) => void
}

// ---------------------------------------------------------------------------
// Main adapter hook
// ---------------------------------------------------------------------------

export function useAiCreditsAdapter({
  backendUrl,
  vaultAddress,
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
  // Load G$ balance and GoodID status whenever wallet state changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isConnected || !address) {
      setState((prev) => ({ ...prev, gBalance: null, isGoodIdVerified: false, status: 'disconnected' }))
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

        let goodIdVerified = false
        try {
          goodIdVerified = (await publicClient.readContract({
            address: vaultAddress ?? CELO_GD_ANTSEED_VAULT_FALLBACK,
            abi: VAULT_ABI,
            functionName: 'isGoodIDVerified',
            args: [address as Address],
          })) as boolean
        } catch {
          goodIdVerified = false
        }

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
            isGoodIdVerified: goodIdVerified,
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
  }, [isConnected, address, chainId, vaultAddress])

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
    // Generate a real EIP-55 private key and derive its address.
    // The private key is shown to the user once so they can store it for AntSeed.
    // Only the derived address is sent on-chain (ABI-encoded in the vault deposit data).
    const privateKey = generatePrivateKey()
    const account = privateKeyToAccount(privateKey)

    setState((prev) => ({
      ...prev,
      buyerKey: account.address,
      buyerKeyPrivate: privateKey,
      buyerKeyConfirmed: false,
      operatorConsentSigned: false,
      apiKey: null,
    }))
  }, [])

  const handlePasteBuyerKey = useCallback((key: string) => {
    const normalized = key.trim().toLowerCase().startsWith('0x') ? key.trim() : `0x${key.trim()}`
    setState((prev) => ({
      ...prev,
      buyerKey: normalized,
      buyerKeyPrivate: null, // User-provided address — no private key available here
      buyerKeyConfirmed: true, // User-provided keys are pre-confirmed
      operatorConsentSigned: false,
      apiKey: null,
    }))
  }, [])

  const handleConfirmBuyerKey = useCallback(() => {
    setState((prev) => ({ ...prev, buyerKeyConfirmed: true }))
  }, [])

  const handleSignOperatorConsent = useCallback(async () => {
    const currentState = state
    if (!currentState.buyerKey || !currentState.buyerKeyPrivate) {
      setState((prev) => ({
        ...prev,
        error: 'Generate a buyer key before signing operator consent',
      }))
      return
    }

    try {
      const params = await backendClient.getOperatorConsentParams(currentState.buyerKey)

      if (!params.enabled) {
        throw new Error('Operator consent is not available')
      }

      if (params.alreadyAccepted) {
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
        return
      }

      const signature = await signSetOperatorConsent(
        currentState.buyerKeyPrivate as `0x${string}`,
        {
          depositsAddress: params.depositsAddress as Address,
          operatorAddress: params.operatorAddress as Address,
          chainId: params.chainId,
          nonce: BigInt(params.nonce),
        },
      )

      const result = await backendClient.submitOperatorConsent(
        currentState.buyerKey,
        params.nonce,
        signature,
      )

      if (!result.accepted) {
        throw new Error('Operator consent was not accepted')
      }

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
        error: err instanceof Error ? err.message : 'Operator consent signature rejected',
      }))
    }
  }, [state, backendClient])

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

    const depositAmountG = Number.parseFloat(currentState.depositAmount)
    const streamAmountG = Number.parseFloat(currentState.streamAmount)
    const hasDeposit = depositAmountG > 0
    const hasStream = streamAmountG > 0
    if (!hasDeposit && !hasStream) return

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
      const vault = vaultAddress ?? CELO_GD_ANTSEED_VAULT_FALLBACK
      const payerAddress = currentState.address as Address
      const buyerAddress = currentState.buyerKey as Address

      // ABI-encode buyerAddress as deposit userData — equivalent to abi.encode(buyerAddress)
      const buyerData = encodeAbiParameters([{ type: 'address' }], [buyerAddress])

      const publicClient = createPublicClient({ chain: CELO_CHAIN, transport: http() })
      const walletClient = createWalletClient({
        account: payerAddress,
        chain: CELO_CHAIN,
        transport: custom(providerRef.current),
      })

      // Ordered list of sub-calls for Multicall3 aggregate3
      const calls: Array<{ target: Address; allowFailure: boolean; callData: `0x${string}` }> = []

      // ------------------------------------------------------------------
      // Stream sub-calls (must come before deposit in aggregate3)
      // ------------------------------------------------------------------
      if (hasStream) {
        const monthlyWei = parseUnits(streamAmountG.toString(), 18)
        const flowRatePerSecond = monthlyWei / SECONDS_PER_MONTH

        // Resolve CFA address from host so we stay in sync with the live deployment
        const cfaAddress = (await publicClient.readContract({
          address: SUPERFLUID_HOST_ADDRESS,
          abi: SUPERFLUID_HOST_ABI,
          functionName: 'getAgreementClass',
          args: [CFA_AGREEMENT_TYPE],
        })) as Address

        // Increase CFA allowance only when current allowance < monthly stream budget
        const existingCfaAllowance = (await publicClient.readContract({
          address: G_TOKEN_CELO_ADDRESS,
          abi: G_TOKEN_ABI,
          functionName: 'allowance',
          args: [payerAddress, cfaAddress],
        })) as bigint

        if (existingCfaAllowance < monthlyWei) {
          const MAX_UINT256 = 2n ** 256n - 1n
          calls.push({
            target: G_TOKEN_CELO_ADDRESS,
            allowFailure: false,
            callData: encodeFunctionData({
              abi: G_TOKEN_ABI,
              functionName: 'increaseAllowance',
              args: [cfaAddress, MAX_UINT256 - existingCfaAllowance],
            }),
          })
        }

        // Determine whether to createFlow or updateFlow based on existing flow
        const flowInfo = (await publicClient.readContract({
          address: cfaAddress,
          abi: CFA_ABI,
          functionName: 'getFlow',
          args: [G_TOKEN_CELO_ADDRESS, payerAddress, vault],
        })) as readonly [bigint, bigint, bigint, bigint]
        const existingFlowRate = flowInfo[1] // int96 flowRate
        const cfaFunction = existingFlowRate !== 0n ? 'updateFlow' : 'createFlow'

        // Encode the CFA calldata — ctx is filled by the host, we pass 0x
        const cfaCalldata = encodeFunctionData({
          abi: CFA_ABI,
          functionName: cfaFunction,
          args: [G_TOKEN_CELO_ADDRESS, vault, flowRatePerSecond, '0x'],
        })

        calls.push({
          target: SUPERFLUID_HOST_ADDRESS,
          allowFailure: false,
          callData: encodeFunctionData({
            abi: SUPERFLUID_HOST_ABI,
            functionName: 'callAgreement',
            args: [cfaAddress, cfaCalldata, buyerData],
          }),
        })
      }

      // ------------------------------------------------------------------
      // One-time deposit sub-call via transferAndCall (single call, no approve)
      // ------------------------------------------------------------------
      if (hasDeposit) {
        const depositWei = parseUnits(depositAmountG.toString(), 18)
        calls.push({
          target: G_TOKEN_CELO_ADDRESS,
          allowFailure: false,
          callData: encodeFunctionData({
            abi: G_TOKEN_ABI,
            functionName: 'transferAndCall',
            args: [vault, depositWei, buyerData],
          }),
        })
      }

      // Submit all sub-calls as a single wallet confirmation via Multicall3
      const txHash = await walletClient.writeContract({
        address: MULTICALL3_ADDRESS,
        abi: MULTICALL3_ABI,
        functionName: 'aggregate3',
        args: [calls],
      })

      setState((prev) => ({
        ...prev,
        status: 'payment_confirmed',
        primaryAction: 'none',
        primaryLabel: 'Settling…',
      }))

      // Record the Celo transaction with the backend and wait for credit settlement
      await backendClient.notifyPayment(txHash)
      const { credits } = await backendClient.waitForSettlement(currentState.address)

      const setupSnippet = buildSetupSnippet(currentState.apiKey, currentState.buyerKey)

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
  }, [state, backendClient, vaultAddress, onPaySuccess, onPayError])

  const handleRefresh = useCallback(async () => {
    const currentState = state
    if (!currentState.address) return

    try {
      const [balance, usageLog] = await Promise.all([
        backendClient.getCreditsBalance(currentState.address),
        backendClient.getUsageLog(currentState.address),
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

function buildSetupSnippet(apiKey: string | null, buyerKeyAddress: string): string {
  const key = apiKey ?? '<your-api-key>'
  return `# GoodDollar AntSeed — Developer Tool Configuration
# Generated by GoodWidget after your G$ deposit on Celo.

# Your AntSeed API key (treat as a secret):
GOODDOLLAR_ANTSEED_API_KEY="${key}"

# Your buyer key address (registered in vault deposit):
GOODDOLLAR_BUYER_ADDRESS="${buyerKeyAddress}"

# OpenAI-compatible base URL:
ANTSEED_BASE_URL="https://api.antseed.xyz/v1"

# Example Cursor / Cline / Continue settings:
# {
#   "provider": "openai",
#   "model": "qwen3-235b-instruct",
#   "apiBase": "https://api.antseed.xyz/v1",
#   "apiKey": "${key}"
# }`
}
