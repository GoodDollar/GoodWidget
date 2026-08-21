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
import { normalizeChannelId, signRequestClose, signWithdrawPrincipal } from './buyerSignatures'
import {
  totalCreditUsdFromProfile,
  buildAccountView,
  collectBuyerAddressesFromEntries,
  createBackendClient,
  DEFAULT_DISCOUNT_CONFIG,
  enrichAccountView,
  waitForOperatorConsent,
} from './backendClient'
import type { AccountEnrichment, AiCreditsBackendClient } from './backendClient'
import type { AccountRef, AccountView } from './backendTypes'
import {
  createChainClient,
  CELO_GD_ANTSEED_VAULT_ADDRESS,
  CELO_GOODID_ADDRESS,
} from './chainClient'
import type { AiCreditsChainClient } from './chainClient'
import { signOperatorConsentFromTypedData } from './operatorConsent'
import {
  clearDeepLinkArtifacts,
  deepLinkManualFallbackMessage,
  isValidBuyerAddress,
  isValidOperatorSignature,
  resolveDeepLinkParams,
  storeDeepLinkParams,
  type DeepLinkParams,
} from './deepLinkParams'
import {
  buildBuyerStateFields,
  patchPayerSessionFields,
  readPayerSession,
  upsertBuyerKey,
  setActiveBuyerAddress,
  setBuyerOperatorConsented,
  mergeBuyerAddressList,
  rememberBuyerAddresses,
  listKnownBuyerAddresses,
  getBuyerKeyEntry,
} from './payerSession'
import { executeCeloPayment, G_TOKEN_CELO_ADDRESS, isStreamAmountChanged } from './celoPayment'
import { startGoodIdVerification, isUserRejectedWalletRequest } from './goodIdVerification'
import { mapPaymentError } from './paymentErrors'
import { fetchVaultPaymentMinimums, validateVaultPaymentAmounts } from './vaultMinimums'
import { quoteTotalUsdMicro, usdDisplayToMicro } from './quoteMath'
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
  buyerPrvKey: null,
  operatorSignature: null,
  operatorConsented: false,
  operatorConsentPending: false,
  operatorAddress: null,
  currentOperator: null,
  minDepositUsd: null,
  minStreamUsd: null,
  totalGdDepositedG: null,
  monthlyStreamG: null,
  withdrawableUsd: null,
  depositBonusPercent: DEFAULT_DISCOUNT_CONFIG.depositBonusPercent,
  streamBonusPercent: DEFAULT_DISCOUNT_CONFIG.streamBonusPercent,
  error: null,
  activeTab: 'setup',
  buyers: [],
  derivedBuyerAddress: null,
}

const WALLET_LOADING_STATE: Partial<AiCreditsWidgetAdapterState> = {
  gBalance: null,
  gdUsdPerToken: null,
  totalCreditUsd: null,
  isGoodIdVerified: false,
  minDepositUsd: null,
  minStreamUsd: null,
  totalGdDepositedG: null,
  monthlyStreamG: null,
  withdrawableUsd: null,
  operatorAddress: null,
  currentOperator: null,
}

const BUYER_HISTORY_LOOKUP_LIMIT = 100

function resolveLocalBuyers(
  payer: string,
  preferredBuyer?: string | null,
  ...extras: Array<string | null | undefined>
): { buyers: string[]; selected: string | null } {
  const buyers = rememberBuyerAddresses(payer, [
    preferredBuyer,
    ...listKnownBuyerAddresses(payer),
    ...extras,
  ])
  return { buyers, selected: selectPreferredBuyer(buyers, preferredBuyer) }
}

async function discoverBuyersFromHistory(
  payer: string,
  backend: AiCreditsBackendClient,
  ...extras: Array<string | null | undefined>
): Promise<string[]> {
  let historyBuyers: string[] = []
  try {
    const history = await backend.getCreditHistory(payer, {
      limit: BUYER_HISTORY_LOOKUP_LIMIT,
      offset: 0,
    })
    historyBuyers = collectBuyerAddressesFromEntries(history.items)
  } catch {
    historyBuyers = []
  }
  return rememberBuyerAddresses(payer, [...historyBuyers, ...extras])
}

function selectPreferredBuyer(
  buyers: string[],
  preferredBuyer?: string | null,
): string | null {
  if (
    preferredBuyer &&
    buyers.some((item) => item.toLowerCase() === preferredBuyer.toLowerCase())
  ) {
    return preferredBuyer
  }
  return buyers[0] ?? preferredBuyer ?? null
}

function isNonBuyTab(tab: AiCreditsWidgetTab): boolean {
  return tab === 'setup' || tab === 'manage' || tab === 'history'
}

export function needsWalletConnection(state: AiCreditsWidgetAdapterState): boolean {
  return (
    !state.address ||
    state.status === 'disconnected' ||
    state.status === 'connecting'
  )
}

function resolveDefaultActiveTab(
  payerAddress: string | null,
  totalCreditUsd: string | null,
): AiCreditsWidgetTab {
  if (hasCreditBalance(totalCreditUsd)) return 'manage'
  if (payerAddress && listKnownBuyerAddresses(payerAddress).length > 0) return 'buy'
  return 'setup'
}

