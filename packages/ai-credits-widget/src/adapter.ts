import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  createWalletClient,
  custom,
  formatUnits,
  parseAbi,
  type Address,
  type Chain,
  type PublicClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { buildSignerKeyMessage, deriveSignerPrivateKeyFromSignature } from './signerKeyDerivation'
import {
  normalizeChannelId,
  signRequestClose,
  signRevokeOperator,
  signWithdrawPrincipal,
} from './signerSignatures'
import {
  totalCreditUsdFromProfile,
  buildAccountView,
  collectSignerAddressesFromEntries,
  createBackendClient,
  DEFAULT_DISCOUNT_CONFIG,
  enrichAccountView,
  waitForOperatorConsent,
} from './backendClient'
import type { AccountEnrichment, AiCreditsBackendClient } from './backendClient'
import type { AccountRef, AccountView } from './backendTypes'
import {
  createAiCreditsFallbackClient,
  createChainClient,
  CELO_GD_ANTSEED_VAULT_ADDRESS,
  CELO_GOODID_ADDRESS,
} from './chainClient'
import type { AiCreditsChainClient } from './chainClient'
import { signOperatorConsentFromTypedData } from './operatorConsent'
import {
  clearDeepLinkArtifacts,
  deepLinkManualFallbackMessage,
  isValidSignerAddress,
  isValidOperatorSignature,
  resolveDeepLinkParams,
  storeDeepLinkParams,
  type DeepLinkParams,
} from './deepLinkParams'
import {
  addressesMatch,
  buildSignerStateFields,
  patchPayerSessionFields,
  readPayerSession,
  upsertSignerKey,
  setActiveSignerAddress,
  setSignerOperatorConsented,
  mergeSignerAddressList,
  rememberSignerAddresses,
  listKnownSignerAddresses,
  getSignerKeyEntry,
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

/**
 * A connected-looking session whose wallet is locked reaches the widget as a
 * cached address (see GoodWidgetProvider.verifyAccount). Naming that beats
 * surfacing whatever exception the wallet throws when the signature is refused.
 */
const WALLET_UNAVAILABLE_ERROR =
  'Your wallet is locked or no longer connected. Unlock it and reconnect to continue.'

const INITIAL_STATE: AiCreditsWidgetAdapterState = {
  status: 'disconnected',
  address: null,
  chainId: null,
  gBalance: null,
  gdUsdPerToken: null,
  totalCreditUsd: null,
  totalBonusUsd: null,
  isGoodIdVerified: false,
  signerPubKey: null,
  signerPrvKey: null,
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
  signers: [],
  derivedSignerAddress: null,
}

const WALLET_LOADING_STATE: Partial<AiCreditsWidgetAdapterState> = {
  gBalance: null,
  gdUsdPerToken: null,
  totalCreditUsd: null,
  minDepositUsd: null,
  minStreamUsd: null,
  totalGdDepositedG: null,
  monthlyStreamG: null,
  withdrawableUsd: null,
  operatorAddress: null,
  currentOperator: null,
}

const BUYER_HISTORY_LOOKUP_LIMIT = 100

function resolveLocalSigners(
  payer: string,
  preferredSigner?: string | null,
  ...extras: Array<string | null | undefined>
): { signers: string[]; selected: string | null } {
  const signers = rememberSignerAddresses(payer, [
    preferredSigner,
    ...listKnownSignerAddresses(payer),
    ...extras,
  ])
  return { signers, selected: selectPreferredSigner(signers, preferredSigner) }
}

async function discoverSignersFromHistory(
  payer: string,
  backend: AiCreditsBackendClient,
  ...extras: Array<string | null | undefined>
): Promise<string[]> {
  let historySigners: string[] = []
  try {
    const history = await backend.getCreditHistory(payer, {
      limit: BUYER_HISTORY_LOOKUP_LIMIT,
      offset: 0,
    })
    historySigners = collectSignerAddressesFromEntries(history.items)
  } catch {
    historySigners = []
  }
  return rememberSignerAddresses(payer, [...historySigners, ...extras])
}

function selectPreferredSigner(signers: string[], preferredSigner?: string | null): string | null {
  if (
    preferredSigner &&
    signers.some((item) => item.toLowerCase() === preferredSigner.toLowerCase())
  ) {
    return preferredSigner
  }
  return signers[0] ?? preferredSigner ?? null
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
  if (payerAddress && listKnownSignerAddresses(payerAddress).length > 0) return 'buy'
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

/**
 * Reads the wallet's G$ balance from Celo. Both the connect load and the
 * refresh action go through here so the Manage tab's "Refresh Balance" button
 * actually re-reads the balance it names.
 */
async function readGBalance(client: PublicClient, account: string): Promise<string> {
  const [raw, decimals] = await Promise.all([
    client.readContract({
      address: G_TOKEN_CELO_ADDRESS,
      abi: G_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [account as Address],
    }),
    client.readContract({
      address: G_TOKEN_CELO_ADDRESS,
      abi: G_TOKEN_ABI,
      functionName: 'decimals',
    }),
  ])
  return formatUnits(raw as bigint, decimals as number)
}

function isPaymentInFlight(status: AiCreditsWidgetStatus): boolean {
  return (
    status === 'payment_pending' ||
    status === 'payment_confirmed' ||
    status === 'payment_failed'
  )
}

function deriveStatus(params: {
  isConnected: boolean
  chainId: number | null
  gBalance: string | null
  signerPubKey: string | null
  signerPrvKey: string | null
  operatorConsented: boolean
  currentStatus: AiCreditsWidgetStatus
}): AiCreditsWidgetStatus {
  const {
    isConnected,
    chainId,
    gBalance,
    signerPubKey,
    signerPrvKey,
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

  if (operatorConsented && !!signerPubKey) return 'quote_ready'

  if (!signerPubKey || !signerPrvKey || !operatorConsented) return 'purchase_setup'

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
    signerPubKey: merged.signerPubKey,
    signerPrvKey: merged.signerPrvKey,
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
    signerPubKey: overrides.signerPubKey ?? prev.signerPubKey,
    signerPrvKey: overrides.signerPrvKey ?? prev.signerPrvKey,
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
  const totalCreditUsd = enriched.totalCreditUsd
  const totalBonusUsd = view.profile?.totalBonusUsd ?? null
  const balanceMode = options?.balanceMode ?? 'if_positive'

  return {
    totalCreditUsd:
      balanceMode === 'always' || hasCreditBalance(totalCreditUsd)
        ? totalCreditUsd
        : prev.totalCreditUsd,
    totalBonusUsd,
    // A read that never answered contributes nothing: omitting the key leaves
    // the last known value in place instead of asserting "not authorized" or
    // wiping the withdrawable balance.
    ...(view.operator
      ? {
          operatorConsented: view.operator.operatorAccepted,
          operatorAddress: view.operator.operatorAddress ?? null,
          currentOperator: view.operator.currentOperator ?? null,
        }
      : {}),
    ...(view.withdrawableUsd !== null ? { withdrawableUsd: view.withdrawableUsd } : {}),
    totalGdDepositedG: enriched.totalGdDepositedG,
    monthlyStreamG: enriched.monthlyStreamG,
  }
}

function activateSignerSelection(payer: string, signers: string[], selectedAddress: string | null) {
  setActiveSignerAddress(payer, selectedAddress)
  return buildSignerStateFields(payer, signers, selectedAddress)
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
  const { address, chainId, isConnected, provider, connect, switchChain, verifyAccount } =
    useWallet()
  const [state, setState] = useState<AiCreditsWidgetAdapterState>(INITIAL_STATE)
  const configurationError =
    backendClientOverride || backendUrl ? null : 'AI Credits backend is not configured'

  const providerRef = useRef<EIP1193Provider | null>(null)
  providerRef.current = provider as EIP1193Provider | null
  const goodIdVerifyPendingRef = useRef(false)
  const pendingDeepLinkRef = useRef<DeepLinkParams | null>(null)
  const deepLinkParseDoneRef = useRef(false)
  const deepLinkApplyInFlightRef = useRef(false)

  const celoVault = vaultAddress ?? CELO_GD_ANTSEED_VAULT_FALLBACK
  // Promise, not a client: the fallback resolver may await a cached RPC list or
  // a Chainlist refresh before it can build a transport. Every use below is
  // already inside async code, so this only costs an await.
  //
  // These reads previously called bare `http()`, which ignored `celoRpcUrl` and
  // silently used viem's built-in default for the chain.
  const celoPublicClient = useMemo(() => {
    const rpcClient = createAiCreditsFallbackClient()
    return rpcClient.createPublicClient({
      chain: CELO_CHAIN,
      fallbackRpcs: celoRpcUrl ? [celoRpcUrl] : [],
    })
  }, [celoRpcUrl])

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

  /**
   * Reads GoodID verification for `account` straight from Celo, independently of
   * the backend account fetch. A failed read leaves the previous value alone:
   * reporting "not verified" because the RPC rate-limited us is exactly what
   * made a verified wallet lose its bonus on some loads.
   */
  const readGoodIdVerification = useCallback(
    async (account: string) => {
      try {
        const verified = await chainClient.isGoodIdVerified(account)
        setState((prev) =>
          addressesMatch(prev.address, account) ? { ...prev, isGoodIdVerified: verified } : prev,
        )
      } catch {
        // Transport failure — says nothing about the wallet, so leave it be.
      }
    },
    [chainClient],
  )

  // Verification is a property of the wallet, not of the credit balance, so it
  // is read when the account changes rather than on every refresh.
  useEffect(() => {
    if (!isConnected || !address) return
    void readGoodIdVerification(address)
  }, [isConnected, address, readGoodIdVerification])

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
          signerPubKey: sessionPatch.signerPubKey,
          signerPrvKey: sessionPatch.signerPrvKey,
          operatorSignature: sessionPatch.operatorSignature,
          operatorConsented: sessionPatch.operatorConsented,
          derivedSignerAddress: sessionPatch.derivedSignerAddress,
          signers: prev.signers,
          ...WALLET_LOADING_STATE,
          error: null,
          status: 'connecting',
        },
        true,
      )
    })

    async function loadWalletData() {
      const publicClient = await celoPublicClient
      // Guarded like every other member of the load batch: a forno hiccup on the
      // balance read used to reject the whole batch and drop the account view,
      // minimums, price, discount config and signer list along with it.
      const balancePromise = readGBalance(publicClient, address!).catch(() => null)

      const pendingDeepLink = pendingDeepLinkRef.current
      const sessionSigner = patchPayerSessionFields(address!).signerPubKey
      const preferredSigner = pendingDeepLink?.signerAddress ?? sessionSigner ?? null

      const accountPromise =
        pendingDeepLink || deepLinkApplyInFlightRef.current
          ? Promise.resolve(null)
          : buildAccountView(address!, backendClient, chainClient, {
              signerAddress: preferredSigner,
            })
              .then(async (view) => ({
                view,
                enriched: enrichAccountView(view),
              }))
              .catch(() => null)

      const minimumsPromise = skipVaultPaymentValidation
        ? Promise.resolve({
            minDepositUsd: '1.00',
            minStreamUsd: '1.00',
          })
        : fetchVaultPaymentMinimums(publicClient, celoVault, address as Address).catch(() => null)

      const gdUsdPerTokenPromise = chainClient.fetchGdUsdPerToken().catch(() => null)
      const discountConfigPromise = backendClient.getDiscountConfig().catch(() => null)
      const signersPromise = pendingDeepLink
        ? Promise.resolve(
            rememberSignerAddresses(address!, [
              preferredSigner,
              ...listKnownSignerAddresses(address!),
            ]),
          )
        : discoverSignersFromHistory(
            address!,
            backendClient,
            preferredSigner,
            ...listKnownSignerAddresses(address!),
          )

      try {
        const [balanceRead, account, minimums, gdUsdPerToken, discountConfig, signers] =
          await Promise.all([
            balancePromise,
            accountPromise,
            minimumsPromise,
            gdUsdPerTokenPromise,
            discountConfigPromise,
            signersPromise,
          ])
        if (cancelled) return

        const gBalance = balanceRead

        const patch: Partial<AiCreditsWidgetAdapterState> = {
          address,
          chainId,
          // An unread balance stays null rather than becoming a false '0'.
          ...(gBalance !== null ? { gBalance } : {}),
          gdUsdPerToken,
          minDepositUsd: minimums?.minDepositUsd ?? null,
          minStreamUsd: minimums?.minStreamUsd ?? null,
          depositBonusPercent:
            discountConfig?.depositBonusPercent ?? DEFAULT_DISCOUNT_CONFIG.depositBonusPercent,
          streamBonusPercent:
            discountConfig?.streamBonusPercent ?? DEFAULT_DISCOUNT_CONFIG.streamBonusPercent,
        }

        // `deriveStatus` parks on 'connecting' while the balance is null, so an
        // unread balance needs an explicit step off that spinner.
        const balanceStalledStatus = (prev: AiCreditsWidgetAdapterState) =>
          gBalance === null && !isPaymentInFlight(prev.status)
            ? { status: 'purchase_setup' as const }
            : {}

        if (pendingDeepLink || deepLinkApplyInFlightRef.current) {
          setState((prev) =>
            withDerivedStatus(
              prev,
              {
                ...patch,
                ...balanceStalledStatus(prev),
                signers: mergeSignerAddressList(prev.signers, ...signers),
              },
              true,
            ),
          )
          return
        }

        const selectedSigner = selectPreferredSigner(signers, preferredSigner)

        // Signer discovery runs alongside the account fetch, so a signer found in
        // history arrives after the view was already built for `preferredSigner`
        // (null on a first visit, which makes the operator read fall back to a
        // hardcoded "not accepted"). Rebuild for the signer we actually settled on
        // rather than reporting a status that was never queried for it.
        let resolvedAccount = account
        if (selectedSigner && !addressesMatch(account?.view.signer ?? null, selectedSigner)) {
          resolvedAccount = await buildAccountView(address!, backendClient, chainClient, {
            signerAddress: selectedSigner,
          })
            .then((view) => ({ view, enriched: enrichAccountView(view) }))
            .catch(() => account)
          if (cancelled) return
        }

        const accountPatch = resolvedAccount
          ? viewToStatePatch(resolvedAccount.view, resolvedAccount.enriched, INITIAL_STATE, {
              balanceMode: 'always',
            })
          : {}

        // Consent is only trustworthy when the view was built for this exact signer.
        // Otherwise drop it from the patch and leave the stored value alone: a false
        // negative here is what makes an already-authorized account look unauthorized
        // on every later load.
        const consentChecked =
          Boolean(selectedSigner) && addressesMatch(resolvedAccount?.view.signer ?? null, selectedSigner)
        if (!consentChecked) {
          delete accountPatch.operatorConsented
        } else if (selectedSigner && accountPatch.operatorConsented !== undefined) {
          setSignerOperatorConsented(address!, selectedSigner, accountPatch.operatorConsented)
        }
        const signerFields = activateSignerSelection(address!, signers, selectedSigner)
        setState((prev) =>
          withDerivedStatus(
            prev,
            {
              ...patch,
              ...balanceStalledStatus(prev),
              ...accountPatch,
              ...signerFields,
              operatorConsented: accountPatch.operatorConsented ?? signerFields.operatorConsented,
              ...(account ? {} : { activeTab: 'buy' as const }),
            },
            true,
          ),
        )
      } catch {
        if (cancelled) return
        // Last resort: every individual read is guarded above, so reaching here
        // means something unexpected failed. Keep the locally-known session —
        // clearing the signer keys made a configured wallet look brand new — and
        // leave the balance unread rather than claiming it is zero.
        setState((prev) => {
          return withDerivedStatus(
            prev,
            {
              address,
              chainId,
              ...sessionPatch,
              signers: mergeSignerAddressList(prev.signers, ...listKnownSignerAddresses(address!)),
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
  }, [
    isConnected,
    address,
    chainId,
    backendClient,
    chainClient,
    celoPublicClient,
    celoVault,
    configurationError,
  ])

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

  /**
   * Switches to Celo through the wallet context rather than issuing
   * `wallet_switchEthereumChain` directly.
   *
   * The raw request is not enough on its own: plenty of mobile wallets bridged
   * over WalletConnect either reject the method or never answer it. Core races
   * the request against a timeout and falls back to the integrator's own
   * network flow, and every failure lands in `state.error` — a switch that
   * cannot happen has to say so rather than leave a button that does nothing.
   */
  const handleSwitchChain = useCallback(async () => {
    setState((prev) => ({ ...prev, error: null }))
    try {
      await switchChain(CELO_CHAIN_ID)
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Could not switch to Celo. Switch networks in your wallet, then try again.'
      setState((prev) => withDerivedStatus(prev, { error: message }, true))
    }
  }, [switchChain])

  /**
   * Creates or restores the single deterministic wallet signer.
   * If that signer already exists with a private key, it is selected instead of re-derived.
   */
  const handleGenerateSignerKey = useCallback(async () => {
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

    if (!(await verifyAccount())) {
      setState((prev) => withDerivedStatus(prev, { error: WALLET_UNAVAILABLE_ERROR }, true))
      return
    }

    const payerAddress = address as Address
    const session = readPayerSession(payerAddress)
    const derivedAddress = session?.derivedSignerAddress ?? null
    const existingKey = derivedAddress ? getSignerKeyEntry(payerAddress, derivedAddress) : null

    if (derivedAddress && existingKey?.privateKey) {
      const signers = mergeSignerAddressList(listKnownSignerAddresses(payerAddress), derivedAddress)
      const signerFields = activateSignerSelection(payerAddress, signers, derivedAddress)
      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          ...signerFields,
          error: null,
          ...(!isNonBuyTab(prev.activeTab) ? { status: 'purchase_setup' } : {}),
        }),
      )
      return
    }

    try {
      const message = buildSignerKeyMessage(payerAddress)
      const walletClient = createWalletClient({
        account: payerAddress,
        chain: CELO_CHAIN,
        transport: custom(providerRef.current),
      })
      const signature = await walletClient.signMessage({
        account: payerAddress,
        message,
      })
      const privateKey = deriveSignerPrivateKeyFromSignature(signature)
      const signerAccount = privateKeyToAccount(privateKey)

      upsertSignerKey(
        payerAddress,
        signerAccount.address,
        { privateKey },
        { setActive: true, setDerived: true },
      )

      const signers = mergeSignerAddressList(
        listKnownSignerAddresses(payerAddress),
        signerAccount.address,
      )
      const signerFields = buildSignerStateFields(payerAddress, signers, signerAccount.address)
      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          ...signerFields,
          error: null,
          ...(!isNonBuyTab(prev.activeTab) ? { status: 'purchase_setup' } : {}),
        }),
      )
    } catch (err: unknown) {
      setState((prev) =>
        withDerivedStatus(
          prev,
          {
            error: err instanceof Error ? err.message : 'Signer Key generation was rejected',
          },
          true,
        ),
      )
    }
  }, [address, verifyAccount])

  const handleSelectSigner = useCallback(
    async (signerAddress: string) => {
      if (!address) return
      const known = listKnownSignerAddresses(address)
      if (!known.some((item) => item.toLowerCase() === signerAddress.toLowerCase())) {
        return
      }

      const signers = mergeSignerAddressList(known, signerAddress)
      const signerFields = activateSignerSelection(address, signers, signerAddress)
      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          ...signerFields,
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
          signerAddress,
        })
        const enriched = enrichAccountView(view)
        const accountPatch = viewToStatePatch(view, enriched, INITIAL_STATE, {
          balanceMode: 'always',
        })
        if (accountPatch.operatorConsented !== undefined) {
          setSignerOperatorConsented(address, signerAddress, accountPatch.operatorConsented)
        }
        const nextSignerFields = buildSignerStateFields(address, signers, signerAddress)
        setState((prev) =>
          mergeStatePreservingNonBuyTab(prev, {
            ...accountPatch,
            ...nextSignerFields,
            operatorConsented: accountPatch.operatorConsented ?? nextSignerFields.operatorConsented,
            error: null,
          }),
        )
      } catch (err: unknown) {
        setState((prev) =>
          mergeStatePreservingNonBuyTab(prev, {
            error: err instanceof Error ? err.message : 'Could not load signer account',
          }),
        )
      }
    },
    [address, backendClient, chainClient],
  )

  const handleDiscoverSigners = useCallback(
    (addresses: string[]) => {
      if (!address || addresses.length === 0) return
      const signers = rememberSignerAddresses(address, addresses)
      setState((prev) => {
        const sameLength = signers.length === prev.signers.length
        const unchanged =
          sameLength &&
          signers.every((item, index) => item.toLowerCase() === prev.signers[index]?.toLowerCase())
        if (unchanged) return prev
        return { ...prev, signers }
      })
    },
    [address],
  )

  const handleImportSignerFromPrivateKey = useCallback(
    async (rawPrivateKey: string): Promise<string | null> => {
      if (!address) {
        setState((prev) =>
          withDerivedStatus(
            prev,
            { error: 'Connect your wallet before importing a signer key' },
            true,
          ),
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
        const signerAccount = privateKeyToAccount(privateKey)
        upsertSignerKey(address, signerAccount.address, { privateKey }, { setActive: true })

        const signers = mergeSignerAddressList(listKnownSignerAddresses(address), signerAccount.address)
        const signerFields = buildSignerStateFields(address, signers, signerAccount.address)
        setState((prev) =>
          mergeStatePreservingNonBuyTab(prev, {
            ...signerFields,
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
            signerAddress: signerAccount.address,
          })
          const enriched = enrichAccountView(view)
          const accountPatch = viewToStatePatch(view, enriched, INITIAL_STATE, {
            balanceMode: 'always',
          })
          if (accountPatch.operatorConsented !== undefined) {
            setSignerOperatorConsented(address, signerAccount.address, accountPatch.operatorConsented)
          }
          const nextSignerFields = buildSignerStateFields(address, signers, signerAccount.address)
          setState((prev) =>
            mergeStatePreservingNonBuyTab(prev, {
              ...accountPatch,
              ...nextSignerFields,
              operatorConsented:
                accountPatch.operatorConsented ?? nextSignerFields.operatorConsented,
              error: null,
            }),
          )
        } catch {
          return signerAccount.address
        }

        return signerAccount.address
      } catch {
        setState((prev) =>
          withDerivedStatus(
            prev,
            { error: 'Could not derive an account from the provided private key' },
            true,
          ),
        )
        return null
      }
    },
    [address, backendClient, chainClient],
  )

  const resolveSignerList = useCallback(
    (payer: string, preferredSigner?: string | null) => resolveLocalSigners(payer, preferredSigner),
    [],
  )

  /**
   * Registers a signer from an NCDI deep link and submits the pre-signed
   * operator-approval token. Never stores a signer private key from the URL.
   */
  const handleApplyDeepLinkSigner = useCallback(
    async (signerAddress: string, operatorSignature: string) => {
      if (!address) {
        return
      }

      const trimmedAddress = signerAddress.trim()
      const trimmedSignature = operatorSignature.trim()

      if (!isValidSignerAddress(trimmedAddress)) {
        setState((prev) =>
          withDerivedStatus(
            prev,
            {
              error: deepLinkManualFallbackMessage('Deep-link signerAddress is invalid.'),
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

      // Pre-fill the signer identity and the pending signature only. Consent must never be
      // submitted here — it is only ever submitted from handleSignOperatorConsent, in
      // response to an explicit user click on OperatorConsentStep. A deep-link-supplied
      // signature is not itself user approval; it just saves the user from re-signing.
      storeDeepLinkParams({
        signerAddress: trimmedAddress,
        operatorSignature: trimmedSignature,
      })

      upsertSignerKey(
        address,
        trimmedAddress,
        { operatorSignature: trimmedSignature },
        { setActive: true },
      )

      const signers = mergeSignerAddressList(listKnownSignerAddresses(address), trimmedAddress)
      const signerFields = buildSignerStateFields(address, signers, trimmedAddress)
      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          ...signerFields,
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
    if (!currentState.address || !currentState.signerPubKey) {
      setState((prev) =>
        withDerivedStatus(
          prev,
          { error: 'Select a signer before authorizing your wallet' },
          true,
        ),
      )
      return
    }

    const keyEntry = getSignerKeyEntry(currentState.address, currentState.signerPubKey)
    const storedOperatorSignature =
      currentState.operatorSignature ?? keyEntry?.operatorSignature ?? null

    if (!currentState.signerPrvKey && !storedOperatorSignature) {
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

    const ref: AccountRef = { payer: currentState.address, signer: currentState.signerPubKey }
    const onNonBuyTab = isNonBuyTab(currentState.activeTab)

    setState((prev) => ({
      ...prev,
      operatorConsentPending: true,
      error: null,
    }))

    try {
      const operatorStatus = await chainClient.getSignerOperatorStatus(ref)

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
        setSignerOperatorConsented(currentState.address, currentState.signerPubKey, true)
        const signerList = resolveSignerList(currentState.address, currentState.signerPubKey)
        const signerFields = buildSignerStateFields(
          currentState.address,
          signerList.signers,
          signerList.selected,
        )
        setState((prev) =>
          mergeStatePreservingNonBuyTab(prev, {
            ...signerFields,
            operatorConsented: true,
            operatorConsentPending: false,
            error: null,
            ...(!onNonBuyTab ? { status: 'purchase_setup' } : {}),
          }),
        )
        clearDeepLinkArtifacts()
        return
      }

      let signerSig: `0x${string}`
      if (currentState.signerPrvKey) {
        const payload = await chainClient.buildOperatorConsentPayload(ref, operatorStatus)

        if (!payload.enabled || !payload.typedData) {
          throw new Error('Operator consent is not available')
        }

        signerSig = await signOperatorConsentFromTypedData(
          currentState.signerPrvKey as `0x${string}`,
          payload.typedData,
        )
      } else if (storedOperatorSignature) {
        signerSig = storedOperatorSignature as `0x${string}`
      } else {
        throw new Error('Generate a signer key before authorizing your wallet')
      }

      await backendClient.submitOperatorConsent(ref.signer, {
        nonce: operatorStatus.consentNonce,
        signature: signerSig,
      })
      await waitForOperatorConsent(chainClient, ref)

      setSignerOperatorConsented(currentState.address, currentState.signerPubKey, true)
      const signerList = resolveSignerList(currentState.address, currentState.signerPubKey)
      const signerFields = buildSignerStateFields(
        currentState.address,
        signerList.signers,
        signerList.selected,
      )
      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          ...signerFields,
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
  }, [state, backendClient, chainClient, resolveSignerList])

  const handleSyncOperatorConsentFromChain = useCallback(async () => {
    const currentState = state
    if (!currentState.address || !currentState.signerPubKey || currentState.operatorConsented) {
      return
    }

    try {
      const ref: AccountRef = { payer: currentState.address, signer: currentState.signerPubKey }
      const operatorStatus = await chainClient.getSignerOperatorStatus(ref)
      if (!operatorStatus.operatorAccepted) return

      setSignerOperatorConsented(currentState.address, currentState.signerPubKey, true)
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

  const handleRevokeOperatorConsent = useCallback(async () => {
    const currentState = state
    if (!currentState.address || !currentState.signerPubKey || !currentState.operatorConsented) {
      return
    }

    if (!currentState.signerPrvKey) {
      setState((prev) => ({
        ...prev,
        error: 'Signer private key missing',
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

    if (currentState.operatorConsentPending) return

    const ref: AccountRef = { payer: currentState.address, signer: currentState.signerPubKey }
    const onNonBuyTab = isNonBuyTab(currentState.activeTab)

    setState((prev) => ({
      ...prev,
      operatorConsentPending: true,
      error: null,
    }))

    try {
      const operatorStatus = await chainClient.getSignerOperatorStatus(ref)

      if (!operatorStatus.enabled) {
        throw new Error('Operator consent is not available')
      }

      if (!operatorStatus.operatorAccepted) {
        setSignerOperatorConsented(currentState.address, currentState.signerPubKey, false)
        const signerList = resolveSignerList(currentState.address, currentState.signerPubKey)
        const signerFields = buildSignerStateFields(
          currentState.address,
          signerList.signers,
          signerList.selected,
        )
        setState((prev) =>
          mergeStatePreservingNonBuyTab(prev, {
            ...signerFields,
            operatorConsented: false,
            operatorConsentPending: false,
            error: null,
            ...(!onNonBuyTab ? { status: 'purchase_setup' } : {}),
          }),
        )
        return
      }

      const nonce = await chainClient.getSignerAuthNonce(currentState.signerPubKey as Address)
      const signature = await signRevokeOperator({
        signerPrivateKey: currentState.signerPrvKey as `0x${string}`,
        fundingVaultAddress,
        signer: currentState.signerPubKey as Address,
        nonce: nonce,
      })

      // No confirmation poll here: the backend's operator-revoke handler awaits the Base
      // receipt before responding, so a resolved request already means the tx mined — and
      // ethers surfaces a revert as a throw, which reaches us as a non-2xx.
      await backendClient.revokeOperatorConsent(ref.signer, { nonce: nonce.toString(), signature })

      setSignerOperatorConsented(currentState.address, currentState.signerPubKey, false)
      const signerList = resolveSignerList(currentState.address, currentState.signerPubKey)
      const signerFields = buildSignerStateFields(
        currentState.address,
        signerList.signers,
        signerList.selected,
      )
      setState((prev) =>
        mergeStatePreservingNonBuyTab(prev, {
          ...signerFields,
          operatorConsented: false,
          operatorConsentPending: false,
          error: null,
          ...(!onNonBuyTab ? { status: 'purchase_setup' } : {}),
        }),
      )
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        operatorConsentPending: false,
        error: err instanceof Error ? err.message : 'Operator revoke failed',
      }))
    }
  }, [state, backendClient, chainClient, fundingVaultAddress, resolveSignerList])

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

      if (!currentState.address || !currentState.signerPubKey || !providerRef.current) {
        throw new Error('Connect your wallet and generate a signer key before paying')
      }

      if (!(await verifyAccount())) {
        setState((prev) => ({ ...prev, error: WALLET_UNAVAILABLE_ERROR }))
        throw new Error(WALLET_UNAVAILABLE_ERROR)
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
          const publicClient = await celoPublicClient
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
        const signerAddress = currentState.signerPubKey as Address

        const publicClient = await celoPublicClient
        const walletClient = createWalletClient({
          account: payerAddress,
          chain: CELO_CHAIN,
          transport: custom(providerRef.current),
        })

        const accountRef: AccountRef = {
          payer: currentState.address,
          signer: currentState.signerPubKey,
        }

        if (prepareSettlement) {
          const creditUsdMicro = quoteTotalUsdMicro(
            quote,
            gdUsdPerToken,
            currentState.isGoodIdVerified,
            {
              depositBonusPercent: currentState.depositBonusPercent,
              streamBonusPercent: currentState.streamBonusPercent,
            },
          )
          prepareSettlement(accountRef, creditUsdMicro)
        }

        const { txHashes } = await executeCeloPayment({
          walletClient,
          publicClient,
          payer: payerAddress,
          signer: signerAddress,
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

        const signerList = resolveSignerList(currentState.address, currentState.signerPubKey)
        const signerFields = buildSignerStateFields(
          currentState.address,
          signerList.signers,
          signerList.selected,
        )

        setState((prev) =>
          withDerivedStatus(prev, {
            ...signerFields,
            totalCreditUsd,
            error: null,
            activeTab: 'manage',
          }),
        )

        onPaySuccess?.({
          address: currentState.address!,
          chainId: CELO_CHAIN_ID,
          transactionHash: txHash,
          signerPubKey: currentState.signerPubKey!,
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
      resolveSignerList,
      prepareSettlement,
      skipVaultPaymentValidation,
      verifyAccount,
    ],
  )

  const handleRefresh = useCallback(
    async (options?: { afterGoodIdVerify?: boolean }) => {
      const currentState = state
      if (!currentState.address) return

      if (options?.afterGoodIdVerify) {
        void readGoodIdVerification(currentState.address)
      }

      try {
        const preferredSigner = currentState.signerPubKey
        const signerList = resolveSignerList(currentState.address, preferredSigner)

        // Each read stands alone: a failed credit read should not also discard a
        // G$ balance or discount config that came back fine, and vice versa.
        const [account, discountConfig, gBalance] = await Promise.all([
          buildAccountView(currentState.address, backendClient, chainClient, {
            signerAddress: preferredSigner,
          })
            .then((view) => ({ view, enriched: enrichAccountView(view) }))
            .catch(() => null),
          backendClient.getDiscountConfig().catch(() => null),
          celoPublicClient
            .then((client) => readGBalance(client, currentState.address!))
            .catch(() => null),
        ])

        const accountPatch = account
          ? viewToStatePatch(account.view, account.enriched, INITIAL_STATE, {
              balanceMode: 'always',
            })
          : {}
        if (preferredSigner && accountPatch.operatorConsented !== undefined) {
          setSignerOperatorConsented(
            currentState.address,
            preferredSigner,
            accountPatch.operatorConsented,
          )
        }
        const signerFields = buildSignerStateFields(
          currentState.address,
          signerList.signers,
          signerList.selected,
        )

        setState((prev) => {
          const statusSeed =
            options?.afterGoodIdVerify && prev.status === 'payment_failed'
              ? 'quote_ready'
              : prev.status === 'backend_unavailable' && account
                ? 'purchase_setup'
                : prev.status
          return withDerivedStatus(
            { ...prev, status: statusSeed },
            {
              ...accountPatch,
              ...signerFields,
              operatorConsented: accountPatch.operatorConsented ?? signerFields.operatorConsented,
              activeTab: prev.activeTab,
              // An unread balance keeps the one already on screen.
              ...(gBalance !== null ? { gBalance } : {}),
              // Only the credit read failing means the backend is unreachable —
              // every peripheral read degrades inside `buildAccountView` now.
              ...(account
                ? { error: null }
                : {
                    status: 'backend_unavailable' as const,
                    error: 'Could not reach backend — check your connection',
                  }),
              depositBonusPercent:
                discountConfig?.depositBonusPercent ?? prev.depositBonusPercent,
              streamBonusPercent: discountConfig?.streamBonusPercent ?? prev.streamBonusPercent,
            },
            true,
          )
        })
      } catch {
        // Every network read above is individually guarded, so this only
        // fires for a local session-storage failure. Report it without
        // blaming the backend and without dropping what was applied.
        setState((prev) =>
          mergeStatePreservingNonBuyTab(prev, { error: 'Could not refresh — try again' }),
        )
      }
    },
    [
      state,
      backendClient,
      chainClient,
      celoPublicClient,
      resolveSignerList,
      readGoodIdVerification,
    ],
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
      if (!currentState.signerPrvKey) {
        setState((prev) => ({
          ...prev,
          error:
            'Sign with your payer wallet in Signer Key below to generate the signer private key before closing a channel',
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
        const signer = currentState.signerPubKey
        if (!signer) {
          setState((prev) => ({ ...prev, error: 'Select a signer before closing a channel' }))
          return
        }
        const nonce = await chainClient.getSignerAuthNonce(signer)
        const signature = await signRequestClose({
          signerPrivateKey: currentState.signerPrvKey as `0x${string}`,
          fundingVaultAddress,
          channelId,
          nonce,
        })

        await backendClient.closeChannel(channelId, { nonce: nonce.toString(), signature })
        setState((prev) => ({ ...prev, error: null }))
      } catch (err: unknown) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Close channel failed',
        }))
      }
    },
    [state, backendClient, chainClient, fundingVaultAddress],
  )

  const handleWithdrawCredits = useCallback(
    async (withdrawAmount: string) => {
      const currentState = state
      if (!currentState.address || !currentState.signerPubKey) return
      if (!currentState.signerPrvKey) {
        setState((prev) => ({
          ...prev,
          error:
            'Sign with your payer wallet in Signer Key below to generate the signer private key before withdrawing funds',
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

        const signer = currentState.signerPubKey as Address
        const payer = currentState.address as Address
        const nonce = await chainClient.getSignerAuthNonce(signer)
        const signature = await signWithdrawPrincipal({
          signerPrivateKey: currentState.signerPrvKey as `0x${string}`,
          fundingVaultAddress,
          signer,
          amountMicro: BigInt(amount),
          recipient: payer,
          nonce,
        })

        await backendClient.withdrawCredits(signer, {
          amount,
          recipient: payer,
          nonce: nonce.toString(),
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
    [state, backendClient, chainClient, fundingVaultAddress, handleRefresh],
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
      const missing = parsed.present === 'signerAddress' ? 'operatorSignature' : 'signerAddress'
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
    void handleApplyDeepLinkSigner(pending.signerAddress, pending.operatorSignature).finally(() => {
      deepLinkApplyInFlightRef.current = false
      pendingDeepLinkRef.current = null
    })
  }, [address, handleApplyDeepLinkSigner])

  const actions: AiCreditsWidgetAdapterActions = useMemo(
    () => ({
      connect: handleConnect,
      switchChain: handleSwitchChain,
      generateSignerKey: handleGenerateSignerKey,
      selectSigner: handleSelectSigner,
      discoverSigners: handleDiscoverSigners,
      importSignerFromPrivateKey: handleImportSignerFromPrivateKey,
      applyDeepLinkSigner: handleApplyDeepLinkSigner,
      signOperatorConsent: handleSignOperatorConsent,
      revokeOperatorConsent: handleRevokeOperatorConsent,
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
      handleGenerateSignerKey,
      handleSelectSigner,
      handleDiscoverSigners,
      handleImportSignerFromPrivateKey,
      handleApplyDeepLinkSigner,
      handleSignOperatorConsent,
      handleRevokeOperatorConsent,
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
