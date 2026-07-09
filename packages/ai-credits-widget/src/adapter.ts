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
  totalCreditUsdFromProfile,
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
  patchPayerSession,
} from './payerSession'
import { executeCeloPayment, G_TOKEN_CELO_ADDRESS } from './celoPayment'
import { fetchVaultPaymentMinimums, validateVaultPaymentAmounts } from './vaultMinimums'
import { parseGAmount, quoteTotalUsdMicro, usdDisplayToMicro } from './quoteMath'
import type {
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterResult,
  AiCreditsWidgetAdapterState,
  AiCreditsWidgetEnvironment,
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
  gdUsdPerToken: null,
  totalCreditUsd: null,
  isGoodIdVerified: false,
  buyerPubKey: null,
  buyerKeyPrivate: null,
  operatorConsentSigned: false,
  operatorAddress: null,
  minDepositUsd: null,
  minStreamUsd: null,
  quote: null,
  usageLog: [],
  totalGdDepositedG: null,
  monthlyStreamG: null,
  withdrawableUsd: null,
  error: null,
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

  const balance = overrides.totalCreditUsd ?? prev.totalCreditUsd
  const justConnected = !prev.address && Boolean(overrides.address)
  const creditsAdded =
    overrides.totalCreditUsd !== undefined &&
    hasCreditBalance(overrides.totalCreditUsd) &&
    !hasCreditBalance(prev.totalCreditUsd)

  if (justConnected && hasCreditBalance(balance)) return 'manage'
  if (creditsAdded && !isInBuyFlowStatus(status)) return 'manage'

  return prev.activeTab ?? 'buy'
}

function hasCreditBalance(totalCreditUsd: string | null): boolean {
  return totalCreditUsd !== null && BigInt(totalCreditUsd) > 0n
}

function quoteHasAmounts(quote: AiCreditsQuote | null): boolean {
  if (!quote) return false
  return parseGAmount(quote.depositAmountG) > 0 || parseGAmount(quote.streamAmountG) > 0
}

function deriveStatus(params: {
  isConnected: boolean
  chainId: number | null
  gBalance: string | null
  buyerPubKey: string | null
  buyerKeyPrivate: string | null
  operatorConsentSigned: boolean
  quote: AiCreditsQuote | null
  error: string | null
  currentStatus: AiCreditsWidgetStatus
  activeTab: AiCreditsWidgetTab
}): AiCreditsWidgetStatus {
  const {
    isConnected,
    chainId,
    gBalance,
    buyerPubKey,
    buyerKeyPrivate,
    operatorConsentSigned,
    quote,
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

  const minBalance = Number.parseFloat(MIN_DEPOSIT_AMOUNT)

  if (balance < minBalance) return 'insufficient_g_balance'

  if (!buyerPubKey || !buyerKeyPrivate || !operatorConsentSigned) return 'purchase_setup'

  if (quoteHasAmounts(quote)) return 'quote_ready'

  return 'purchase_setup'
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
    buyerPubKey: merged.buyerPubKey,
    buyerKeyPrivate: merged.buyerKeyPrivate,
    operatorConsentSigned: merged.operatorConsentSigned,
    quote: merged.quote,
    error: merged.error,
    currentStatus: merged.status,
    activeTab: merged.activeTab,
  })
  return {
    ...merged,
    status,
    activeTab: resolveActiveTab(prev, overrides, status),
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
    buyerPubKey: overrides.buyerPubKey ?? prev.buyerPubKey,
    buyerKeyPrivate: overrides.buyerKeyPrivate ?? prev.buyerKeyPrivate,
    operatorConsentSigned: overrides.operatorConsentSigned ?? prev.operatorConsentSigned,
    quote: overrides.quote ?? prev.quote,
    error: overrides.error ?? prev.error,
    currentStatus: overrides.status ?? prev.status,
    activeTab: 'manage',
  })
  return {
    ...prev,
    ...overrides,
    status,
    activeTab: 'manage',
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
  const totalCreditUsd = enriched.totalCreditUsd
  const balanceMode = options?.balanceMode ?? 'if_positive'

  return {
    totalCreditUsd:
      balanceMode === 'always' || hasCreditBalance(totalCreditUsd)
        ? totalCreditUsd
        : prev.totalCreditUsd,
    isGoodIdVerified: enriched.goodIdVerified,
    ...(buyer ? { buyerPubKey: buyer } : {}),
    operatorConsentSigned: operatorAccepted,
    operatorAddress: view.operator.operatorAddress ?? null,
    withdrawableUsd: view.withdrawableUsd,
    totalGdDepositedG: enriched.totalGdDepositedG,
    monthlyStreamG: enriched.monthlyStreamG,
    ...(options?.usageLog !== undefined ? { usageLog: options.usageLog } : {}),
  }
}

