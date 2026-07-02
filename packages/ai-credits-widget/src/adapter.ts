import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  http,
  isAddress,
  parseAbi,
  type Address,
  type Chain,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { buildBuyerKeyMessage, deriveBuyerPrivateKeyFromSignature } from './buyerKeyDerivation'
import {
  MockAiCreditsBackendClient,
  ProductionAiCreditsBackendClient,
  creditsBalanceFromStatus,
} from './mockBackendClient'
import type { AiCreditsBackendClient } from './mockBackendClient'
import { signOperatorConsentFromTypedData } from './operatorConsent'
import type { AccountRef } from './mockBackendClient'
import { executeCeloPayment, G_TOKEN_CELO_ADDRESS } from './celoPayment'
import type {
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterResult,
  AiCreditsWidgetAdapterState,
  AiCreditsWidgetEnvironment,
  AiCreditsWidgetPrimaryAction,
  AiCreditsWidgetStatus,
  AiCreditsPaySuccessDetail,
  AiCreditsPayErrorDetail,
  AiCreditsQuote,
} from './widgetRuntimeContract'

const CELO_CHAIN_ID = 42220
const MIN_DEPOSIT_AMOUNT = '1'
const MIN_STREAM_AMOUNT = '1'
const CELO_GD_ANTSEED_VAULT_FALLBACK: Address = '0x0000000000000000000000000000000000000002'

const G_TOKEN_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
])

const VAULT_ABI = parseAbi([
  'function deposit(uint256 amount, bytes calldata data) returns (uint256)',
  'function isGoodIDVerified(address account) view returns (bool)',
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

function validProfileBuyer(buyer: string | undefined): string | null {
  if (!buyer || !isAddress(buyer)) return null
  return buyer.toLowerCase()
}

function hasCredits(balance: string | null): boolean {
  return balance !== null && Number.parseFloat(balance) > 0
}

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
  currentStatus: AiCreditsWidgetStatus
}): AiCreditsWidgetStatus {
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

  if (error && currentStatus !== 'credits_account') return 'payment_failed'

  const inPurchaseFlow =
    currentStatus === 'purchase_setup' || currentStatus === 'quote_ready'

  if (!inPurchaseFlow && hasCredits(aiCreditsBalance)) return 'credits_account'

  if (gBalance === null) return 'purchase_setup'

  const balance = Number.parseFloat(gBalance)
  if (balance <= 0) return 'purchase_setup'

  const deposit = Number.parseFloat(depositAmount)
  const stream = Number.parseFloat(streamAmount)
  const minDeposit = Number.parseFloat(MIN_DEPOSIT_AMOUNT)
  const minStream = Number.parseFloat(MIN_STREAM_AMOUNT)

  if (balance < minDeposit) return 'insufficient_g_balance'

  const hasValidDeposit = deposit >= minDeposit
  const hasValidStream = stream === 0 || stream >= minStream

  if (!buyerKey || !buyerKeyConfirmed || !operatorConsentSigned) return 'purchase_setup'

  const readyToPay = (hasValidDeposit || stream >= minStream) && hasValidStream
  if (readyToPay) return 'quote_ready'

  return 'purchase_setup'
}

function derivePrimaryAction(status: AiCreditsWidgetStatus): AiCreditsWidgetPrimaryAction {
  switch (status) {
    case 'disconnected':
      return 'connect'
    case 'unsupported_chain':
      return 'switch_chain'
    case 'purchase_setup':
      return 'generate_key'
    case 'quote_ready':
      return 'pay'
    case 'payment_pending':
    case 'payment_confirmed':
      return 'none'
    case 'payment_failed':
    case 'backend_unavailable':
      return 'retry'
    case 'credits_account':
    case 'insufficient_g_balance':
      return 'refresh'
    default:
      return 'none'
  }
}

