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
  type Address,
  type Chain,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { buildBuyerKeyMessage, deriveBuyerPrivateKeyFromSignature } from './buyerKeyDerivation'
import {
  normalizeChannelId,
  signRequestClose,
  signWithdrawPrincipal,
} from './buyerSignatures'
import {
  MockAiCreditsBackendClient,
  balanceFromProfile,
  buildAccountView,
  createBackendClient,
  enrichAccountView,
  waitForOperatorConsent,
} from './backendClient'
import type { AccountEnrichment, AiCreditsBackendClient } from './backendClient'
import type { AccountRef, AccountView } from './backendTypes'
import { createChainClient, CELO_GD_ANTSEED_VAULT_ADDRESS, CELO_GOODID_ADDRESS } from './chainClient'
import type { AiCreditsChainClient } from './chainClient'
import { signOperatorConsentFromTypedData } from './operatorConsent'
import {
  addressesMatch,
  patchPayerSessionFields,
  writePayerSession,
} from './payerSession'
import { executeCeloPayment, G_TOKEN_CELO_ADDRESS } from './celoPayment'
import { fetchVaultPaymentMinimums, validateVaultPaymentAmounts } from './vaultMinimums'
import { CREDITS_PER_USD, usdDisplayToMicro } from './quoteMath'
import type {
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterResult,
  AiCreditsWidgetAdapterState,
  AiCreditsWidgetEnvironment,
  AiCreditsWidgetPrimaryAction,
  AiCreditsWidgetStatus,
  AiCreditsWidgetTab,
  AiCreditsPaySuccessDetail,
  AiCreditsPayErrorDetail,
  AiCreditsQuote,
} from './widgetRuntimeContract'

const CELO_CHAIN_ID = 42220
const MIN_DEPOSIT_AMOUNT = '1'
const CELO_GD_ANTSEED_VAULT_FALLBACK: Address = CELO_GD_ANTSEED_VAULT_ADDRESS

const G_TOKEN_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
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
  operatorAddress: null,
  apiKey: null,
  depositAmount: MIN_DEPOSIT_AMOUNT,
  streamAmount: '0',
  minDepositUsd: null,
  minStreamUsd: null,
  bonusPercent: 0,
  quote: null,
  setupSnippet: buildSetupSnippet(),
  usageLog: [],
  totalGdDepositedG: null,
  monthlyStreamG: null,
  monthlyStreamCredits: null,
  withdrawableUsd: null,
  channelId: '',
  withdrawAmount: '',
  error: null,
  primaryAction: 'connect',
  primaryLabel: 'Connect Wallet',
  activeTab: 'buy',
}

function isInBuyFlowStatus(status: AiCreditsWidgetStatus): boolean {
  return (
    status === 'purchase_setup' ||
    status === 'quote_ready' ||
    status === 'payment_pending' ||
    status === 'payment_confirmed' ||
    status === 'payment_failed'
  )
}

function resolveActiveTab(
  prev: AiCreditsWidgetAdapterState,
  overrides: Partial<AiCreditsWidgetAdapterState>,
  status: AiCreditsWidgetStatus,
): AiCreditsWidgetTab {
  if (overrides.activeTab !== undefined) return overrides.activeTab

  const balance = overrides.aiCreditsBalance ?? prev.aiCreditsBalance
  const justConnected = !prev.address && Boolean(overrides.address)
  const creditsAdded =
    overrides.aiCreditsBalance !== undefined &&
    hasCredits(overrides.aiCreditsBalance) &&
    !hasCredits(prev.aiCreditsBalance)

  if (justConnected && hasCredits(balance)) return 'manage'
  if (creditsAdded && !isInBuyFlowStatus(status)) return 'manage'

  return prev.activeTab ?? 'buy'
}

function hasCredits(balance: string | null): boolean {
  return balance !== null && Number.parseFloat(balance) > 0
}