function resolveActiveTab(
  prev: AiCreditsWidgetAdapterState,
  overrides: Partial<AiCreditsWidgetAdapterState>,
): AiCreditsWidgetTab {
  if (overrides.activeTab !== undefined) return overrides.activeTab

  const payerAddress = overrides.address !== undefined ? overrides.address : prev.address
  const totalCreditUsd =
    overrides.totalCreditUsd !== undefined ? overrides.totalCreditUsd : prev.totalCreditUsd

  if (overrides.totalCreditUsd !== undefined && overrides.totalCreditUsd !== null) {
    return resolveDefaultActiveTab(payerAddress, overrides.totalCreditUsd)
  }

  if (overrides.address !== undefined && overrides.address !== prev.address) {
    return resolveDefaultActiveTab(payerAddress, totalCreditUsd)
  }

  return prev.activeTab ?? resolveDefaultActiveTab(payerAddress, totalCreditUsd)
}

function hasCreditBalance(totalCreditUsd: string | null): boolean {
  return totalCreditUsd !== null && BigInt(totalCreditUsd) > 0n
}

function deriveStatus(params: {
  isConnected: boolean
  chainId: number | null
  gBalance: string | null
  buyerPubKey: string | null
  buyerPrvKey: string | null
  operatorConsented: boolean
  currentStatus: AiCreditsWidgetStatus
}): AiCreditsWidgetStatus {
  const {
    isConnected,
    chainId,
    gBalance,
    buyerPubKey,
    buyerPrvKey,
    operatorConsented,
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

  if (currentStatus === 'connecting' && gBalance === null) {
    return 'connecting'
  }

  if (!isConnected) {
    return currentStatus === 'connecting' ? 'connecting' : 'disconnected'
  }

  if (chainId !== null && chainId !== CELO_CHAIN_ID) return 'unsupported_chain'

  if (gBalance === null) return 'purchase_setup'

  const balance = Number.parseFloat(gBalance)
  if (balance <= 0) return 'purchase_setup'

  const minBalance = Number.parseFloat(MIN_DEPOSIT_AMOUNT)

  if (balance < minBalance) return 'insufficient_g_balance'

  if (operatorConsented && !!buyerPubKey) return 'quote_ready'

  if (!buyerPubKey || !buyerPrvKey || !operatorConsented) return 'purchase_setup'

  return 'quote_ready'
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
    buyerPrvKey: merged.buyerPrvKey,
    operatorConsented: merged.operatorConsented,
    currentStatus: merged.status,
  })
  return {
    ...merged,
    status,
    activeTab: resolveActiveTab(prev, overrides),
  }
}

function mergeStatePreservingNonBuyTab(
  prev: AiCreditsWidgetAdapterState,
  overrides: Partial<AiCreditsWidgetAdapterState>,
): AiCreditsWidgetAdapterState {
  const nextTab = overrides.activeTab ?? prev.activeTab
  if (!isNonBuyTab(prev.activeTab) && !isNonBuyTab(nextTab)) {
    return withDerivedStatus(prev, overrides, true)
  }
  const activeTab = isNonBuyTab(nextTab) ? nextTab : prev.activeTab
  const status = deriveStatus({
    isConnected: !needsWalletConnection(prev),
    chainId: overrides.chainId ?? prev.chainId,
    gBalance: overrides.gBalance ?? prev.gBalance,
    buyerPubKey: overrides.buyerPubKey ?? prev.buyerPubKey,
    buyerPrvKey: overrides.buyerPrvKey ?? prev.buyerPrvKey,
    operatorConsented: overrides.operatorConsented ?? prev.operatorConsented,
    currentStatus: overrides.status ?? prev.status,
  })
  return {
    ...prev,
    ...overrides,
    status,
    activeTab,
  }
}

function viewToStatePatch(
  view: AccountView,
  enriched: AccountEnrichment,
  prev: AiCreditsWidgetAdapterState,
  options?: {
    balanceMode?: 'if_positive' | 'always'
  },
): Partial<AiCreditsWidgetAdapterState> {
  const operatorAccepted = view.operator.operatorAccepted
  const totalCreditUsd = enriched.totalCreditUsd
  const balanceMode = options?.balanceMode ?? 'if_positive'

  return {
    totalCreditUsd:
      balanceMode === 'always' || hasCreditBalance(totalCreditUsd)
        ? totalCreditUsd
        : prev.totalCreditUsd,
    isGoodIdVerified: enriched.goodIdVerified,
    operatorConsented: operatorAccepted,
    operatorAddress: view.operator.operatorAddress ?? null,
    currentOperator: view.operator.currentOperator ?? null,
    withdrawableUsd: view.withdrawableUsd,
    totalGdDepositedG: enriched.totalGdDepositedG,
    monthlyStreamG: enriched.monthlyStreamG,
  }
}

function activateBuyerSelection(
  payer: string,
  buyers: string[],
  selectedAddress: string | null,
) {
  setActiveBuyerAddress(payer, selectedAddress)
  return buildBuyerStateFields(payer, buyers, selectedAddress)
}

export interface UseAiCreditsAdapterOptions {
  environment?: AiCreditsWidgetEnvironment
  backendUrl?: string
  baseRpcUrl?: string
  celoRpcUrl?: string
  fundingVaultAddress?: Address
  vaultAddress?: Address
  goodIdAddress?: Address
  goodIdReturnUrl?: string
  onPaySuccess?: (detail: AiCreditsPaySuccessDetail) => void
  onPayError?: (detail: AiCreditsPayErrorDetail) => void
  backendClient?: AiCreditsBackendClient
  chainClient?: AiCreditsChainClient
  skipVaultPaymentValidation?: boolean
  prepareSettlement?: (ref: AccountRef, creditUsd: bigint) => void
}

