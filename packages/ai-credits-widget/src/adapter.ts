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
  MockAiCreditsBackendClient,
  totalCreditUsdFromProfile,
  buildAccountView,
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
  addressesMatch,
  patchPayerSessionFields,
  patchPayerSession,
  readPayerSession,
  addBuyerToSession,
} from './payerSession'
import type { BuyerRecord } from './payerSession'
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
  operatorConsented: false,
  operatorAddress: null,
  minDepositUsd: null,
  minStreamUsd: null,
  totalGdDepositedG: null,
  monthlyStreamG: null,
  withdrawableUsd: null,
  depositBonusPercent: DEFAULT_DISCOUNT_CONFIG.depositBonusPercent,
  streamBonusPercent: DEFAULT_DISCOUNT_CONFIG.streamBonusPercent,
  error: null,
  activeTab: 'buy',
  buyers: [],
  activeBuyerAddress: null,
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

function isNonBuyTab(tab: AiCreditsWidgetTab): boolean {
  return tab === 'manage' || tab === 'history'
}

function resolveActiveTab(
  prev: AiCreditsWidgetAdapterState,
  overrides: Partial<AiCreditsWidgetAdapterState>,
): AiCreditsWidgetTab {
  if (overrides.activeTab !== undefined) return overrides.activeTab

  if (overrides.totalCreditUsd !== undefined && overrides.totalCreditUsd !== null) {
    return hasCreditBalance(overrides.totalCreditUsd) ? 'manage' : 'buy'
  }

  return prev.activeTab ?? 'buy'
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
  error: string | null
  currentStatus: AiCreditsWidgetStatus
  activeTab: AiCreditsWidgetTab
}): AiCreditsWidgetStatus {
  const {
    isConnected,
    chainId,
    gBalance,
    buyerPubKey,
    buyerPrvKey,
    operatorConsented,
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

  if (currentStatus === 'connecting' && gBalance === null) {
    return 'connecting'
  }

  if (!isConnected) {
    return currentStatus === 'connecting' ? 'connecting' : 'disconnected'
  }

  if (chainId !== null && chainId !== CELO_CHAIN_ID) return 'unsupported_chain'

  if (
    error &&
    !isNonBuyTab(activeTab) &&
    currentStatus !== 'purchase_setup' &&
    currentStatus !== 'connecting' &&
    currentStatus !== 'disconnected'
  ) {
    return 'payment_failed'
  }

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
    error: merged.error,
    currentStatus: merged.status,
    activeTab: merged.activeTab,
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
    isConnected: true,
    chainId: overrides.chainId ?? prev.chainId,
    gBalance: overrides.gBalance ?? prev.gBalance,
    buyerPubKey: overrides.buyerPubKey ?? prev.buyerPubKey,
    buyerPrvKey: overrides.buyerPrvKey ?? prev.buyerPrvKey,
    operatorConsented: overrides.operatorConsented ?? prev.operatorConsented,
    error: overrides.error ?? prev.error,
    currentStatus: overrides.status ?? prev.status,
    activeTab,
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
    withdrawableUsd: view.withdrawableUsd,
    totalGdDepositedG: enriched.totalGdDepositedG,
    monthlyStreamG: enriched.monthlyStreamG,
    ...(view.buyer ? { buyerPubKey: view.buyer } : {}),
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
    'buyerPubKey' | 'buyerPrvKey' | 'operatorConsented' | 'buyers' | 'activeBuyerAddress'
  >
> {
  const buyerPubKey =
    sessionPatch.buyerPubKey ??
    accountPatch.buyerPubKey ??
    (accountSwitched ? null : prev.buyerPubKey)
  const buyerPrvKey = sessionPatch.buyerPrvKey ?? (accountSwitched ? null : prev.buyerPrvKey)
  const operatorConsented = accountSwitched
    ? (sessionPatch.operatorConsented ?? accountPatch.operatorConsented ?? false)
    : (accountPatch.operatorConsented ?? sessionPatch.operatorConsented ?? prev.operatorConsented)
  const buyers = accountSwitched ? sessionPatch.buyers : (sessionPatch.buyers.length > 0 ? sessionPatch.buyers : prev.buyers)
  const activeBuyerAddress = accountSwitched
    ? (sessionPatch.activeBuyerAddress ?? null)
    : (sessionPatch.activeBuyerAddress ?? prev.activeBuyerAddress)

  return {
    buyerPubKey,
    buyerPrvKey,
    operatorConsented,
    buyers,
    activeBuyerAddress,
  }
}

function syncOperatorConsentSession(address: string, operatorConsented: boolean | undefined): void {
  if (operatorConsented === undefined) return
  patchPayerSession(address, { operatorConsented })
}

/**
 * Ensures a buyer derived from the backend account view is reflected in the session.
 * Only adds the buyer when no session buyers exist yet (first-time sync).
 */
function syncBuyerPubKeySession(address: string, buyerPubKey: string | null | undefined): void {
  if (!buyerPubKey) return
  const existing = readPayerSession(address)
  if (existing?.buyers && existing.buyers.length > 0) return
  // Persist as a derived buyer at index 0 (legacy-compatible)
  addBuyerToSession(address, {
    address: buyerPubKey,
    type: 'derived',
    derivationIndex: 0,
    label: 'Buyer 1',
  })
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
}: UseAiCreditsAdapterOptions): AiCreditsWidgetAdapterResult {
  const { address, chainId, isConnected, provider, connect } = useWallet()
  const [state, setState] = useState<AiCreditsWidgetAdapterState>(INITIAL_STATE)

  const providerRef = useRef<EIP1193Provider | null>(null)
  providerRef.current = provider as EIP1193Provider | null
  const goodIdVerifyPendingRef = useRef(false)

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
    const sessionPatch = patchPayerSessionFields(address)

    setState((prev) => {
      if (
        prev.status === 'payment_pending' ||
        prev.status === 'payment_confirmed' ||
        prev.status === 'payment_failed' ||
        prev.status === 'backend_unavailable'
      ) {
        return prev
      }
      const accountSwitched = !addressesMatch(prev.address, address)
      const buyerFields = mergeSessionFields(prev, sessionPatch, {}, accountSwitched)
      return withDerivedStatus(
        prev,
        {
          address,
          chainId,
          ...buyerFields,
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

      const accountPromise = buildAccountView(address!, backendClient, chainClient, {
        buyerAddress: sessionPatch.buyerPubKey ?? null,
      })
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

      const gdUsdPerTokenPromise = chainClient.fetchGdUsdPerToken().catch(() => null)
      const discountConfigPromise = backendClient.getDiscountConfig().catch(() => null)

      try {
        const [[rawBalance, decimals], account, minimums, gdUsdPerToken, discountConfig] =
          await Promise.all([
            balancePromise,
            accountPromise,
            minimumsPromise,
            gdUsdPerTokenPromise,
            discountConfigPromise,
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

        setState((prev) => {
          const accountSwitched = !addressesMatch(prev.address, address)
          const accountPatch = account
            ? viewToStatePatch(account.view, account.enriched, prev, {
                balanceMode: 'always',
              })
            : {}
          const buyerFields = mergeSessionFields(prev, sessionPatch, accountPatch, accountSwitched)
          if (address && accountPatch.operatorConsented !== undefined) {
            syncOperatorConsentSession(address, accountPatch.operatorConsented)
          }
          if (address && account?.view.buyer) {
            syncBuyerPubKeySession(address, account.view.buyer)
          }
          return withDerivedStatus(
            prev,
            {
              ...patch,
              ...accountPatch,
              ...buyerFields,
              ...(account ? {} : { activeTab: 'buy' as const }),
            },
            true,
          )
        })
      } catch {
        if (cancelled) return
        setState((prev) => {
          const accountSwitched = !addressesMatch(prev.address, address)
          const buyerFields = mergeSessionFields(prev, sessionPatch, {}, accountSwitched)
          return withDerivedStatus(
            prev,
            {
              address,
              chainId,
              gBalance: '0',
              ...buyerFields,
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
  }, [isConnected, address, chainId, backendClient, chainClient, celoVault])

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
   * Creates a derived buyer at the next available derivation index.
   * Index 0 preserves the legacy single-buyer message for backward compatibility.
   */
  const handleCreateBuyer = useCallback(async () => {
    if (!address || !providerRef.current) {
      setState((prev) =>
        withDerivedStatus(
          prev,
          { error: 'Connect your wallet before creating a buyer' },
          true,
        ),
      )
      return
    }

    try {
      const payerAddress = address as Address
      const existingSession = patchPayerSessionFields(payerAddress)
      const nextIndex =
        existingSession.buyers
          .filter((b) => b.type === 'derived' && b.derivationIndex !== undefined)
          .reduce((max, b) => Math.max(max, b.derivationIndex ?? 0), -1) + 1

      const message = buildBuyerKeyMessage(payerAddress, nextIndex)
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
      const label = `Buyer ${nextIndex + 1}`

      const buyerRecord: BuyerRecord = {
        address: buyerAccount.address,
        privateKey,
        type: 'derived',
        derivationIndex: nextIndex,
        label,
      }
      addBuyerToSession(payerAddress, buyerRecord)

      const updatedSession = patchPayerSessionFields(payerAddress)
      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          buyerPubKey: buyerAccount.address,
          buyerPrvKey: privateKey,
          buyers: updatedSession.buyers,
          activeBuyerAddress: buyerAccount.address,
          operatorConsented: false,
          error: null,
          ...(!isNonBuyTab(prev.activeTab) ? { status: 'purchase_setup' } : {}),
        }),
      )
    } catch (err: unknown) {
      setState((prev) =>
        withDerivedStatus(
          prev,
          {
            error: err instanceof Error ? err.message : 'Buyer creation was rejected',
          },
          true,
        ),
      )
    }
  }, [address])

  /**
   * First-buyer entry point used by the purchase flow.
   * Delegates to createBuyer so later calls never re-derive index 0 over existing buyers.
   */
  const handleGenerateBuyerKey = useCallback(async () => {
    await handleCreateBuyer()
  }, [handleCreateBuyer])

  /**
   * Switches the active buyer to an existing one in the session.
   * Resets operator consent so it is re-verified for the newly selected buyer.
   */
  const handleSelectBuyer = useCallback(
    (buyerAddress: string) => {
      if (!address) return
      const session = patchPayerSessionFields(address)
      const target = session.buyers.find(
        (b) => b.address.toLowerCase() === buyerAddress.toLowerCase(),
      )
      if (!target) return

      patchPayerSession(address, { activeBuyerAddress: target.address, operatorConsented: false })

      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          buyerPubKey: target.address,
          buyerPrvKey: target.privateKey ?? null,
          buyers: session.buyers,
          activeBuyerAddress: target.address,
          // Reset consent and chain-loaded data for the newly selected buyer
          operatorConsented: false,
          operatorAddress: null,
          totalCreditUsd: null,
          withdrawableUsd: null,
          totalGdDepositedG: null,
          monthlyStreamG: null,
          error: null,
        }),
      )
    },
    [address],
  )

  /**
   * Imports a buyer identity from a hex-encoded private key string.
   * Validates the key format strictly before accepting.
   */
  const handleImportBuyerFromPrivateKey = useCallback(
    async (rawPrivateKey: string) => {
      if (!address) {
        setState((prev) =>
          withDerivedStatus(prev, { error: 'Connect your wallet before importing a buyer key' }, true),
        )
        return
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
        return
      }

      try {
        const privateKey = normalized as `0x${string}`
        const buyerAccount = privateKeyToAccount(privateKey)
        const existingSession = patchPayerSessionFields(address)
        const label = `Imported ${existingSession.buyers.filter((b) => b.type === 'imported').length + 1}`

        const buyerRecord: BuyerRecord = {
          address: buyerAccount.address,
          privateKey,
          type: 'imported',
          label,
        }
        addBuyerToSession(address, buyerRecord)

        const updatedSession = patchPayerSessionFields(address)
        setState((prev) =>
          mergeStatePreservingNonBuyTab(prev, {
            buyerPubKey: buyerAccount.address,
            buyerPrvKey: privateKey,
            buyers: updatedSession.buyers,
            activeBuyerAddress: buyerAccount.address,
            operatorConsented: false,
            operatorAddress: null,
            totalCreditUsd: null,
            withdrawableUsd: null,
            totalGdDepositedG: null,
            monthlyStreamG: null,
            error: null,
            ...(!isNonBuyTab(prev.activeTab) ? { status: 'purchase_setup' } : {}),
          }),
        )
      } catch {
        setState((prev) =>
          withDerivedStatus(prev, { error: 'Could not derive an account from the provided private key' }, true),
        )
      }
    },
    [address],
  )

  /**
   * Registers a buyer address without a private key (view / consent-pairing mode).
   * Actions that require signing will be disabled for this buyer in the UI.
   */
  const handleSelectBuyerByAddress = useCallback(
    (buyerAddress: string) => {
      if (!address) {
        setState((prev) =>
          withDerivedStatus(prev, { error: 'Connect your wallet before selecting a buyer address' }, true),
        )
        return
      }

      const trimmed = buyerAddress.trim()
      if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
        setState((prev) =>
          withDerivedStatus(
            prev,
            { error: 'Invalid buyer address format — expected 0x followed by 40 hex characters' },
            true,
          ),
        )
        return
      }

      const existingSession = patchPayerSessionFields(address)
      const existingBuyer = existingSession.buyers.find(
        (b) => b.address.toLowerCase() === trimmed.toLowerCase(),
      )

      const buyerRecord: BuyerRecord = existingBuyer ?? {
        address: trimmed,
        type: 'address-only',
        label: `Watch ${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`,
      }

      addBuyerToSession(address, buyerRecord)

      const updatedSession = patchPayerSessionFields(address)
      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          buyerPubKey: trimmed,
          buyerPrvKey: existingBuyer?.privateKey ?? null,
          buyers: updatedSession.buyers,
          activeBuyerAddress: trimmed,
          operatorConsented: false,
          operatorAddress: null,
          totalCreditUsd: null,
          withdrawableUsd: null,
          totalGdDepositedG: null,
          monthlyStreamG: null,
          error: null,
        }),
      )
    },
    [address],
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

      storeDeepLinkParams({
        buyerAddress: trimmedAddress,
        operatorSignature: trimmedSignature,
      })

      const existingSession = patchPayerSessionFields(address)
      const existingBuyer = existingSession.buyers.find(
        (b) => b.address.toLowerCase() === trimmedAddress.toLowerCase(),
      )

      const buyerRecord: BuyerRecord = {
        address: trimmedAddress,
        type: existingBuyer?.privateKey ? existingBuyer.type : 'address-only',
        ...(existingBuyer?.privateKey ? { privateKey: existingBuyer.privateKey } : {}),
        ...(existingBuyer?.derivationIndex !== undefined
          ? { derivationIndex: existingBuyer.derivationIndex }
          : {}),
        label:
          existingBuyer?.label ??
          `Partner ${trimmedAddress.slice(0, 6)}…${trimmedAddress.slice(-4)}`,
        operatorSignature: trimmedSignature,
      }

      addBuyerToSession(address, buyerRecord)
      patchPayerSession(address, {
        activeBuyerAddress: trimmedAddress,
        operatorSignature: trimmedSignature,
        operatorConsented: false,
      })

      const updatedSession = patchPayerSessionFields(address)
      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          buyerPubKey: trimmedAddress,
          buyerPrvKey: existingBuyer?.privateKey ?? null,
          buyers: updatedSession.buyers,
          activeBuyerAddress: trimmedAddress,
          operatorConsented: false,
          operatorAddress: null,
          totalCreditUsd: null,
          withdrawableUsd: null,
          totalGdDepositedG: null,
          monthlyStreamG: null,
          activeTab: 'buy',
          error: null,
        }),
      )

      const ref: AccountRef = { payer: address, buyer: trimmedAddress }

      try {
        const operatorStatus = await chainClient.getBuyerOperatorStatus(ref)

        if (!operatorStatus.enabled) {
          throw new Error('Operator consent is not available for this deep-link buyer')
        }

        if (!operatorStatus.operatorAccepted) {
          await backendClient.submitOperatorConsent(ref.buyer, {
            nonce: operatorStatus.consentNonce,
            signature: trimmedSignature,
          })
          await waitForOperatorConsent(chainClient, ref)
        }

        patchPayerSession(address, {
          operatorConsented: true,
          operatorSignature: trimmedSignature,
        })
        setState((prev) =>
          withDerivedStatus(
            prev,
            {
              buyerPubKey: trimmedAddress,
              buyerPrvKey: existingBuyer?.privateKey ?? null,
              buyers: updatedSession.buyers,
              activeBuyerAddress: trimmedAddress,
              operatorConsented: true,
              activeTab: 'buy',
              error: null,
            },
            true,
          ),
        )
        clearDeepLinkArtifacts()
      } catch (err: unknown) {
        setState((prev) =>
          withDerivedStatus(
            prev,
            {
              error: deepLinkManualFallbackMessage(
                err instanceof Error
                  ? err.message
                  : 'Could not apply deep-link operator approval.',
              ),
              activeTab: 'buy',
              status: 'purchase_setup',
            },
            true,
          ),
        )
      }
    },
    [address, backendClient, chainClient],
  )

  const handleSignOperatorConsent = useCallback(async () => {
    const currentState = state
    if (!currentState.address || !currentState.buyerPubKey) {
      setState((prev) =>
        withDerivedStatus(
          prev,
          { error: 'Select a buyer before signing operator consent' },
          true,
        ),
      )
      return
    }

    const session = readPayerSession(currentState.address)
    const activeBuyer = session?.buyers.find(
      (b) => b.address.toLowerCase() === currentState.buyerPubKey!.toLowerCase(),
    )
    const storedOperatorSignature =
      activeBuyer?.operatorSignature ?? session?.operatorSignature ?? null

    if (!currentState.buyerPrvKey && !storedOperatorSignature) {
      setState((prev) =>
        withDerivedStatus(
          prev,
          { error: 'Generate a buyer key before signing operator consent' },
          true,
        ),
      )
      return
    }

    const ref: AccountRef = { payer: currentState.address, buyer: currentState.buyerPubKey }
    const onNonBuyTab = isNonBuyTab(currentState.activeTab)

    try {
      const operatorStatus = await chainClient.getBuyerOperatorStatus(ref)

      if (!operatorStatus.enabled) {
        throw new Error('Operator consent is not available')
      }

      if (operatorStatus.operatorAccepted) {
        patchPayerSession(currentState.address, { operatorConsented: true })
        setState((prev) =>
          mergeStatePreservingNonBuyTab(prev, {
            operatorConsented: true,
            error: null,
            ...(!onNonBuyTab ? { status: 'purchase_setup' } : {}),
          }),
        )
        return
      }

      let buyerSig: `0x${string}`
      if (storedOperatorSignature) {
        buyerSig = storedOperatorSignature as `0x${string}`
      } else {
        const payload = await chainClient.buildOperatorConsentPayload(ref, operatorStatus)

        if (!payload.enabled || !payload.typedData) {
          throw new Error('Operator consent is not available')
        }

        buyerSig = await signOperatorConsentFromTypedData(
          currentState.buyerPrvKey as `0x${string}`,
          payload.typedData,
        )
      }

      await backendClient.submitOperatorConsent(ref.buyer, {
        nonce: operatorStatus.consentNonce,
        signature: buyerSig,
      })
      await waitForOperatorConsent(chainClient, ref)

      patchPayerSession(currentState.address, { operatorConsented: true })
      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          operatorConsented: true,
          error: null,
          ...(!onNonBuyTab ? { status: 'purchase_setup' } : {}),
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
    if (!currentState.address || !currentState.buyerPubKey || currentState.operatorConsented) {
      return
    }

    try {
      const ref: AccountRef = { payer: currentState.address, buyer: currentState.buyerPubKey }
      const operatorStatus = await chainClient.getBuyerOperatorStatus(ref)
      if (!operatorStatus.operatorAccepted) return

      patchPayerSession(currentState.address, { operatorConsented: true })
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
        throw new Error('Connect your wallet and generate a buyer key before paying')
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

      if (!(backendClient instanceof MockAiCreditsBackendClient)) {
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

        if (backendClient instanceof MockAiCreditsBackendClient) {
          const creditUsdMicro = quoteTotalUsdMicro(quote, gdUsdPerToken, currentState.isGoodIdVerified, {
            depositBonusPercent: currentState.depositBonusPercent,
            streamBonusPercent: currentState.streamBonusPercent,
          })
          backendClient.prepareSettlement(accountRef, creditUsdMicro)
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
    [state, backendClient, chainClient, celoVault, onPaySuccess, onPayError],
  )

  const handleRefresh = useCallback(
    async (options?: { afterGoodIdVerify?: boolean }) => {
      const currentState = state
      if (!currentState.address) return

      try {
        const sessionBuyer =
          currentState.buyerPubKey ??
          patchPayerSessionFields(currentState.address).buyerPubKey ??
          null
        const [view, discountConfig] = await Promise.all([
          buildAccountView(currentState.address, backendClient, chainClient, {
            buyerAddress: sessionBuyer,
          }),
          backendClient.getDiscountConfig().catch(() => null),
        ])
        const enriched = await enrichAccountView(view, chainClient)

        setState((prev) => {
          const accountPatch = viewToStatePatch(view, enriched, prev, {
            balanceMode: 'always',
          })
          const sessionFields = mergeSessionFields(
            prev,
            patchPayerSessionFields(currentState.address),
            accountPatch,
            false,
          )
          if (accountPatch.operatorConsented !== undefined && currentState.address) {
            syncOperatorConsentSession(currentState.address, accountPatch.operatorConsented)
          }
          if (currentState.address && view.buyer) {
            syncBuyerPubKeySession(currentState.address, view.buyer)
          }
          const statusSeed =
            options?.afterGoodIdVerify && prev.status === 'payment_failed'
              ? 'quote_ready'
              : prev.status
          return withDerivedStatus(
            { ...prev, status: statusSeed },
            {
              ...accountPatch,
              ...sessionFields,
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
    [state, backendClient, chainClient],
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
    setState((prev) => mergeStatePreservingNonBuyTab(prev, { activeTab: tab, error: null }))
  }, [])

  const handleStartPurchase = useCallback(() => {
    handleSetActiveTab('buy')
  }, [handleSetActiveTab])

  const pendingDeepLinkRef = useRef<DeepLinkParams | null>(null)
  const deepLinkParseDoneRef = useRef(false)
  const deepLinkApplyInFlightRef = useRef(false)

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
      createBuyer: handleCreateBuyer,
      selectBuyer: handleSelectBuyer,
      importBuyerFromPrivateKey: handleImportBuyerFromPrivateKey,
      selectBuyerByAddress: handleSelectBuyerByAddress,
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
      handleCreateBuyer,
      handleSelectBuyer,
      handleImportBuyerFromPrivateKey,
      handleSelectBuyerByAddress,
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