function deriveStatus(params: {
  isConnected: boolean
  chainId: number | null
  gBalance: string | null
  buyerKey: string | null
  buyerKeyConfirmed: boolean
  operatorConsentSigned: boolean
  depositAmount: string
  streamAmount: string
  error: string | null
  currentStatus: AiCreditsWidgetStatus
  activeTab: AiCreditsWidgetTab
}): AiCreditsWidgetStatus {
  const {
    isConnected,
    chainId,
    gBalance,
    buyerKey,
    buyerKeyConfirmed,
    operatorConsentSigned,
    depositAmount,
    streamAmount,
    error,
    currentStatus,
    activeTab,
  } = params

  if (
    currentStatus === 'payment_pending' ||
    currentStatus === 'payment_confirmed' ||
    currentStatus === 'payment_failed' ||
    currentStatus === 'backend_unavailable'
  ) {
    return currentStatus
  }

  if (!isConnected) {
    return currentStatus === 'connecting' ? 'connecting' : 'disconnected'
  }

  if (chainId !== null && chainId !== CELO_CHAIN_ID) return 'unsupported_chain'

  if (error && activeTab !== 'manage') return 'payment_failed'

  if (gBalance === null) return 'purchase_setup'

  const balance = Number.parseFloat(gBalance)
  if (balance <= 0) return 'purchase_setup'

  const deposit = Number.parseFloat(depositAmount)
  const stream = Number.parseFloat(streamAmount)
  const minBalance = Number.parseFloat(MIN_DEPOSIT_AMOUNT)

  if (balance < minBalance) return 'insufficient_g_balance'

  if (!buyerKey || !buyerKeyConfirmed || !operatorConsentSigned) return 'purchase_setup'

  if (deposit > 0 || stream > 0) return 'quote_ready'

  return 'purchase_setup'
}

function derivePrimaryAction(
  status: AiCreditsWidgetStatus,
  activeTab: AiCreditsWidgetTab,
): AiCreditsWidgetPrimaryAction {
  if (activeTab === 'manage') return 'refresh'

  switch (status) {
    case 'connecting':
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
    case 'insufficient_g_balance':
      return 'refresh'
    default:
      return 'none'
  }
}

function derivePrimaryLabel(
  action: AiCreditsWidgetPrimaryAction,
  status: AiCreditsWidgetStatus,
): string {
  switch (action) {
    case 'connect':
      return status === 'connecting' ? 'Connecting...' : 'Connect Wallet'
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
    buyerKey: merged.buyerKey,
    buyerKeyConfirmed: merged.buyerKeyConfirmed,
    operatorConsentSigned: merged.operatorConsentSigned,
    depositAmount: merged.depositAmount,
    streamAmount: merged.streamAmount,
    error: merged.error,
    currentStatus: merged.status,
    activeTab: merged.activeTab,
  })
  const activeTab = resolveActiveTab(prev, overrides, status)
  const primaryAction = derivePrimaryAction(status, activeTab)
  return {
    ...merged,
    status,
    activeTab: resolveActiveTab(prev, overrides, status),
    primaryAction,
    primaryLabel: derivePrimaryLabel(primaryAction, status),
  }
}

function mergeStatePreservingManageTab(
  prev: AiCreditsWidgetAdapterState,
  overrides: Partial<AiCreditsWidgetAdapterState>,
): AiCreditsWidgetAdapterState {
  if (prev.activeTab !== 'manage') {
    return withDerivedStatus(prev, overrides, true)
  }
  const status = deriveStatus({
    isConnected: true,
    chainId: overrides.chainId ?? prev.chainId,
    gBalance: overrides.gBalance ?? prev.gBalance,
    buyerKey: overrides.buyerKey ?? prev.buyerKey,
    buyerKeyConfirmed: overrides.buyerKeyConfirmed ?? prev.buyerKeyConfirmed,
    operatorConsentSigned: overrides.operatorConsentSigned ?? prev.operatorConsentSigned,
    depositAmount: overrides.depositAmount ?? prev.depositAmount,
    streamAmount: overrides.streamAmount ?? prev.streamAmount,
    error: overrides.error ?? prev.error,
    currentStatus: overrides.status ?? prev.status,
    activeTab: 'manage',
  })
  return {
    ...prev,
    ...overrides,
    status,
    activeTab: 'manage',
    primaryAction: 'refresh',
    primaryLabel: 'Refresh',
  }
}