function mergeSessionFields(
  prev: AiCreditsWidgetAdapterState,
  sessionPatch: ReturnType<typeof patchPayerSessionFields>,
  accountPatch: Partial<AiCreditsWidgetAdapterState>,
  accountSwitched: boolean,
): Partial<
  Pick<
    AiCreditsWidgetAdapterState,
    'buyerPubKey' | 'buyerKeyPrivate' | 'operatorConsentSigned'
  >
> {
  const buyerPubKey =
    sessionPatch.buyerPubKey ??
    accountPatch.buyerPubKey ??
    (accountSwitched ? null : prev.buyerPubKey)
  const buyerKeyPrivate =
    sessionPatch.buyerKeyPrivate ?? (accountSwitched ? null : prev.buyerKeyPrivate)
  const operatorConsentSigned = accountSwitched
    ? (sessionPatch.operatorConsentSigned ??
      accountPatch.operatorConsentSigned ??
      false)
    : (accountPatch.operatorConsentSigned ??
      sessionPatch.operatorConsentSigned ??
      prev.operatorConsentSigned)

  return {
    buyerPubKey,
    buyerKeyPrivate,
    operatorConsentSigned,
  }
}

function syncOperatorConsentSession(
  address: string,
  operatorConsentSigned: boolean | undefined,
): void {
  if (operatorConsentSigned === undefined) return
  patchPayerSession(address, { operatorConsentSigned })
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

      const usageLogPromise = backendClient.getUsageLog(address!).catch(() => [])
      const gdUsdPerTokenPromise = chainClient.fetchGdUsdPerToken().catch(() => null)

      try {
        const [[rawBalance, decimals], account, minimums, usageLog, gdUsdPerToken] =
          await Promise.all([
          balancePromise,
          accountPromise,
          minimumsPromise,
          usageLogPromise,
          gdUsdPerTokenPromise,
        ])
        if (cancelled) return

        const patch: Partial<AiCreditsWidgetAdapterState> = {
          address,
          chainId,
          gBalance: formatUnits(rawBalance as bigint, decimals as number),
          gdUsdPerToken,
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
          const buyerFields = mergeSessionFields(
            prev,
            sessionPatch,
            accountPatch,
            accountSwitched,
          )
          if (address && accountPatch.operatorConsentSigned !== undefined) {
            syncOperatorConsentSession(address, accountPatch.operatorConsentSigned)
          }
          return withDerivedStatus(
            prev,
            {
              ...patch,
              ...accountPatch,
              ...buyerFields,
              usageLog,
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

      patchPayerSession(payerAddress, {
        buyerPubKey: account.address,
        buyerKeyPrivate: privateKey,
      })

      setState((prev) =>
        mergeStatePreservingManageTab(prev, {
          buyerPubKey: account.address,
          buyerKeyPrivate: privateKey,
          error: null,
          ...(prev.activeTab !== 'manage' ? { status: 'purchase_setup' } : {}),
        }),
      )
    } catch (err: unknown) {
      setState((prev) =>
        withDerivedStatus(prev, {
          error: err instanceof Error ? err.message : 'Buyer key generation was rejected',
        }, true),
      )
    }
  }, [address])

  const handleSignOperatorConsent = useCallback(async () => {
    const currentState = state
    if (!currentState.address || !currentState.buyerPubKey || !currentState.buyerKeyPrivate) {
      setState((prev) =>
        withDerivedStatus(prev, { error: 'Generate a buyer key before signing operator consent' }, true),
      )
      return
    }

    const ref: AccountRef = { payer: currentState.address, buyer: currentState.buyerPubKey }
    const onManageTab = currentState.activeTab === 'manage'

    try {
      const operatorStatus = await chainClient.getBuyerOperatorStatus(ref)

      if (!operatorStatus.enabled) {
        throw new Error('Operator consent is not available')
      }

      if (operatorStatus.operatorAccepted) {
        patchPayerSession(currentState.address, { operatorConsentSigned: true })
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

      patchPayerSession(currentState.address, { operatorConsentSigned: true })
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

  const handleSyncOperatorConsentFromChain = useCallback(async () => {
    const currentState = state
    if (!currentState.address || !currentState.buyerPubKey || currentState.operatorConsentSigned) {
      return
    }

    try {
      const ref: AccountRef = { payer: currentState.address, buyer: currentState.buyerPubKey }
      const operatorStatus = await chainClient.getBuyerOperatorStatus(ref)
      if (!operatorStatus.operatorAccepted) return

      patchPayerSession(currentState.address, { operatorConsentSigned: true })
      const onManageTab = currentState.activeTab === 'manage'
      setState((prev) =>
        mergeStatePreservingManageTab(prev, {
          operatorConsentSigned: true,
          error: null,
          ...(!onManageTab ? { status: 'purchase_setup' } : {}),
        }),
      )
    } catch {
      return
    }
  }, [state, chainClient])

  const handleUpdateQuote = useCallback(
    async (depositG: string, streamG: string) => {
      try {
        const [quote, gdUsdPerToken] = await Promise.all([
          chainClient.buildQuote(depositG, streamG),
          state.gdUsdPerToken !== null
            ? Promise.resolve(state.gdUsdPerToken)
            : chainClient.fetchGdUsdPerToken(),
        ])
        setState((prev) => withDerivedStatus(prev, { quote, gdUsdPerToken }, true))
      } catch {
        setState((prev) => withDerivedStatus(prev, { quote: null }, true))
      }
    },
    [chainClient, state.gdUsdPerToken],
  )

  const handlePay = useCallback(async () => {
    const currentState = state

    if (!currentState.address || !currentState.buyerPubKey || !providerRef.current) return

    const quote = currentState.quote
    if (!quote || !quoteHasAmounts(quote)) return

    const depositAmountG = Number.parseFloat(quote.depositAmountG)
    const streamAmountG = Number.parseFloat(quote.streamAmountG)
    const hasDeposit = depositAmountG > 0
    const hasStream = streamAmountG > 0
    if (!hasDeposit && !hasStream) return

    let gdUsdPerToken = currentState.gdUsdPerToken
    try {
      if (gdUsdPerToken === null) {
        gdUsdPerToken = await chainClient.fetchGdUsdPerToken()
      }
    } catch {
      setState((prev) => ({
        ...prev,
        status: 'backend_unavailable',
        error: 'Could not build quote — check chain connectivity',
      }))
      return
    }

    if (gdUsdPerToken === null) return

    if (!(backendClient instanceof MockAiCreditsBackendClient)) {
      try {
        const publicClient = createPublicClient({ chain: CELO_CHAIN, transport: http() })
        await validateVaultPaymentAmounts({
          publicClient,
          vault: celoVault,
          payer: currentState.address as Address,
          depositAmount: quote.depositAmountG,
          streamAmount: quote.streamAmountG,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Payment amount below vault minimum'
        setState((prev) => ({
          ...prev,
          status: 'payment_failed',
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
      gdUsdPerToken,
      status: 'payment_pending',
      error: null,
    }))

    try {
      const vault = celoVault
      const payerAddress = currentState.address as Address
      const buyerAddress = currentState.buyerPubKey as Address

      const publicClient = createPublicClient({ chain: CELO_CHAIN, transport: http() })
      const walletClient = createWalletClient({
        account: payerAddress,
        chain: CELO_CHAIN,
        transport: custom(providerRef.current),
      })

      const accountRef: AccountRef = {
        payer: currentState.address,
        buyer: currentState.buyerPubKey,
      }

      if (backendClient instanceof MockAiCreditsBackendClient) {
        const creditUsdMicro = quoteTotalUsdMicro(
          quote,
          gdUsdPerToken,
          currentState.isGoodIdVerified,
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
      }))

      let balanceBefore = '0'
      try {
        const credit = await backendClient.getAccountCredit(currentState.address)
        balanceBefore = totalCreditUsdFromProfile(credit.profile)
      } catch {
        balanceBefore = '0'
      }

      for (const hash of txHashes) {
        await backendClient.notifyPayment(hash)
      }
      const { totalCreditUsd } = await backendClient.waitForSettlement(accountRef, {
        txHashes,
        previousBalance: balanceBefore,
      })

      const creditUsdMicro = (
        BigInt(totalCreditUsd) - BigInt(balanceBefore || '0')
      ).toString()

      setState((prev) =>
        withDerivedStatus(prev, {
          totalCreditUsd,
          error: null,
          activeTab: 'manage',
        }),
      )

      onPaySuccess?.({
        address: currentState.address!,
        chainId: CELO_CHAIN_ID,
        transactionHash: txHash,
        buyerPubKey: currentState.buyerPubKey!,
        creditUsdMicro,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed'
      setState((prev) => ({
        ...prev,
        status: 'payment_failed',
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
        const sessionFields = mergeSessionFields(
          prev,
          patchPayerSessionFields(currentState.address),
          accountPatch,
          false,
        )
        if (accountPatch.operatorConsentSigned !== undefined && currentState.address) {
          syncOperatorConsentSession(currentState.address, accountPatch.operatorConsentSigned)
        }
        return withDerivedStatus(
          prev,
          {
            ...accountPatch,
            ...sessionFields,
            activeTab: prev.activeTab,
            error: null,
          },
          true,
        )
      })
    } catch {
      setState((prev) =>
        mergeStatePreservingManageTab(prev, {
          status: 'backend_unavailable',
          error: 'Could not reach backend — check your connection',
        }),
      )
    }
  }, [state, backendClient, chainClient])

  const handleCloseChannel = useCallback(
    async (channelIdInput: string) => {
      const currentState = state
      const channelId = normalizeChannelId(channelIdInput)
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
        setState((prev) => ({ ...prev, error: null }))
      } catch (err: unknown) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Close channel failed',
        }))
      }
    },
    [state, backendClient, fundingVaultAddress],
  )

  const handleWithdrawCredits = useCallback(
    async (withdrawAmount: string) => {
      const currentState = state
      if (!currentState.address || !currentState.buyerPubKey) return
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
      if (!withdrawAmount.trim()) {
        setState((prev) => ({ ...prev, error: 'Enter an amount to withdraw' }))
        return
      }

      try {
        const amount = usdDisplayToMicro(withdrawAmount.trim())
        const withdrawable = BigInt(currentState.withdrawableUsd ?? '0')
        if (BigInt(amount) <= 0n) {
          setState((prev) => ({ ...prev, error: 'Enter a valid USD amount' }))
          return
        }
        if (BigInt(amount) > withdrawable) {
          setState((prev) => ({ ...prev, error: 'Amount exceeds withdrawable principal' }))
          return
        }

        const buyer = currentState.buyerPubKey as Address
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
        setState((prev) => ({ ...prev, error: null }))
        await handleRefresh()
      } catch (err: unknown) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Withdraw failed',
        }))
      }
    },
    [state, backendClient, fundingVaultAddress, handleRefresh],
  )

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
      signOperatorConsent: handleSignOperatorConsent,
      syncOperatorConsentFromChain: handleSyncOperatorConsentFromChain,
      updateQuote: handleUpdateQuote,
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
      handleSignOperatorConsent,
      handleSyncOperatorConsentFromChain,
      handleUpdateQuote,
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