function derivePrimaryLabel(action: AiCreditsWidgetPrimaryAction): string {
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

function withDerivedStatus(
  prev: AiCreditsWidgetAdapterState,
  overrides: Partial<AiCreditsWidgetAdapterState>,
  isConnected = true,
): AiCreditsWidgetAdapterState {
  const merged = { ...prev, ...overrides }
  const status = deriveStatus({
    isConnected,
    chainId: merged.chainId,
    gBalance: merged.gBalance,
    aiCreditsBalance: merged.aiCreditsBalance,
    buyerKey: merged.buyerKey,
    buyerKeyConfirmed: merged.buyerKeyConfirmed,
    operatorConsentSigned: merged.operatorConsentSigned,
    depositAmount: merged.depositAmount,
    streamAmount: merged.streamAmount,
    error: merged.error,
    currentStatus: merged.status,
  })
  const primaryAction = derivePrimaryAction(status)
  return {
    ...merged,
    status,
    primaryAction,
    primaryLabel: derivePrimaryLabel(primaryAction),
  }
}

export interface UseAiCreditsAdapterOptions {
  environment?: AiCreditsWidgetEnvironment
  backendUrl?: string
  vaultAddress?: Address
  onPaySuccess?: (detail: AiCreditsPaySuccessDetail) => void
  onPayError?: (detail: AiCreditsPayErrorDetail) => void
}

export function useAiCreditsAdapter({
  backendUrl,
  vaultAddress,
  onPaySuccess,
  onPayError,
}: UseAiCreditsAdapterOptions): AiCreditsWidgetAdapterResult {
  const { address, chainId, isConnected, provider, connect } = useWallet()
  const [state, setState] = useState<AiCreditsWidgetAdapterState>(INITIAL_STATE)

  const providerRef = useRef<EIP1193Provider | null>(null)
  providerRef.current = provider as EIP1193Provider | null

  const backendClient = useMemo<AiCreditsBackendClient>(() => {
    if (!backendUrl) {
      return new MockAiCreditsBackendClient({ isGoodIdVerified: false })
    }
    return new ProductionAiCreditsBackendClient(backendUrl)
  }, [backendUrl])

  useEffect(() => {
    if (!isConnected || !address) {
      setState({ ...INITIAL_STATE })
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
        setState((prev) =>
          withDerivedStatus(
            prev,
            { address, chainId, gBalance: formatted, isGoodIdVerified: goodIdVerified },
            true,
          ),
        )
      } catch {
        if (cancelled) return
        setState((prev) =>
          withDerivedStatus(
            prev,
            {
              address,
              chainId,
              gBalance: '0',
              status:
                chainId !== null && chainId !== CELO_CHAIN_ID
                  ? 'unsupported_chain'
                  : 'purchase_setup',
              primaryAction:
                chainId !== null && chainId !== CELO_CHAIN_ID ? 'switch_chain' : 'generate_key',
              primaryLabel:
                chainId !== null && chainId !== CELO_CHAIN_ID ? 'Switch to Celo' : 'Set Up Buyer Key',
            },
            true,
          ),
        )
      }
    }

    void loadBalance()
    return () => {
      cancelled = true
    }
  }, [isConnected, address, chainId, vaultAddress])

  useEffect(() => {
    if (!address) return

    let cancelled = false

    async function loadPayerStatus() {
      try {
        const status = await backendClient.getPayerStatus(address!)
        if (cancelled) return

        const buyer = validProfileBuyer(status.profile.buyer)
        if (!buyer) return

        const balance = creditsBalanceFromStatus(status)

        setState((prev) =>
          withDerivedStatus(
            prev,
            {
              buyerKey: buyer,
              buyerKeyConfirmed: true,
              operatorConsentSigned: true,
              aiCreditsBalance: hasCredits(balance) ? balance : prev.aiCreditsBalance,
              setupSnippet: hasCredits(balance) ? buildSetupSnippet(buyer) : prev.setupSnippet,
            },
            true,
          ),
        )
      } catch {
      }
    }

    void loadPayerStatus()
    return () => {
      cancelled = true
    }
  }, [address, backendClient])

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

  const handleGenerateBuyerKey = useCallback(async () => {
    if (!address || !providerRef.current) {
      setState((prev) => ({
        ...prev,
        error: 'Connect your wallet before generating a buyer key',
      }))
      return
    }

    try {
      const payerAddress = address as Address
      const message = buildBuyerKeyMessage(payerAddress)
      const walletClient = createWalletClient({
        account: payerAddress,
        chain: CELO_CHAIN,
        transport: custom(providerRef.current),
      })
      const signature = await walletClient.signMessage({
        account: payerAddress,
        message,
      })
      const privateKey = deriveBuyerPrivateKeyFromSignature(signature)
      const account = privateKeyToAccount(privateKey)

      setState((prev) =>
        withDerivedStatus(
          prev,
          {
            buyerKey: account.address,
            buyerKeyPrivate: privateKey,
            buyerKeyConfirmed: false,
            operatorConsentSigned: false,
            apiKey: null,
            error: null,
            status: 'purchase_setup',
          },
          true,
        ),
      )
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Buyer key generation was rejected',
      }))
    }
  }, [address])

  const handleConfirmBuyerKey = useCallback(() => {
    setState((prev) => withDerivedStatus(prev, { buyerKeyConfirmed: true, status: 'purchase_setup' }, true))
  }, [])

  const handleSignOperatorConsent = useCallback(async () => {
    const currentState = state
    if (!currentState.address || !currentState.buyerKey || !currentState.buyerKeyPrivate) {
      setState((prev) => ({
        ...prev,
        error: 'Generate a buyer key before signing operator consent',
      }))
      return
    }

    const ref: AccountRef = { payer: currentState.address, buyer: currentState.buyerKey }

    try {
      const operatorStatus = await backendClient.getOperatorStatus(ref)

      if (!operatorStatus.enabled) {
        throw new Error('Operator consent is not available')
      }

      if (operatorStatus.operatorAccepted) {
        setState((prev) =>
          withDerivedStatus(
            prev,
            { operatorConsentSigned: true, error: null, status: 'purchase_setup' },
            true,
          ),
        )
        return
      }

      const payload = await backendClient.getOperatorConsentPayload(ref)

      if (!payload.enabled || !payload.typedData) {
        throw new Error('Operator consent is not available')
      }

      const buyerSig = await signOperatorConsentFromTypedData(
        currentState.buyerKeyPrivate as `0x${string}`,
        payload.typedData,
      )

      const result = await backendClient.acceptOperator(ref, buyerSig)

      if (!result.operator.operatorAccepted && result.message !== 'operator already accepted') {
        throw new Error('Operator consent was not accepted')
      }

      setState((prev) =>
        withDerivedStatus(
          prev,
          { operatorConsentSigned: true, error: null, status: 'purchase_setup' },
          true,
        ),
      )
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Operator consent signature rejected',
      }))
    }
  }, [state, backendClient])

  const handleSetDepositAmount = useCallback((amount: string) => {
    setState((prev) =>
      withDerivedStatus(
        prev,
        {
          depositAmount: amount,
          quote: null,
          status: prev.status === 'payment_pending' ? 'payment_pending' : 'purchase_setup',
        },
        true,
      ),
    )
  }, [])

  const handleSetStreamAmount = useCallback((amount: string) => {
    setState((prev) => {
      const bonusPercent = Number.parseFloat(amount) > 0 && prev.isGoodIdVerified ? 20 : 10
      return withDerivedStatus(
        prev,
        {
          streamAmount: amount,
          bonusPercent,
          quote: null,
          status: prev.status === 'payment_pending' ? 'payment_pending' : 'purchase_setup',
        },
        true,
      )
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

    let quote: AiCreditsQuote
    try {
      quote = await backendClient.getQuote(
        currentState.depositAmount,
        currentState.streamAmount,
        { isGoodIdVerified: currentState.isGoodIdVerified },
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

      const publicClient = createPublicClient({ chain: CELO_CHAIN, transport: http() })
      const walletClient = createWalletClient({
        account: payerAddress,
        chain: CELO_CHAIN,
        transport: custom(providerRef.current),
      })

      const { txHashes } = await executeCeloPayment({
        walletClient,
        publicClient,
        payer: payerAddress,
        buyer: buyerAddress,
        vault,
        depositAmountG,
        streamAmountG,
      })

      const txHash = txHashes[txHashes.length - 1]!

      setState((prev) => ({
        ...prev,
        status: 'payment_confirmed',
        primaryAction: 'none',
        primaryLabel: 'Settling…',
      }))

      const accountRef: AccountRef = {
        payer: currentState.address,
        buyer: currentState.buyerKey,
      }

      let balanceBefore = '0'
      try {
        balanceBefore = await backendClient.getCreditsBalance(currentState.address)
      } catch {
        balanceBefore = '0'
      }

      for (const hash of txHashes) {
        await backendClient.notifyPayment(hash)
      }
      const { credits } = await backendClient.waitForSettlement(accountRef, {
        txHashes,
        previousBalance: balanceBefore,
      })

      const setupSnippet = buildSetupSnippet(currentState.buyerKey)

      let balance = credits
      try {
        const status = await backendClient.getPayerStatus(currentState.address)
        balance = creditsBalanceFromStatus(status)
      } catch {
      }

      setState((prev) =>
        withDerivedStatus(prev, {
          aiCreditsBalance: balance,
          setupSnippet,
          error: null,
          status: 'credits_account',
          primaryAction: 'refresh',
          primaryLabel: 'Refresh',
        }),
      )

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
      const [status, usageLog] = await Promise.all([
        backendClient.getPayerStatus(currentState.address),
        backendClient.getUsageLog(currentState.address),
      ])
      const balance = creditsBalanceFromStatus(status)

      setState((prev) =>
        withDerivedStatus(
          prev,
          {
            aiCreditsBalance: balance,
            setupSnippet:
              prev.buyerKey !== null ? buildSetupSnippet(prev.buyerKey) : prev.setupSnippet,
            usageLog,
            status: hasCredits(balance) ? 'credits_account' : 'purchase_setup',
          },
          true,
        ),
      )
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
    setState((prev) =>
      withDerivedStatus(prev, { status: 'purchase_setup', error: null }, true),
    )
  }, [])

  const handleStartPurchase = useCallback(() => {
    setState((prev) =>
      withDerivedStatus(prev, { status: 'purchase_setup', error: null }, true),
    )
  }, [])

  const actions: AiCreditsWidgetAdapterActions = useMemo(
    () => ({
      connect: handleConnect,
      switchChain: handleSwitchChain,
      generateBuyerKey: handleGenerateBuyerKey,
      confirmBuyerKey: handleConfirmBuyerKey,
      signOperatorConsent: handleSignOperatorConsent,
      setDepositAmount: handleSetDepositAmount,
      setStreamAmount: handleSetStreamAmount,
      pay: handlePay,
      refresh: handleRefresh,
      startPurchase: handleStartPurchase,
      retry: handleRetry,
    }),
    [
      handleConnect,
      handleSwitchChain,
      handleGenerateBuyerKey,
      handleConfirmBuyerKey,
      handleSignOperatorConsent,
      handleSetDepositAmount,
      handleSetStreamAmount,
      handlePay,
      handleRefresh,
      handleStartPurchase,
      handleRetry,
    ],
  )

  return { state, actions }
}

function buildSetupSnippet(buyerAddress: string): string {
  return [
    'npm install -g @antseed/cli',
    '',
    'export ANTSEED_IDENTITY_HEX=<buyer-private-key>',
    '',
    'antseed buyer start',
    'antseed network browse',
    'antseed buyer connection set --peer <peer-id>',
    '',
    'export ANTHROPIC_BASE_URL=http://localhost:8377',
    'export OPENAI_BASE_URL=http://localhost:8377',
    'export OPENAI_API_KEY=placeholder',
    '',
    `GOODDOLLAR_BUYER_ADDRESS=${buyerAddress}`,
  ].join('\n')
}