function viewToStatePatch(
  view: AccountView,
  enriched: AccountEnrichment,
  prev: AiCreditsWidgetAdapterState,
  options?: {
    usageLog?: AiCreditsWidgetAdapterState['usageLog']
    balanceMode?: 'if_positive' | 'always'
  },
): Partial<AiCreditsWidgetAdapterState> {
  const operatorAccepted = view.operator.operatorAccepted
  const buyer = enriched.buyer
  const balance = enriched.balance
  const balanceMode = options?.balanceMode ?? 'if_positive'

  return {
    aiCreditsBalance:
      balanceMode === 'always' || hasCredits(balance) ? balance : prev.aiCreditsBalance,
    isGoodIdVerified: enriched.goodIdVerified,
    ...(buyer
      ? {
          buyerKey: buyer,
          buyerKeyConfirmed: operatorAccepted ? true : undefined,
        }
      : {}),
    operatorConsentSigned: operatorAccepted,
    operatorAddress: view.operator.operatorAddress ?? null,
    withdrawableUsd: view.withdrawableUsd,
    bonusPercent: enriched.bonusPercent,
    totalGdDepositedG: enriched.totalGdDepositedG,
    monthlyStreamG: enriched.monthlyStreamG,
    monthlyStreamCredits: enriched.monthlyStreamCredits,
    ...(options?.usageLog !== undefined ? { usageLog: options.usageLog } : {}),
  }
}

function mergeBuyerFields(
  prev: AiCreditsWidgetAdapterState,
  sessionPatch: ReturnType<typeof patchPayerSessionFields>,
  accountPatch: Partial<AiCreditsWidgetAdapterState>,
  accountSwitched: boolean,
): Partial<Pick<AiCreditsWidgetAdapterState, 'buyerKey' | 'buyerKeyPrivate' | 'buyerKeyConfirmed' | 'setupSnippet'>> {
  const buyerKey =
    sessionPatch.buyerKey ??
    accountPatch.buyerKey ??
    (accountSwitched ? null : prev.buyerKey)
  const buyerKeyPrivate =
    sessionPatch.buyerKeyPrivate ?? (accountSwitched ? null : prev.buyerKeyPrivate)
  const operatorConsented =
    accountPatch.operatorConsentSigned ?? prev.operatorConsentSigned
  const buyerKeyConfirmed =
    operatorConsented && buyerKey
      ? true
      : sessionPatch.buyerKeyPrivate
        ? sessionPatch.buyerKeyConfirmed
        : accountPatch.buyerKeyConfirmed ??
          (accountSwitched ? false : prev.buyerKeyConfirmed)

  return {
    buyerKey,
    buyerKeyPrivate,
    buyerKeyConfirmed,
    ...(buyerKey ? { setupSnippet: buildSetupSnippet(buyerKey) } : {}),
  }
}

export interface UseAiCreditsAdapterOptions {
  environment?: AiCreditsWidgetEnvironment
  backendUrl?: string
  baseRpcUrl?: string
  celoRpcUrl?: string
  fundingVaultAddress?: Address
  vaultAddress?: Address
  goodIdAddress?: Address
  onPaySuccess?: (detail: AiCreditsPaySuccessDetail) => void
  onPayError?: (detail: AiCreditsPayErrorDetail) => void
}

