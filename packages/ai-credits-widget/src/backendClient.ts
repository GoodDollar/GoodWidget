import type {
  AccountCreditResponse,
  AccountRef,
  AccountView,
  BackendConfigValuesResponse,
  CeloEventsRecordResponse,
  DiscountConfig,
  CreditHistoryQuery,
  CreditHistoryResponse,
  GdCreditEntry,
  SettlementResult,
  TransactionsResponse,
  UserCreditProfile,
} from './backendTypes'
import type { BuyerOperatorStatus } from './operatorConsent'
import type { AiCreditsChainClient } from './chainClient'
import {
  flowRateWeiToMonthlyG,
  weiToG,
} from './quoteMath'
import { isAddress } from 'viem'

export type {
  AccountRef,
  AccountCreditResponse,
  AccountView,
  DiscountConfig,
  CreditHistoryQuery,
  CreditHistoryResponse,
  GdCreditEntry,
  TransactionsResponse,
  CeloEventsRecordResponse,
  SettlementResult,
  UserCreditProfile,
} from './backendTypes'

export type { AccountView as AccountStatusResponse } from './backendTypes'

export { usdToCredits } from './quoteMath'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const BRIDGE_POLL_INTERVAL_MS = 3000
const BRIDGE_POLL_MAX_ATTEMPTS = 20

function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

export type WithdrawPrincipalRequest = {
  amount: string
  recipient: string
  timestamp: number
  signature: string
}

export type ChannelOperationRequest = {
  timestamp?: number
  signature?: string
}

export type BridgeResponse = {
  enabled: boolean
  txHash?: string
}

export type ChannelOperationResponse = {
  channelId: string
  action: 'close' | 'withdraw'
  bridge: BridgeResponse
}

export type WithdrawPrincipalResponse = {
  account: string
  amountUsd: string
  bridge: BridgeResponse
}

export type OperatorConsentRequest = {
  nonce: string
  signature: string
}

export type OperatorConsentResponse = {
  buyer: string
  bridge: BridgeResponse
}

async function readBridgeResponseBody<T extends { bridge?: BridgeResponse }>(
  response: Response,
  actionLabel: string,
): Promise<T & { bridge: BridgeResponse }> {
  if (!response.ok) {
    let detail = ''
    try {
      const body = (await response.json()) as { error?: unknown }
      if (body.error) detail = ` — ${JSON.stringify(body.error)}`
    } catch {
      detail = ''
    }
    throw new Error(`${actionLabel} failed: ${response.status}${detail}`)
  }
  const body = (await response.json()) as T
  const bridge = body.bridge ?? { enabled: false }
  if (!bridge.enabled) {
    throw new Error(`${actionLabel} bridge is not configured on the backend`)
  }
  return { ...body, bridge }
}

async function parseBridgeResponse(
  response: Response,
  actionLabel: string,
): Promise<BridgeResponse> {
  const body = await readBridgeResponseBody(response, actionLabel)
  return body.bridge
}

const DEFAULT_HISTORY_LIMIT = 20
const MAX_HISTORY_LIMIT = 100

function clampHistoryLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_HISTORY_LIMIT
  return Math.min(Math.max(1, Math.floor(limit)), MAX_HISTORY_LIMIT)
}

export function resolveBuyerAddress(entries: GdCreditEntry[]): string | null {
  for (const entry of entries) {
    if (entry.buyerAddress && isAddress(entry.buyerAddress)) {
      return normalizeAddress(entry.buyerAddress)
    }
  }
  return null
}

export function collectBuyerAddressesFromEntries(entries: GdCreditEntry[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const entry of entries) {
    if (!entry.buyerAddress || !isAddress(entry.buyerAddress)) continue
    const key = normalizeAddress(entry.buyerAddress)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(key)
  }
  return result
}

function defaultOperatorStatus(payer: string): BuyerOperatorStatus {
  const account = normalizeAddress(payer)
  return {
    enabled: false,
    account,
    buyerAddress: account,
    currentOperator: '0x0000000000000000000000000000000000000000',
    operatorAccepted: false,
    consentNonce: '0',
  }
}