export function useAiCreditsAdapter({
  environment = 'production',
  backendUrl,
  baseRpcUrl,
  celoRpcUrl,
  fundingVaultAddress,
  vaultAddress,
  goodIdAddress,
  goodIdReturnUrl,
  onPaySuccess,
  onPayError,
  backendClient: backendClientOverride,
  chainClient: chainClientOverride,
  skipVaultPaymentValidation = false,
  prepareSettlement,
}: UseAiCreditsAdapterOptions): AiCreditsWidgetAdapterResult {
  const { address, chainId, isConnected, provider, connect } = useWallet()
  const [state, setState] = useState<AiCreditsWidgetAdapterState>(INITIAL_STATE)
  const configurationError =
    backendClientOverride || backendUrl
      ? null
      : 'AI Credits backend is not configured'

  const providerRef = useRef<EIP1193Provider | null>(null)
  providerRef.current = provider as EIP1193Provider | null
  const goodIdVerifyPendingRef = useRef(false)
  const pendingDeepLinkRef = useRef<DeepLinkParams | null>(null)
  const deepLinkParseDoneRef = useRef(false)
  const deepLinkApplyInFlightRef = useRef(false)

  const celoVault = vaultAddress ?? CELO_GD_ANTSEED_VAULT_FALLBACK

  const backendClient = useMemo<AiCreditsBackendClient>(
    () => backendClientOverride ?? createBackendClient(backendUrl),
    [backendClientOverride, backendUrl],
  )

  const chainClient = useMemo<AiCreditsChainClient>(
    () =>
      chainClientOverride ??
      createChainClient({
        baseRpcUrl,
        celoRpcUrl,
        fundingVaultAddress,
        celoVaultAddress: celoVault,
        celoGoodIdAddress: goodIdAddress ?? CELO_GOODID_ADDRESS,
      }),
    [chainClientOverride, baseRpcUrl, celoRpcUrl, fundingVaultAddress, celoVault, goodIdAddress],
  )

  useEffect(() => {
    if (!isConnected || !address) {
      setState((prev) => {
        if (prev.status === 'connecting') return prev
        if (!prev.address && prev.status === 'disconnected' && prev.error === null) return prev
        return { ...INITIAL_STATE }
      })
      return
    }
    if (configurationError) {
      setState((prev) => ({
        ...prev,
        address,
        chainId,
        status: 'backend_unavailable',
        error: configurationError,
      }))
      return
    }

    let cancelled = false
    const sessionPatch = patchPayerSessionFields(address)

    setState((prev) => {
      if (
        prev.status === 'payment_pending' ||
        prev.status === 'payment_confirmed' ||
        prev.status === 'payment_failed'
      ) {
        return prev
      }
      return withDerivedStatus(
        prev,
        {
          address,
          chainId,
          buyerPubKey: sessionPatch.buyerPubKey,
          buyerPrvKey: sessionPatch.buyerPrvKey,
          operatorSignature: sessionPatch.operatorSignature,
          operatorConsented: sessionPatch.operatorConsented,
          derivedBuyerAddress: sessionPatch.derivedBuyerAddress,
          buyers: prev.buyers,
          ...WALLET_LOADING_STATE,
          error: null,
          status: 'connecting',
        },
        true,
      )
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

      const pendingDeepLink = pendingDeepLinkRef.current
      const sessionBuyer = patchPayerSessionFields(address!).buyerPubKey
      const preferredBuyer = pendingDeepLink?.buyerAddress ?? sessionBuyer ?? null

      const accountPromise =
        pendingDeepLink || deepLinkApplyInFlightRef.current
          ? Promise.resolve(null)
          : buildAccountView(address!, backendClient, chainClient, {
              buyerAddress: preferredBuyer,
            })
              .then(async (view) => ({
                view,
                enriched: await enrichAccountView(view, chainClient),
              }))
              .catch(() => null)

      const minimumsPromise =
        skipVaultPaymentValidation
          ? Promise.resolve({
              minDepositUsd: '1.00',
              minStreamUsd: '1.00',
            })
          : fetchVaultPaymentMinimums(publicClient, celoVault, address as Address).catch(() => null)

      const gdUsdPerTokenPromise = chainClient.fetchGdUsdPerToken().catch(() => null)
      const discountConfigPromise = backendClient.getDiscountConfig().catch(() => null)
      const buyersPromise = pendingDeepLink
        ? Promise.resolve(
            rememberBuyerAddresses(address!, [
              preferredBuyer,
              ...listKnownBuyerAddresses(address!),
            ]),
          )
        : discoverBuyersFromHistory(
            address!,
            backendClient,
            preferredBuyer,
            ...listKnownBuyerAddresses(address!),
          )

      try {
        const [[rawBalance, decimals], account, minimums, gdUsdPerToken, discountConfig, buyers] =
          await Promise.all([
            balancePromise,
            accountPromise,
            minimumsPromise,
            gdUsdPerTokenPromise,
            discountConfigPromise,
            buyersPromise,
          ])
        if (cancelled) return

        const patch: Partial<AiCreditsWidgetAdapterState> = {
          address,
          chainId,
          gBalance: formatUnits(rawBalance as bigint, decimals as number),
          gdUsdPerToken,
          minDepositUsd: minimums?.minDepositUsd ?? null,
          minStreamUsd: minimums?.minStreamUsd ?? null,
          depositBonusPercent:
            discountConfig?.depositBonusPercent ?? DEFAULT_DISCOUNT_CONFIG.depositBonusPercent,
          streamBonusPercent:
            discountConfig?.streamBonusPercent ?? DEFAULT_DISCOUNT_CONFIG.streamBonusPercent,
        }

        if (pendingDeepLink || deepLinkApplyInFlightRef.current) {
          setState((prev) =>
            withDerivedStatus(
              prev,
              {
                ...patch,
                buyers: mergeBuyerAddressList(prev.buyers, ...buyers),
              },
              true,
            ),
          )
          return
        }

        const selectedBuyer = selectPreferredBuyer(buyers, preferredBuyer)
        const accountPatch = account
          ? viewToStatePatch(account.view, account.enriched, INITIAL_STATE, {
              balanceMode: 'always',
            })
          : {}
        if (selectedBuyer && accountPatch.operatorConsented !== undefined) {
          setBuyerOperatorConsented(address!, selectedBuyer, accountPatch.operatorConsented)
        }
        const buyerFields = activateBuyerSelection(address!, buyers, selectedBuyer)
        setState((prev) =>
          withDerivedStatus(
            prev,
            {
              ...patch,
              ...accountPatch,
              ...buyerFields,
              operatorConsented:
                accountPatch.operatorConsented ?? buyerFields.operatorConsented,
            },
            true,
          ),
        )
      } catch {
        if (cancelled) return
        setState((prev) => {
          return withDerivedStatus(
            prev,
            {
              address,
              chainId,
              gBalance: '0',
              buyers: [],
              derivedBuyerAddress: null,
              buyerPubKey: null,
              buyerPrvKey: null,
              operatorSignature: null,
              operatorConsented: false,
              status:
                chainId !== null && chainId !== CELO_CHAIN_ID
                  ? 'unsupported_chain'
                  : 'purchase_setup',
            },
            true,
          )
        })
      }
    }

    void loadWalletData()
    return () => {
      cancelled = true
    }
  }, [isConnected, address, chainId, backendClient, chainClient, celoVault, configurationError])

  const handleConnect = useCallback(async () => {
    setState((prev) => withDerivedStatus(prev, { status: 'connecting', error: null }, false))
    try {
      await connect()
    } catch {
      setState((prev) => withDerivedStatus(prev, { status: 'disconnected', error: null }, false))
      return
    }

    // Some wallet flows resolve without throwing when the modal is dismissed.
    // If no provider/account event updated the state, restore the idle disconnected state.
    setState((prev) => {
      if (prev.status !== 'connecting') return prev
      return withDerivedStatus(prev, { status: 'disconnected', error: null }, false)
    })
  }, [connect])

  const handleSwitchChain = useCallback(async () => {
    const prov = providerRef.current
    if (!prov) return
    await (
      prov as { request: (args: { method: string; params: unknown[] }) => Promise<unknown> }
    ).request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${CELO_CHAIN_ID.toString(16)}` }],
    })
  }, [])

  /**
   * Creates or restores the single deterministic wallet buyer.
   * If that buyer already exists with a private key, it is selected instead of re-derived.
   */
  const handleGenerateBuyerKey = useCallback(async () => {
    if (!address || !providerRef.current) {
      setState((prev) =>
        withDerivedStatus(
          prev,
          { error: 'Connect your wallet before generating a signer key' },
          true,
        ),
      )
      return
    }

    const payerAddress = address as Address
    const session = readPayerSession(payerAddress)
    const derivedAddress = session?.derivedBuyerAddress ?? null
    const existingKey = derivedAddress ? getBuyerKeyEntry(payerAddress, derivedAddress) : null

    if (derivedAddress && existingKey?.privateKey) {
      const buyers = mergeBuyerAddressList(
        listKnownBuyerAddresses(payerAddress),
        derivedAddress,
      )
      const buyerFields = activateBuyerSelection(payerAddress, buyers, derivedAddress)
      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          ...buyerFields,
          error: null,
          ...(!isNonBuyTab(prev.activeTab) ? { status: 'purchase_setup' } : {}),
        }),
      )
      return
    }

    try {
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
      const buyerAccount = privateKeyToAccount(privateKey)

      upsertBuyerKey(
        payerAddress,
        buyerAccount.address,
        { privateKey },
        { setActive: true, setDerived: true },
      )

      const buyers = mergeBuyerAddressList(
        listKnownBuyerAddresses(payerAddress),
        buyerAccount.address,
      )
      const buyerFields = buildBuyerStateFields(payerAddress, buyers, buyerAccount.address)
      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          ...buyerFields,
          error: null,
          ...(!isNonBuyTab(prev.activeTab) ? { status: 'purchase_setup' } : {}),
        }),
      )
    } catch (err: unknown) {
      setState((prev) =>
        withDerivedStatus(
          prev,
          {
            error: err instanceof Error ? err.message : 'Buyer key generation was rejected',
          },
          true,
        ),
      )
    }
  }, [address])

  const handleSelectBuyer = useCallback(
    async (buyerAddress: string) => {
      if (!address) return
      const known = listKnownBuyerAddresses(address)
      if (!known.some((item) => item.toLowerCase() === buyerAddress.toLowerCase())) {
        return
      }

      const buyers = mergeBuyerAddressList(known, buyerAddress)
      const buyerFields = activateBuyerSelection(address, buyers, buyerAddress)
      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          ...buyerFields,
          operatorAddress: null,
          currentOperator: null,
          totalCreditUsd: null,
          withdrawableUsd: null,
          totalGdDepositedG: null,
          monthlyStreamG: null,
          operatorConsentPending: false,
          error: null,
        }),
      )

      try {
        const view = await buildAccountView(address, backendClient, chainClient, {
          buyerAddress,
        })
        const enriched = await enrichAccountView(view, chainClient)
        const accountPatch = viewToStatePatch(view, enriched, INITIAL_STATE, {
          balanceMode: 'always',
        })
        if (accountPatch.operatorConsented !== undefined) {
          setBuyerOperatorConsented(address, buyerAddress, accountPatch.operatorConsented)
        }
        const nextBuyerFields = buildBuyerStateFields(address, buyers, buyerAddress)
        setState((prev) =>
          mergeStatePreservingNonBuyTab(prev, {
            ...accountPatch,
            ...nextBuyerFields,
            operatorConsented:
              accountPatch.operatorConsented ?? nextBuyerFields.operatorConsented,
            error: null,
          }),
        )
      } catch (err: unknown) {
        setState((prev) =>
          mergeStatePreservingNonBuyTab(prev, {
            error: err instanceof Error ? err.message : 'Could not load buyer account',
          }),
        )
      }
    },
    [address, backendClient, chainClient],
  )

  const handleDiscoverBuyers = useCallback(
    (addresses: string[]) => {
      if (!address || addresses.length === 0) return
      const buyers = rememberBuyerAddresses(address, addresses)
      setState((prev) => {
        const sameLength = buyers.length === prev.buyers.length
        const unchanged =
          sameLength &&
          buyers.every(
            (item, index) => item.toLowerCase() === prev.buyers[index]?.toLowerCase(),
          )
        if (unchanged) return prev
        return { ...prev, buyers }
      })
    },
    [address],
  )

  const handleImportBuyerFromPrivateKey = useCallback(
    async (rawPrivateKey: string): Promise<string | null> => {
      if (!address) {
        setState((prev) =>
          withDerivedStatus(prev, { error: 'Connect your wallet before importing a signer key' }, true),
        )
        return null
      }

      const trimmed = rawPrivateKey.trim()
      const normalized = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`
      if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
        setState((prev) =>
          withDerivedStatus(
            prev,
            { error: 'Invalid private key format — expected 0x followed by 64 hex characters' },
            true,
          ),
        )
        return null
      }

      try {
        const privateKey = normalized as `0x${string}`
        const buyerAccount = privateKeyToAccount(privateKey)
        upsertBuyerKey(address, buyerAccount.address, { privateKey }, { setActive: true })

        const buyers = mergeBuyerAddressList(
          listKnownBuyerAddresses(address),
          buyerAccount.address,
        )
        const buyerFields = buildBuyerStateFields(address, buyers, buyerAccount.address)
        setState((prev) =>
          mergeStatePreservingNonBuyTab(prev, {
            ...buyerFields,
            operatorAddress: null,
            currentOperator: null,
            totalCreditUsd: null,
            withdrawableUsd: null,
            totalGdDepositedG: null,
            monthlyStreamG: null,
            error: null,
            ...(!isNonBuyTab(prev.activeTab) ? { status: 'purchase_setup' } : {}),
          }),
        )

        try {
          const view = await buildAccountView(address, backendClient, chainClient, {
            buyerAddress: buyerAccount.address,
          })
          const enriched = await enrichAccountView(view, chainClient)
          const accountPatch = viewToStatePatch(view, enriched, INITIAL_STATE, {
            balanceMode: 'always',
          })
          if (accountPatch.operatorConsented !== undefined) {
            setBuyerOperatorConsented(
              address,
              buyerAccount.address,
              accountPatch.operatorConsented,
            )
          }
          const nextBuyerFields = buildBuyerStateFields(
            address,
            buyers,
            buyerAccount.address,
          )
          setState((prev) =>
            mergeStatePreservingNonBuyTab(prev, {
              ...accountPatch,
              ...nextBuyerFields,
              operatorConsented:
                accountPatch.operatorConsented ?? nextBuyerFields.operatorConsented,
              error: null,
            }),
          )
        } catch {
          return buyerAccount.address
        }

        return buyerAccount.address
      } catch {
        setState((prev) =>
          withDerivedStatus(prev, { error: 'Could not derive an account from the provided private key' }, true),
        )
        return null
      }
    },
    [address, backendClient, chainClient],
  )

  const resolveBuyerList = useCallback(
    (payer: string, preferredBuyer?: string | null) => resolveLocalBuyers(payer, preferredBuyer),
    [],
  )

  /**
   * Registers a buyer from an NCDI deep link and submits the pre-signed
   * operator-approval token. Never stores a buyer private key from the URL.
   */
  const handleApplyDeepLinkBuyer = useCallback(
    async (buyerAddress: string, operatorSignature: string) => {
      if (!address) {
        return
      }

      const trimmedAddress = buyerAddress.trim()
      const trimmedSignature = operatorSignature.trim()

      if (!isValidBuyerAddress(trimmedAddress)) {
        setState((prev) =>
          withDerivedStatus(
            prev,
            {
              error: deepLinkManualFallbackMessage('Deep-link buyerAddress is invalid.'),
              activeTab: 'buy',
              status: 'purchase_setup',
            },
            true,
          ),
        )
        return
      }

      if (!isValidOperatorSignature(trimmedSignature)) {
        setState((prev) =>
          withDerivedStatus(
            prev,
            {
              error: deepLinkManualFallbackMessage('Deep-link operatorSignature is invalid.'),
              activeTab: 'buy',
              status: 'purchase_setup',
            },
            true,
          ),
        )
        return
      }

      // Pre-fill the buyer identity and the pending signature only. Consent must never be
      // submitted here — it is only ever submitted from handleSignOperatorConsent, in
      // response to an explicit user click on OperatorConsentStep. A deep-link-supplied
      // signature is not itself user approval; it just saves the user from re-signing.
      storeDeepLinkParams({
        buyerAddress: trimmedAddress,
        operatorSignature: trimmedSignature,
      })

      upsertBuyerKey(
        address,
        trimmedAddress,
        { operatorSignature: trimmedSignature },
        { setActive: true },
      )

      const buyers = mergeBuyerAddressList(listKnownBuyerAddresses(address), trimmedAddress)
      const buyerFields = buildBuyerStateFields(address, buyers, trimmedAddress)
      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          ...buyerFields,
          operatorAddress: null,
          currentOperator: null,
          totalCreditUsd: null,
          withdrawableUsd: null,
          totalGdDepositedG: null,
          monthlyStreamG: null,
          activeTab: 'buy',
          operatorConsentPending: false,
          error: null,
        }),
      )
    },
    [address],
  )

  const handleSignOperatorConsent = useCallback(async () => {
    const currentState = state
    if (!currentState.address || !currentState.buyerPubKey) {
      setState((prev) =>
        withDerivedStatus(
          prev,
          { error: 'Select a buyer before authorizing your wallet' },
          true,
        ),
      )
      return
    }

    const keyEntry = getBuyerKeyEntry(currentState.address, currentState.buyerPubKey)
    const storedOperatorSignature =
      currentState.operatorSignature ?? keyEntry?.operatorSignature ?? null

    if (!currentState.buyerPrvKey && !storedOperatorSignature) {
      setState((prev) =>
        withDerivedStatus(
          prev,
          { error: 'Generate a signer key before authorizing your wallet' },
          true,
        ),
      )
      return
    }

    if (currentState.operatorConsentPending) return

    const ref: AccountRef = { payer: currentState.address, buyer: currentState.buyerPubKey }
    const onNonBuyTab = isNonBuyTab(currentState.activeTab)

    setState((prev) => ({
      ...prev,
      operatorConsentPending: true,
      error: null,
    }))

    try {
      const operatorStatus = await chainClient.getBuyerOperatorStatus(ref)

      if (!operatorStatus.enabled) {
        throw new Error('Operator consent is not available')
      }

      const hasDifferentOperator =
        operatorStatus.currentOperator !==
          '0x0000000000000000000000000000000000000000' &&
        !operatorStatus.operatorAccepted
      if (hasDifferentOperator) {
        throw new Error(
          'This signer key is already controlled by another operator. Import a different signer key or generate a new one.',
        )
      }

      if (operatorStatus.operatorAccepted) {
        setBuyerOperatorConsented(currentState.address, currentState.buyerPubKey, true)
        const buyerList = resolveBuyerList(currentState.address, currentState.buyerPubKey)
        const buyerFields = buildBuyerStateFields(
          currentState.address,
          buyerList.buyers,
          buyerList.selected,
        )
        setState((prev) =>
          mergeStatePreservingNonBuyTab(prev, {
            ...buyerFields,
            operatorConsented: true,
            operatorConsentPending: false,
            error: null,
            ...(!onNonBuyTab ? { status: 'purchase_setup' } : {}),
          }),
        )
        clearDeepLinkArtifacts()
        return
      }

      let buyerSig: `0x${string}`
      if (currentState.buyerPrvKey) {
        const payload = await chainClient.buildOperatorConsentPayload(ref, operatorStatus)

        if (!payload.enabled || !payload.typedData) {
          throw new Error('Operator consent is not available')
        }

        buyerSig = await signOperatorConsentFromTypedData(
          currentState.buyerPrvKey as `0x${string}`,
          payload.typedData,
        )
      } else if (storedOperatorSignature) {
        buyerSig = storedOperatorSignature as `0x${string}`
      } else {
        throw new Error('Generate a signer key before authorizing your wallet')
      }

      await backendClient.submitOperatorConsent(ref.buyer, {
        nonce: operatorStatus.consentNonce,
        signature: buyerSig,
      })
      await waitForOperatorConsent(chainClient, ref)

      setBuyerOperatorConsented(currentState.address, currentState.buyerPubKey, true)
      const buyerList = resolveBuyerList(currentState.address, currentState.buyerPubKey)
      const buyerFields = buildBuyerStateFields(
        currentState.address,
        buyerList.buyers,
        buyerList.selected,
      )
      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          ...buyerFields,
          operatorConsented: true,
          operatorConsentPending: false,
          error: null,
          ...(!onNonBuyTab ? { status: 'purchase_setup' } : {}),
        }),
      )
      clearDeepLinkArtifacts()
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        operatorConsentPending: false,
        error: err instanceof Error ? err.message : 'Operator consent signature rejected',
      }))
    }
  }, [state, backendClient, chainClient, resolveBuyerList])

  const handleSyncOperatorConsentFromChain = useCallback(async () => {
    const currentState = state
    if (!currentState.address || !currentState.buyerPubKey || currentState.operatorConsented) {
      return
    }

    try {
      const ref: AccountRef = { payer: currentState.address, buyer: currentState.buyerPubKey }
      const operatorStatus = await chainClient.getBuyerOperatorStatus(ref)
      if (!operatorStatus.operatorAccepted) return

      setBuyerOperatorConsented(currentState.address, currentState.buyerPubKey, true)
      const onNonBuyTab = isNonBuyTab(currentState.activeTab)
      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          operatorConsented: true,
          error: null,
          ...(!onNonBuyTab ? { status: 'purchase_setup' } : {}),
        }),
      )
    } catch {
      return
    }
  }, [state, chainClient])

  const handleBuildQuote = useCallback(
    async (depositG: string, streamG: string): Promise<AiCreditsQuote> => {
      const quote = await chainClient.buildQuote(depositG, streamG)
      if (state.gdUsdPerToken === null) {
        try {
          const gdUsdPerToken = await chainClient.fetchGdUsdPerToken()
          setState((prev) => ({ ...prev, gdUsdPerToken }))
        } catch {
          return quote
        }
      }
      return quote
    },
    [chainClient, state.gdUsdPerToken],
  )

  const handlePay = useCallback(
    async (quote: AiCreditsQuote) => {
      const currentState = state

      if (!currentState.address || !currentState.buyerPubKey || !providerRef.current) {
        throw new Error('Connect your wallet and generate a signer key before paying')
      }

      const hasDeposit = Number.parseFloat(quote.depositAmountG) > 0
      const streamChanged = isStreamAmountChanged(quote.streamAmountG, currentState.monthlyStreamG)
      if (!hasDeposit && !streamChanged) {
        throw new Error('Enter a deposit or change the monthly stream amount')
      }

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
        throw new Error('Could not build quote — check chain connectivity')
      }

      if (gdUsdPerToken === null) {
        throw new Error('Could not build quote — check chain connectivity')
      }

      if (!skipVaultPaymentValidation) {
        try {
          const publicClient = createPublicClient({ chain: CELO_CHAIN, transport: http() })
          await validateVaultPaymentAmounts({
            publicClient,
            vault: celoVault,
            payer: currentState.address as Address,
            depositAmount: quote.depositAmountG,
            streamAmount: quote.streamAmountG,
            currentStreamAmount: currentState.monthlyStreamG,
          })
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Payment amount below vault minimum'
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
          throw error instanceof Error ? error : new Error(message)
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

        if (prepareSettlement) {
          const creditUsdMicro = quoteTotalUsdMicro(quote, gdUsdPerToken, currentState.isGoodIdVerified, {
            depositBonusPercent: currentState.depositBonusPercent,
            streamBonusPercent: currentState.streamBonusPercent,
          })
          prepareSettlement(accountRef, creditUsdMicro)
        }

        const { txHashes } = await executeCeloPayment({
          walletClient,
          publicClient,
          payer: payerAddress,
          buyer: buyerAddress,
          vault,
          depositAmountG: quote.depositAmountG,
          streamAmountG: quote.streamAmountG,
          currentStreamAmountG: currentState.monthlyStreamG,
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

        const creditUsdMicro = (BigInt(totalCreditUsd) - BigInt(balanceBefore || '0')).toString()

        const buyerList = resolveBuyerList(currentState.address, currentState.buyerPubKey)
        const buyerFields = buildBuyerStateFields(
          currentState.address,
          buyerList.buyers,
          buyerList.selected,
        )

        setState((prev) =>
          withDerivedStatus(prev, {
            ...buyerFields,
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
      } catch (error) {
        const message = mapPaymentError(error)
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
        throw new Error(message)
      }
    },
    [
      state,
      backendClient,
      chainClient,
      celoVault,
      onPaySuccess,
      onPayError,
      resolveBuyerList,
      prepareSettlement,
      skipVaultPaymentValidation,
    ],
  )

  const handleRefresh = useCallback(
    async (options?: { afterGoodIdVerify?: boolean }) => {
      const currentState = state
      if (!currentState.address) return

      try {
        const preferredBuyer = currentState.buyerPubKey
        const buyerList = resolveBuyerList(currentState.address, preferredBuyer)
        const [view, discountConfig] = await Promise.all([
          buildAccountView(currentState.address, backendClient, chainClient, {
            buyerAddress: preferredBuyer,
          }),
          backendClient.getDiscountConfig().catch(() => null),
        ])
        const enriched = await enrichAccountView(view, chainClient)
        const accountPatch = viewToStatePatch(view, enriched, INITIAL_STATE, {
          balanceMode: 'always',
        })
        if (
          preferredBuyer &&
          accountPatch.operatorConsented !== undefined &&
          currentState.address
        ) {
          setBuyerOperatorConsented(
            currentState.address,
            preferredBuyer,
            accountPatch.operatorConsented,
          )
        }
        const buyerFields = buildBuyerStateFields(
          currentState.address,
          buyerList.buyers,
          buyerList.selected,
        )

        setState((prev) => {
          const statusSeed =
            options?.afterGoodIdVerify && prev.status === 'payment_failed'
              ? 'quote_ready'
              : prev.status === 'backend_unavailable'
                ? 'purchase_setup'
                : prev.status
          return withDerivedStatus(
            { ...prev, status: statusSeed },
            {
              ...accountPatch,
              ...buyerFields,
              operatorConsented:
                accountPatch.operatorConsented ?? buyerFields.operatorConsented,
              activeTab: prev.activeTab,
              error: null,
              depositBonusPercent:
                discountConfig?.depositBonusPercent ?? prev.depositBonusPercent,
              streamBonusPercent: discountConfig?.streamBonusPercent ?? prev.streamBonusPercent,
            },
            true,
          )
        })
      } catch {
        setState((prev) =>
          mergeStatePreservingNonBuyTab(prev, {
            status: 'backend_unavailable',
            error: 'Could not reach backend — check your connection',
          }),
        )
      }
    },
    [state, backendClient, chainClient, resolveBuyerList],
  )

  const handleVerifyGoodId = useCallback(async (): Promise<boolean> => {
    const currentState = state
    if (!currentState.address || !providerRef.current) {
      setState((prev) =>
        withDerivedStatus(
          prev,
          { error: 'Connect your wallet on Celo to verify with GoodID' },
          true,
        ),
      )
      return false
    }
    if (currentState.chainId !== CELO_CHAIN_ID) {
      setState((prev) =>
        withDerivedStatus(prev, { error: 'Switch to Celo to verify with GoodID' }, true),
      )
      return false
    }

    try {
      await startGoodIdVerification({
        provider: providerRef.current,
        address: currentState.address,
        chainId: CELO_CHAIN_ID,
        environment,
        returnUrl: goodIdReturnUrl,
      })
      goodIdVerifyPendingRef.current = true
      setState((prev) => ({ ...prev, error: null }))
      return true
    } catch (err) {
      if (isUserRejectedWalletRequest(err)) {
        return false
      }
      setState((prev) =>
        withDerivedStatus(
          prev,
          {
            error: err instanceof Error ? err.message : 'Could not start GoodID verification',
          },
          true,
        ),
      )
      return false
    }
  }, [state, environment, goodIdReturnUrl])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onFocus = () => {
      if (!goodIdVerifyPendingRef.current) return
      goodIdVerifyPendingRef.current = false
      void handleRefresh({ afterGoodIdVerify: true })
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [handleRefresh])

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
      if (!currentState.buyerPrvKey) {
        setState((prev) => ({
          ...prev,
          error:
            'Sign with your payer wallet in Buyer & Operator below to generate the buyer private key before closing a channel',
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
          buyerPrivateKey: currentState.buyerPrvKey as `0x${string}`,
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
      if (!currentState.buyerPrvKey) {
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
          buyerPrivateKey: currentState.buyerPrvKey as `0x${string}`,
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
    if (configurationError) {
      setState((prev) => ({
        ...prev,
        status: 'backend_unavailable',
        error: configurationError,
      }))
      return
    }
    await handleRefresh()
  }, [configurationError, handleRefresh])

  const handleSetActiveTab = useCallback((tab: AiCreditsWidgetTab) => {
    setState((prev) => {
      if (needsWalletConnection(prev)) {
        if (tab === 'setup') {
          return mergeStatePreservingNonBuyTab(prev, { activeTab: 'setup', error: null })
        }
        return prev
      }
      if (tab === 'buy') {
        return withDerivedStatus(prev, { activeTab: 'buy', status: 'purchase_setup', error: null }, true)
      }
      return mergeStatePreservingNonBuyTab(prev, { activeTab: tab, error: null })
    })
  }, [])

  const handleStartPurchase = useCallback(() => {
    handleSetActiveTab('buy')
  }, [handleSetActiveTab])

  useEffect(() => {
    if (typeof window === 'undefined' || deepLinkParseDoneRef.current) return
    deepLinkParseDoneRef.current = true

    const parsed = resolveDeepLinkParams(window.location.search)
    if (parsed.status === 'absent') return

    if (parsed.status === 'partial') {
      const missing =
        parsed.present === 'buyerAddress' ? 'operatorSignature' : 'buyerAddress'
      setState((prev) =>
        withDerivedStatus(
          prev,
          {
            error: deepLinkManualFallbackMessage(`Deep link is missing ${missing}.`),
            activeTab: 'buy',
            status: 'purchase_setup',
          },
          false,
        ),
      )
      return
    }

    if (parsed.status === 'invalid') {
      setState((prev) =>
        withDerivedStatus(
          prev,
          {
            error: deepLinkManualFallbackMessage(`${parsed.reason}.`),
            activeTab: 'buy',
            status: 'purchase_setup',
          },
          false,
        ),
      )
      return
    }

    pendingDeepLinkRef.current = parsed.value
  }, [])

  useEffect(() => {
    const pending = pendingDeepLinkRef.current
    if (!address || !pending || deepLinkApplyInFlightRef.current) return

    deepLinkApplyInFlightRef.current = true
    void handleApplyDeepLinkBuyer(pending.buyerAddress, pending.operatorSignature).finally(() => {
      deepLinkApplyInFlightRef.current = false
      pendingDeepLinkRef.current = null
    })
  }, [address, handleApplyDeepLinkBuyer])

  const actions: AiCreditsWidgetAdapterActions = useMemo(
    () => ({
      connect: handleConnect,
      switchChain: handleSwitchChain,
      generateBuyerKey: handleGenerateBuyerKey,
      selectBuyer: handleSelectBuyer,
      discoverBuyers: handleDiscoverBuyers,
      importBuyerFromPrivateKey: handleImportBuyerFromPrivateKey,
      applyDeepLinkBuyer: handleApplyDeepLinkBuyer,
      signOperatorConsent: handleSignOperatorConsent,
      syncOperatorConsentFromChain: handleSyncOperatorConsentFromChain,
      buildQuote: handleBuildQuote,
      pay: handlePay,
      refresh: handleRefresh,
      verifyGoodId: handleVerifyGoodId,
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
      handleSelectBuyer,
      handleDiscoverBuyers,
      handleImportBuyerFromPrivateKey,
      handleApplyDeepLinkBuyer,
      handleSignOperatorConsent,
      handleSyncOperatorConsentFromChain,
      handleBuildQuote,
      handlePay,
      handleRefresh,
      handleVerifyGoodId,
      handleStartPurchase,
      handleSetActiveTab,
      handleCloseChannel,
      handleWithdrawCredits,
      handleRetry,
    ],
  )

  return { state, actions }
}