export function useAiCreditsAdapter({
  backendUrl,
  baseRpcUrl,
  celoRpcUrl,
  fundingVaultAddress,
  vaultAddress,
  goodIdAddress,
  onPaySuccess,
  onPayError,
}: UseAiCreditsAdapterOptions): AiCreditsWidgetAdapterResult {
  const { address, chainId, isConnected, provider, connect } = useWallet()
  const [state, setState] = useState<AiCreditsWidgetAdapterState>(INITIAL_STATE)

  const providerRef = useRef<EIP1193Provider | null>(null)
  providerRef.current = provider as EIP1193Provider | null

  const celoVault = vaultAddress ?? CELO_GD_ANTSEED_VAULT_FALLBACK

  const backendClient = useMemo<AiCreditsBackendClient>(
    () => createBackendClient(backendUrl),
    [backendUrl],
  )

  const chainClient = useMemo<AiCreditsChainClient>(
    () =>
      createChainClient(backendUrl, {
        baseRpcUrl,
        celoRpcUrl,
        fundingVaultAddress,
        celoVaultAddress: celoVault,
        celoGoodIdAddress: goodIdAddress ?? CELO_GOODID_ADDRESS,
      }),
    [backendUrl, baseRpcUrl, celoRpcUrl, fundingVaultAddress, celoVault, goodIdAddress],
  )

  useEffect(() => {
    if (!isConnected || !address) {
      setState((prev) => (prev.status === 'connecting' ? prev : { ...INITIAL_STATE }))
      return
    }

    let cancelled = false
    setState((prev) => {
      if (
        prev.status === 'payment_pending' ||
        prev.status === 'payment_confirmed' ||
        prev.status === 'payment_failed' ||
        prev.status === 'backend_unavailable' ||
        prev.status === 'connecting'
      ) {
        return prev
      }
      return {
        ...prev,
        status: 'connecting',
        error: null,
        primaryAction: 'connect',
        primaryLabel: 'Connecting...',
      }
    })

    async function loadWalletData() {
      const publicClient = createPublicClient({ chain: CELO_CHAIN, transport: http() })
      const balancePromise = Promise.all([
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

      const accountPromise = buildAccountView(address!, backendClient, chainClient)
        .then(async (view) => ({
          view,
          enriched: await enrichAccountView(view, chainClient),
        }))
        .catch(() => null)

      const minimumsPromise =
        backendClient instanceof MockAiCreditsBackendClient
          ? Promise.resolve({
              minDepositUsd: '1.00',
              minStreamUsd: '1.00',
            })
          : fetchVaultPaymentMinimums(publicClient, celoVault, address as Address).catch(() => null)

      try {
        const [[rawBalance, decimals], account, minimums] = await Promise.all([
          balancePromise,
          accountPromise,
          minimumsPromise,
        ])
        if (cancelled) return

        const patch: Partial<AiCreditsWidgetAdapterState> = {
          address,
          chainId,
          gBalance: formatUnits(rawBalance as bigint, decimals as number),
          minDepositUsd: minimums?.minDepositUsd ?? null,
          minStreamUsd: minimums?.minStreamUsd ?? null,
        }

        setState((prev) => {
          const accountSwitched = !addressesMatch(prev.address, address)
          const sessionPatch = patchPayerSessionFields(address)
          const accountPatch = account
            ? viewToStatePatch(account.view, account.enriched, prev, {
                balanceMode: 'if_positive',
              })
            : {}
          const buyerFields = mergeBuyerFields(
            prev,
            sessionPatch,
            accountPatch,
            accountSwitched,
          )
          return withDerivedStatus(
            prev,
            {
              ...patch,
              ...accountPatch,
              ...buyerFields,
            },
            true,
          )
        })
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

    void loadWalletData()
    return () => {
      cancelled = true
    }
  }, [isConnected, address, chainId, backendClient, chainClient, celoVault])

  useEffect(() => {
    if (!isConnected || !address) return
    if (!state.operatorConsentSigned) return
    if (
      state.status === 'payment_pending' ||
      state.status === 'payment_confirmed' ||
      state.status === 'connecting'
    )
      return

    let cancelled = false

    async function refreshQuote() {
      try {
        const quote = await chainClient.buildQuote(
          state.depositAmount,
          state.streamAmount,
          state.isGoodIdVerified,
        )
        if (cancelled) return
        setState((prev) =>
          withDerivedStatus(prev, { quote, bonusPercent: quote.bonusPercent }, true),
        )
      } catch {
        if (!cancelled) setState((prev) => ({ ...prev, quote: null }))
      }
    }

    void refreshQuote()
    return () => {
      cancelled = true
    }
  }, [
    isConnected,
    address,
    state.operatorConsentSigned,
    state.depositAmount,
    state.streamAmount,
    state.isGoodIdVerified,
    state.status,
    chainClient,
  ])

  const handleConnect = useCallback(async () => {
    setState((prev) => withDerivedStatus(prev, { status: 'connecting', error: null }, false))
    try {
      await connect()
    } catch {
      setState((prev) =>
        withDerivedStatus(prev, { status: 'disconnected', error: null }, false),
      )
    }
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
      setState((prev) =>
        withDerivedStatus(prev, { error: 'Connect your wallet before generating a buyer key' }, true),
      )
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

      writePayerSession(payerAddress, {
        buyerKey: account.address,
        buyerKeyPrivate: privateKey,
        buyerKeyConfirmed: false,
      })

      setState((prev) => {
        const onManageTab = prev.activeTab === 'manage'
        const confirmed = onManageTab
        if (confirmed) {
          writePayerSession(payerAddress, {
            buyerKey: account.address,
            buyerKeyPrivate: privateKey,
            buyerKeyConfirmed: true,
          })
        }
        return mergeStatePreservingManageTab(prev, {
          buyerKey: account.address,
          buyerKeyPrivate: privateKey,
          buyerKeyConfirmed: onManageTab,
          apiKey: null,
          error: null,
          setupSnippet: buildSetupSnippet(account.address),
          ...(!onManageTab ? { status: 'purchase_setup' } : {}),
        })
      })
    } catch (err: unknown) {
      setState((prev) =>
        withDerivedStatus(prev, {
          error: err instanceof Error ? err.message : 'Buyer key generation was rejected',
        }, true),
      )
    }
  }, [address])

  const handleConfirmBuyerKey = useCallback(() => {
    setState((prev) => {
      if (prev.address && prev.buyerKey && prev.buyerKeyPrivate) {
        writePayerSession(prev.address, {
          buyerKey: prev.buyerKey,
          buyerKeyPrivate: prev.buyerKeyPrivate,
          buyerKeyConfirmed: true,
        })
      }
      return withDerivedStatus(prev, { buyerKeyConfirmed: true, status: 'purchase_setup' }, true)
    })
  }, [])

  const handleSignOperatorConsent = useCallback(async () => {
    const currentState = state
    if (!currentState.address || !currentState.buyerKey || !currentState.buyerKeyPrivate) {
      setState((prev) =>
        withDerivedStatus(prev, { error: 'Generate a buyer key before signing operator consent' }, true),
      )
      return
    }

    const ref: AccountRef = { payer: currentState.address, buyer: currentState.buyerKey }
    const onManageTab = currentState.activeTab === 'manage'

    try {
      const operatorStatus = await chainClient.getBuyerOperatorStatus(ref)

      if (!operatorStatus.enabled) {
        throw new Error('Operator consent is not available')
      }

      if (operatorStatus.operatorAccepted) {
        setState((prev) =>
          mergeStatePreservingManageTab(prev, {
            operatorConsentSigned: true,
            error: null,
            ...(!onManageTab ? { status: 'purchase_setup' } : {}),
          }),
        )
        return
      }

      const payload = await chainClient.buildOperatorConsentPayload(ref, operatorStatus)

      if (!payload.enabled || !payload.typedData) {
        throw new Error('Operator consent is not available')
      }

      const buyerSig = await signOperatorConsentFromTypedData(
        currentState.buyerKeyPrivate as `0x${string}`,
        payload.typedData,
      )

      await backendClient.submitOperatorConsent(ref.buyer, {
        nonce: operatorStatus.consentNonce,
        signature: buyerSig,
      })
      await waitForOperatorConsent(chainClient, ref)

      setState((prev) =>
        mergeStatePreservingManageTab(prev, {
          operatorConsentSigned: true,
          error: null,
          ...(!onManageTab ? { status: 'purchase_setup' } : {}),
        }),
      )
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Operator consent signature rejected',
      }))
    }
  }, [state, backendClient, chainClient])

  const handleSetDepositAmount = useCallback((amount: string) => {
    setState((prev) =>
      withDerivedStatus(
        prev,
        {
          depositAmount: amount,
          status: prev.status === 'payment_pending' ? 'payment_pending' : 'purchase_setup',
        },
        true,
      ),
    )
  }, [])

  const handleSetStreamAmount = useCallback((amount: string) => {
    setState((prev) =>
      withDerivedStatus(
        prev,
        {
          streamAmount: amount,
          status: prev.status === 'payment_pending' ? 'payment_pending' : 'purchase_setup',
        },
        true,
      ),
    )
  }, [])

  const handleSetChannelId = useCallback((channelId: string) => {
    setState((prev) => ({ ...prev, channelId }))
  }, [])

  const handleSetWithdrawAmount = useCallback((amount: string) => {
    setState((prev) => ({ ...prev, withdrawAmount: amount }))
  }, [])

  const handlePay = useCallback(async () => {
    const currentState = state

    if (!currentState.address || !currentState.buyerKey || !providerRef.current) return

    const depositAmountG = Number.parseFloat(currentState.depositAmount)
    const streamAmountG = Number.parseFloat(currentState.streamAmount)
    const hasDeposit = depositAmountG > 0
    const hasStream = streamAmountG > 0
    if (!hasDeposit && !hasStream) return

    let quote: AiCreditsQuote | null = currentState.quote
    try {
      if (!quote) {
        quote = await chainClient.buildQuote(
          currentState.depositAmount,
          currentState.streamAmount,
          currentState.isGoodIdVerified,
        )
      }
    } catch {
      setState((prev) => ({
        ...prev,
        status: 'backend_unavailable',
        primaryAction: 'retry',
        primaryLabel: 'Retry',
        error: 'Could not build quote — check chain connectivity',
      }))
      return
    }

    if (!quote) return

    if (!(backendClient instanceof MockAiCreditsBackendClient)) {
      try {
        const publicClient = createPublicClient({ chain: CELO_CHAIN, transport: http() })
        await validateVaultPaymentAmounts({
          publicClient,
          vault: celoVault,
          payer: currentState.address as Address,
          depositAmount: currentState.depositAmount,
          streamAmount: currentState.streamAmount,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Payment amount below vault minimum'
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
        return
      }
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
      const vault = celoVault
      const payerAddress = currentState.address as Address
      const buyerAddress = currentState.buyerKey as Address

      const publicClient = createPublicClient({ chain: CELO_CHAIN, transport: http() })
      const walletClient = createWalletClient({
        account: payerAddress,
        chain: CELO_CHAIN,
        transport: custom(providerRef.current),
      })

      const accountRef: AccountRef = {
        payer: currentState.address,
        buyer: currentState.buyerKey,
      }

      if (backendClient instanceof MockAiCreditsBackendClient) {
        const creditUsdMicro = BigInt(
          Math.round(Number.parseFloat(quote.totalCredits) * CREDITS_PER_USD),
        )
        backendClient.prepareSettlement(accountRef, creditUsdMicro)
      }

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

      let balanceBefore = '0'
      try {
        const credit = await backendClient.getAccountCredit(currentState.address)
        balanceBefore = balanceFromProfile(credit.profile)
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

      setState((prev) =>
        withDerivedStatus(prev, {
          aiCreditsBalance: credits,
          setupSnippet,
          error: null,
          activeTab: 'manage',
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
  }, [state, backendClient, chainClient, celoVault, onPaySuccess, onPayError])

  const handleRefresh = useCallback(async () => {
    const currentState = state
    if (!currentState.address) return

    try {
      const [view, usageLog] = await Promise.all([
        buildAccountView(currentState.address, backendClient, chainClient),
        backendClient.getUsageLog(currentState.address),
      ])
      const enriched = await enrichAccountView(view, chainClient)

      setState((prev) => {
        const accountPatch = viewToStatePatch(view, enriched, prev, {
          usageLog,
          balanceMode: 'always',
        })
        const buyerFields = mergeBuyerFields(prev, patchPayerSessionFields(currentState.address), accountPatch, false)
        return withDerivedStatus(
          prev,
          {
            ...accountPatch,
            ...buyerFields,
            activeTab: prev.activeTab,
          },
          true,
        )
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
  }, [state, backendClient, chainClient])

  const handleCloseChannel = useCallback(async () => {
    const currentState = state
    const channelId = normalizeChannelId(currentState.channelId)
    if (!channelId) {
      setState((prev) => ({
        ...prev,
        error: 'Enter a valid channel ID (0x followed by 64 hex characters)',
      }))
      return
    }
    if (!currentState.buyerKeyPrivate) {
      setState((prev) => ({
        ...prev,
        error: 'Sign with your payer wallet in Buyer & Operator below to generate the buyer private key before closing a channel',
      }))
      return
    }
    if (!fundingVaultAddress) {
      setState((prev) => ({
        ...prev,
        error: 'Funding vault address is not configured',
      }))
      return
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = await signRequestClose({
        buyerPrivateKey: currentState.buyerKeyPrivate as `0x${string}`,
        fundingVaultAddress,
        channelId,
        timestamp,
      })

      await backendClient.closeChannel(channelId, { timestamp, signature })
      setState((prev) => ({ ...prev, error: null, channelId: '' }))
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Close channel failed',
      }))
    }
  }, [state, backendClient, fundingVaultAddress])

  const handleWithdrawCredits = useCallback(async () => {
    const currentState = state
    if (!currentState.address || !currentState.buyerKey) return
    if (!currentState.buyerKeyPrivate) {
      setState((prev) => ({
        ...prev,
        error:
          'Sign with your payer wallet in Buyer & Operator below to generate the buyer private key before withdrawing funds',
      }))
      return
    }
    if (!fundingVaultAddress) {
      setState((prev) => ({
        ...prev,
        error: 'Funding vault address is not configured',
      }))
      return
    }
    if (!currentState.withdrawAmount.trim()) {
      setState((prev) => ({ ...prev, error: 'Enter an amount to withdraw' }))
      return
    }

    try {
      const amount = usdDisplayToMicro(currentState.withdrawAmount.trim())
      const withdrawable = BigInt(currentState.withdrawableUsd ?? '0')
      if (BigInt(amount) <= 0n) {
        setState((prev) => ({ ...prev, error: 'Enter a valid USD amount' }))
        return
      }
      if (BigInt(amount) > withdrawable) {
        setState((prev) => ({ ...prev, error: 'Amount exceeds withdrawable principal' }))
        return
      }

      const buyer = currentState.buyerKey as Address
      const payer = currentState.address as Address
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = await signWithdrawPrincipal({
        buyerPrivateKey: currentState.buyerKeyPrivate as `0x${string}`,
        fundingVaultAddress,
        buyer,
        amountMicro: BigInt(amount),
        recipient: payer,
        timestamp,
      })

      await backendClient.withdrawCredits(buyer, {
        amount,
        recipient: payer,
        timestamp,
        signature,
      })
      setState((prev) => ({ ...prev, error: null, withdrawAmount: '' }))
      await handleRefresh()
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Withdraw failed',
      }))
    }
  }, [state, backendClient, fundingVaultAddress, handleRefresh])

  const handleRetry = useCallback(async () => {
    setState((prev) =>
      withDerivedStatus(prev, { activeTab: 'buy', status: 'purchase_setup', error: null }, true),
    )
  }, [])

  const handleSetActiveTab = useCallback((tab: AiCreditsWidgetTab) => {
    if (tab === 'buy') {
      setState((prev) =>
        withDerivedStatus(prev, { activeTab: 'buy', status: 'purchase_setup', error: null }, true),
      )
      return
    }
    setState((prev) => mergeStatePreservingManageTab(prev, { activeTab: 'manage', error: null }))
  }, [])

  const handleStartPurchase = useCallback(() => {
    handleSetActiveTab('buy')
  }, [handleSetActiveTab])

  const actions: AiCreditsWidgetAdapterActions = useMemo(
    () => ({
      connect: handleConnect,
      switchChain: handleSwitchChain,
      generateBuyerKey: handleGenerateBuyerKey,
      confirmBuyerKey: handleConfirmBuyerKey,
      signOperatorConsent: handleSignOperatorConsent,
      setDepositAmount: handleSetDepositAmount,
      setStreamAmount: handleSetStreamAmount,
      setChannelId: handleSetChannelId,
      setWithdrawAmount: handleSetWithdrawAmount,
      pay: handlePay,
      refresh: handleRefresh,
      startPurchase: handleStartPurchase,
      setActiveTab: handleSetActiveTab,
      closeChannel: handleCloseChannel,
      withdrawCredits: handleWithdrawCredits,
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
      handleSetChannelId,
      handleSetWithdrawAmount,
      handlePay,
      handleRefresh,
      handleStartPurchase,
      handleSetActiveTab,
      handleCloseChannel,
      handleWithdrawCredits,
      handleRetry,
    ],
  )

  return { state, actions }
}

function buildSetupSnippet(buyerAddress?: string | null): string {
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
    ''
  ].join('\n')
}