export function totalCreditUsdFromProfile(
  profile: Pick<UserCreditProfile, 'totalPrincipalUsd' | 'totalBonusUsd'>,
): string {
  const principal = BigInt(profile.totalPrincipalUsd || '0')
  const bonus = BigInt(profile.totalBonusUsd || '0')
  return (principal + bonus).toString()
}

export function totalCreditUsdFromStatus(status: {
  profile: Pick<UserCreditProfile, 'totalPrincipalUsd' | 'totalBonusUsd'>
}): string {
  return totalCreditUsdFromProfile(status.profile)
}

export type AccountEnrichment = {
  totalCreditUsd: string
  goodIdVerified: boolean
  totalGdDepositedG: string
  monthlyStreamG: string
}

export type BuildAccountViewOptions = {
  buyerAddress?: string | null
}

export async function enrichAccountView(
  view: AccountView,
  chain: AiCreditsChainClient,
): Promise<AccountEnrichment> {
  const { profile } = view
  const goodIdVerified = await chain.isGoodIdVerified(view.account)
  const monthlyStreamG = flowRateWeiToMonthlyG(profile.streamFlowRateWeiPerSecond)
  const depositedWei = BigInt(profile.totalGdDepositedWei)
  return {
    totalCreditUsd: totalCreditUsdFromProfile(profile),
    goodIdVerified,
    totalGdDepositedG: depositedWei > 0n ? weiToG(depositedWei) : '0.00',
    monthlyStreamG,
  }
}

export interface AiCreditsBackendClient {
  getDiscountConfig(): Promise<DiscountConfig>
  getAccountCredit(payer: string): Promise<AccountCreditResponse>
  getCreditHistory(payer: string, options?: CreditHistoryQuery): Promise<CreditHistoryResponse>
  getOutstanding(payer: string): Promise<{ outstandingFundingUsd: string; count: number }>
  getTransactions(
    payer: string,
    options?: { status?: 'pending' | 'funded' | 'failed'; limit?: number; cursor?: string },
  ): Promise<TransactionsResponse>
  notifyPayment(txHash: string): Promise<CeloEventsRecordResponse>
  waitForSettlement(
    ref: AccountRef,
    options?: { txHashes?: string[]; previousBalance?: string },
  ): Promise<SettlementResult>
  closeChannel(
    channelId: string,
    body?: ChannelOperationRequest,
  ): Promise<ChannelOperationResponse>
  withdrawCredits(
    buyer: string,
    body: WithdrawPrincipalRequest,
  ): Promise<WithdrawPrincipalResponse>
  submitOperatorConsent(
    buyer: string,
    body: OperatorConsentRequest,
  ): Promise<OperatorConsentResponse>
}

const BPS_PER_PERCENT = 100

export const DEFAULT_DISCOUNT_CONFIG: DiscountConfig = {
  depositBonusPercent: 10,
  streamBonusPercent: 20,
}

function bpsToPercent(bps: unknown, fallbackPercent: number): number {
  const raw = typeof bps === 'number' ? bps : typeof bps === 'string' ? Number(bps) : NaN
  if (!Number.isFinite(raw) || raw < 0) return fallbackPercent
  return Math.trunc(raw / BPS_PER_PERCENT)
}

function discountConfigFromConfigValues(
  response: BackendConfigValuesResponse | null | undefined,
): DiscountConfig {
  const config = response?.config
  return {
    depositBonusPercent: bpsToPercent(
      config?.REGULAR_BONUS_BPS,
      DEFAULT_DISCOUNT_CONFIG.depositBonusPercent,
    ),
    streamBonusPercent: bpsToPercent(
      config?.STREAMING_BONUS_BPS,
      DEFAULT_DISCOUNT_CONFIG.streamBonusPercent,
    ),
  }
}

export class ProductionAiCreditsBackendClient implements AiCreditsBackendClient {
  private readonly backendUrl: string

  constructor(backendUrl: string) {
    this.backendUrl = backendUrl.replace(/\/$/, '')
  }

  async getDiscountConfig(): Promise<DiscountConfig> {
    const response = await fetch(`${this.backendUrl}/config/values`)
    if (!response.ok) throw new Error(`Config values request failed: ${response.status}`)
    const payload = (await response.json()) as BackendConfigValuesResponse
    return discountConfigFromConfigValues(payload)
  }

  private accountBase(payer: string): string {
    return `${this.backendUrl}/v1/accounts/${encodeURIComponent(normalizeAddress(payer))}`
  }

  async getAccountCredit(payer: string): Promise<AccountCreditResponse> {
    const response = await fetch(`${this.accountBase(payer)}/profile`)
    if (!response.ok) throw new Error(`Account profile request failed: ${response.status}`)
    return response.json() as Promise<AccountCreditResponse>
  }

  async getCreditHistory(
    payer: string,
    options: CreditHistoryQuery = {},
  ): Promise<CreditHistoryResponse> {
    const params = new URLSearchParams()
    const limit = clampHistoryLimit(options.limit)
    const offset = Math.max(0, Math.floor(options.offset ?? 0))
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    if (options.source) params.set('source', options.source)
    if (options.fundingStatus) params.set('fundingStatus', options.fundingStatus)
    if (options.from) params.set('from', options.from)
    if (options.to) params.set('to', options.to)
    if (options.buyerAddress) params.set('buyerAddress', options.buyerAddress)

    const response = await fetch(`${this.accountBase(payer)}/credit-history?${params.toString()}`)
    if (!response.ok) throw new Error(`Credit history request failed: ${response.status}`)
    return response.json() as Promise<CreditHistoryResponse>
  }

  async getOutstanding(payer: string): Promise<{ outstandingFundingUsd: string; count: number }> {
    const response = await fetch(`${this.accountBase(payer)}/outstanding`)
    if (!response.ok) throw new Error(`Outstanding funding request failed: ${response.status}`)
    const data = (await response.json()) as {
      outstandingFundingUsd?: string
      failedFundingCredits?: unknown[]
    }
    return {
      outstandingFundingUsd: data.outstandingFundingUsd ?? '0',
      count: data.failedFundingCredits?.length ?? 0,
    }
  }

  async getTransactions(
    payer: string,
    options: { status?: 'pending' | 'funded' | 'failed'; limit?: number; cursor?: string } = {},
  ): Promise<TransactionsResponse> {
    const history = await this.getCreditHistory(payer, {
      fundingStatus: options.status,
      limit: options.limit,
      offset: options.cursor ? Number(options.cursor) || 0 : 0,
    })
    return { account: history.account, transactions: history.items }
  }

  async getUsageLog(payer: string): Promise<GdCreditEntry[]> {
    const history = await this.getCreditHistory(payer, { limit: DEFAULT_HISTORY_LIMIT, offset: 0 })
    return history.items
  }

  async notifyPayment(txHash: string): Promise<CeloEventsRecordResponse> {
    const response = await fetch(`${this.backendUrl}/v1/celo/events/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash }),
    })
    if (!response.ok) throw new Error(`Payment notification failed: ${response.status}`)
    return response.json() as Promise<CeloEventsRecordResponse>
  }

  async waitForSettlement(
    ref: AccountRef,
    options: { txHashes?: string[]; previousBalance?: string } = {},
  ): Promise<SettlementResult> {
    const txHashes = new Set((options.txHashes ?? []).map((hash) => hash.toLowerCase()))

    for (let attempt = 0; attempt < BRIDGE_POLL_MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) await sleep(BRIDGE_POLL_INTERVAL_MS)

      if (txHashes.size > 0) {
        const history = await this.getCreditHistory(ref.payer, {
          limit: MAX_HISTORY_LIMIT,
          offset: 0,
        })
        const matching = history.items.filter(
          (entry) => entry.txHash && txHashes.has(entry.txHash.toLowerCase()),
        )
        const failed = matching.find((entry) => entry.fundingStatus === 'failed')
        if (failed) {
          throw new Error(failed.fundingError ?? 'Base funding failed for this deposit')
        }
        if (matching.length > 0 && matching.every((entry) => entry.fundingStatus === 'funded')) {
          const credit = await this.getAccountCredit(ref.payer)
          return { totalCreditUsd: totalCreditUsdFromProfile(credit.profile) }
        }
        if (matching.some((entry) => entry.fundingStatus === 'pending')) continue
      }

      const credit = await this.getAccountCredit(ref.payer)
      const balanceMicro = BigInt(totalCreditUsdFromProfile(credit.profile))
      const baselineMicro = BigInt(options.previousBalance || '0')
      if (balanceMicro > baselineMicro) {
        return { totalCreditUsd: balanceMicro.toString() }
      }
    }

    throw new Error('Settlement polling timeout — credits may still be arriving')
  }

  async closeChannel(
    channelId: string,
    body: ChannelOperationRequest = {},
  ): Promise<ChannelOperationResponse> {
    const response = await fetch(
      `${this.backendUrl}/v1/channels/${encodeURIComponent(channelId)}/close`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    const bridge = await parseBridgeResponse(response, 'Close channel')
    return { channelId, action: 'close', bridge }
  }

  async withdrawCredits(
    buyer: string,
    body: WithdrawPrincipalRequest,
  ): Promise<WithdrawPrincipalResponse> {
    const response = await fetch(`${this.accountBase(buyer)}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const bridge = await parseBridgeResponse(response, 'Withdraw')
    return { account: normalizeAddress(buyer), amountUsd: body.amount, bridge }
  }

  async submitOperatorConsent(
    buyer: string,
    body: OperatorConsentRequest,
  ): Promise<OperatorConsentResponse> {
    const response = await fetch(`${this.accountBase(buyer)}/operator-consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nonce: body.nonce,
        signature: body.signature,
      }),
    })
    const payload = await readBridgeResponseBody<OperatorConsentResponse>(response, 'Operator consent')
    return {
      buyer: normalizeAddress(payload.buyer ?? buyer),
      bridge: payload.bridge,
    }
  }
}

export class UnavailableAiCreditsBackendClient implements AiCreditsBackendClient {
  private unavailable(): never {
    throw new Error('AI Credits backend is not configured')
  }

  async getDiscountConfig() {
    return this.unavailable()
  }

  async getAccountCredit() {
    return this.unavailable()
  }

  async getCreditHistory() {
    return this.unavailable()
  }

  async getOutstanding() {
    return this.unavailable()
  }

  async getTransactions() {
    return this.unavailable()
  }

  async notifyPayment() {
    return this.unavailable()
  }

  async waitForSettlement() {
    return this.unavailable()
  }

  async closeChannel() {
    return this.unavailable()
  }

  async withdrawCredits() {
    return this.unavailable()
  }

  async submitOperatorConsent() {
    return this.unavailable()
  }
}

export function createBackendClient(
  backendUrl: string | undefined,
): AiCreditsBackendClient {
  if (!backendUrl) {
    return new UnavailableAiCreditsBackendClient()
  }
  return new ProductionAiCreditsBackendClient(backendUrl)
}

export async function waitForOperatorConsent(
  chain: AiCreditsChainClient,
  ref: AccountRef,
): Promise<void> {
  for (let attempt = 0; attempt < BRIDGE_POLL_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(BRIDGE_POLL_INTERVAL_MS)
    const status = await chain.getBuyerOperatorStatus(ref)
    if (status.operatorAccepted) return
  }

  throw new Error('Operator consent confirmation timeout — check Base transaction status')
}

export async function buildAccountView(
  payer: string,
  backend: AiCreditsBackendClient,
  chain: AiCreditsChainClient,
  options: BuildAccountViewOptions = {},
): Promise<AccountView> {
  const normalizedPayer = normalizeAddress(payer)
  const [credit, outstanding] = await Promise.all([
    backend.getAccountCredit(payer),
    backend.getOutstanding(payer),
  ])
  const buyer =
    options.buyerAddress && isAddress(options.buyerAddress)
      ? normalizeAddress(options.buyerAddress)
      : null
  const [operator, withdrawableUsd] = buyer
    ? await Promise.all([
        chain.getBuyerOperatorStatus({ payer: normalizedPayer, buyer }),
        chain.getWithdrawableUsd(buyer),
      ])
    : [defaultOperatorStatus(normalizedPayer), '0']
  return {
    account: normalizedPayer,
    buyer,
    profile: credit.profile,
    operator,
    withdrawableUsd,
    outstandingFundingUsd: outstanding.outstandingFundingUsd,
    outstandingFundingCount: outstanding.count,
  }
}
