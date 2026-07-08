import type { AiCreditsUsageEntry } from './widgetRuntimeContract'
import type {
  AccountCreditResponse,
  AccountRef,
  AccountView,
  CeloEventsRecordResponse,
  GdCreditEntry,
  SettlementResult,
  TransactionsResponse,
  UserCreditProfile,
} from './backendTypes'
import type { BuyerOperatorStatus } from './operatorConsent'
import { markMockOperatorConsent, type AiCreditsChainClient } from './chainClient'
import {
  flowRateWeiToMonthlyG,
  usdToCredits,
  weiToG,
} from './quoteMath'
import { isAddress } from 'viem'

export type {
  AccountRef,
  AccountCreditResponse,
  AccountView,
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

function filterGdCredits(
  entries: GdCreditEntry[],
  options: { status?: 'pending' | 'funded' | 'failed'; limit?: number } = {},
): GdCreditEntry[] {
  let result = [...entries]
  if (options.status) {
    result = result.filter((entry) => entry.fundingStatus === options.status)
  }
  const limit = options.limit
  const sorted = result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (limit === undefined) return sorted
  return sorted.slice(0, limit)
}

export function resolveBuyerAddress(credit: AccountCreditResponse): string | null {
  for (const entry of credit.gdCredits) {
    if (entry.buyerAddress && isAddress(entry.buyerAddress)) {
      return normalizeAddress(entry.buyerAddress)
    }
  }
  return null
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

export function balanceFromProfile(
  profile: Pick<UserCreditProfile, 'totalPrincipalUsd' | 'totalBonusUsd'>,
): string {
  const principal = BigInt(profile.totalPrincipalUsd || '0')
  const bonus = BigInt(profile.totalBonusUsd || '0')
  return usdToCredits((principal + bonus).toString())
}

export function creditsBalanceFromStatus(status: {
  profile: Pick<UserCreditProfile, 'totalPrincipalUsd' | 'totalBonusUsd'>
}): string {
  return balanceFromProfile(status.profile)
}

export type AccountEnrichment = {
  balance: string
  goodIdVerified: boolean
  bonusPercent: number
  buyer: string | null
  totalGdDepositedG: string
  monthlyStreamG: string
  monthlyStreamCredits: string | null
}

export async function enrichAccountView(
  view: AccountView,
  chain: AiCreditsChainClient,
): Promise<AccountEnrichment> {
  const { profile } = view
  const goodIdVerified = await chain.isGoodIdVerified(profile.account)
  const monthlyStreamG = flowRateWeiToMonthlyG(profile.streamFlowRateWeiPerSecond)
  let monthlyStreamCredits: string | null = null
  if (Number.parseFloat(monthlyStreamG) > 0) {
    monthlyStreamCredits = (await chain.buildQuote('0', monthlyStreamG, goodIdVerified)).totalCredits
  }
  const depositedWei = BigInt(profile.totalGdDepositedWei)
  const buyer = view.buyer
  return {
    balance: balanceFromProfile(profile),
    goodIdVerified,
    bonusPercent: goodIdVerified
      ? Number.parseFloat(monthlyStreamG) > 0
        ? 20
        : 10
      : 0,
    buyer,
    totalGdDepositedG: depositedWei > 0n ? weiToG(depositedWei) : '0.00',
    monthlyStreamG,
    monthlyStreamCredits,
  }
}

function sourceLabel(source: GdCreditEntry['source']): string {
  if (source === 'deposit') return 'G$ deposit'
  return 'G$ stream'
}

export function gdCreditsToUsageEntries(entries: GdCreditEntry[]): AiCreditsUsageEntry[] {
  return [...entries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((entry) => ({
      sessionId: entry.id,
      timestamp: entry.createdAt,
      creditsUsed: Number.parseFloat(usdToCredits(entry.totalCreditUsd)),
      model:
        entry.fundingStatus === 'failed'
          ? `${sourceLabel(entry.source)} (failed)`
          : sourceLabel(entry.source),
      kind: 'funding' as const,
      fundingStatus: entry.fundingStatus,
      gdAmountG: weiToG(BigInt(entry.gdAmountWei)),
      totalCreditUsdMicro: entry.totalCreditUsd,
    }))
}

export interface AiCreditsBackendClient {
  getAccountCredit(payer: string): Promise<AccountCreditResponse>
  getOutstanding(payer: string): Promise<{ outstandingFundingUsd: string; count: number }>
  getTransactions(
    payer: string,
    options?: { status?: 'pending' | 'funded' | 'failed'; limit?: number; cursor?: string },
  ): Promise<TransactionsResponse>
  getUsageLog(payer: string): Promise<AiCreditsUsageEntry[]>
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

const MOCK_DELAY_MS = 600

export class MockAiCreditsBackendClient implements AiCreditsBackendClient {
  private activeRef: AccountRef | null = null
  private lastCreditUsd = 0n

  private readonly accountStates = new Map<
    string,
    {
      principalUsd: bigint
      bonusUsd: bigint
      transactions: GdCreditEntry[]
      rootAccount: string
    }
  >()

  private getState(payer: string) {
    const key = normalizeAddress(payer)
    if (!this.accountStates.has(key)) {
      this.accountStates.set(key, {
        principalUsd: 0n,
        bonusUsd: 0n,
        transactions: [],
        rootAccount: key,
      })
    }
    return this.accountStates.get(key)!
  }

  private buildProfile(payer: string): UserCreditProfile {
    const state = this.getState(payer)
    const now = new Date().toISOString()
    const outstanding = state.transactions
      .filter((entry) => entry.fundingStatus === 'pending' || entry.fundingStatus === 'failed')
      .reduce((sum, entry) => sum + BigInt(entry.totalCreditUsd), 0n)
    return {
      account: normalizeAddress(payer),
      rootAccount: state.rootAccount,
      createdAt: now,
      updatedAt: now,
      totalGdDepositedWei: '0',
      totalPrincipalUsd: state.principalUsd.toString(),
      totalBonusUsd: state.bonusUsd.toString(),
      totalGDStreamedWei: '0',
      totalOutstandingFundingUsd: outstanding.toString(),
      streamFlowRateWeiPerSecond: '0',
    }
  }

  async getAccountCredit(payer: string): Promise<AccountCreditResponse> {
    await sleep(MOCK_DELAY_MS)
    const profile = this.buildProfile(payer)
    return {
      account: profile.account,
      profile,
      gdCredits: this.getState(payer).transactions,
    }
  }

  async getOutstanding(payer: string): Promise<{ outstandingFundingUsd: string; count: number }> {
    await sleep(MOCK_DELAY_MS)
    const state = this.getState(payer)
    const pending = state.transactions.filter(
      (entry) => entry.fundingStatus === 'pending' || entry.fundingStatus === 'failed',
    )
    const outstanding = pending.reduce(
      (sum, entry) => sum + BigInt(entry.totalCreditUsd || '0'),
      0n,
    )
    return { outstandingFundingUsd: outstanding.toString(), count: pending.length }
  }

  async getTransactions(
    payer: string,
    options: { status?: 'pending' | 'funded' | 'failed'; limit?: number; cursor?: string } = {},
  ): Promise<TransactionsResponse> {
    await sleep(MOCK_DELAY_MS)
    let transactions = [...this.getState(payer).transactions]
    if (options.status) {
      transactions = transactions.filter((entry) => entry.fundingStatus === options.status)
    }
    const limit = options.limit ?? 20
    const page = transactions.slice(0, limit)
    return { account: normalizeAddress(payer), transactions: page }
  }

  async getUsageLog(payer: string): Promise<AiCreditsUsageEntry[]> {
    const credit = await this.getAccountCredit(payer)
    return gdCreditsToUsageEntries(filterGdCredits(credit.gdCredits))
  }

  prepareSettlement(ref: AccountRef, creditUsd: bigint): void {
    this.activeRef = { payer: normalizeAddress(ref.payer), buyer: normalizeAddress(ref.buyer) }
    this.lastCreditUsd = creditUsd
  }

  async notifyPayment(txHash: string): Promise<CeloEventsRecordResponse> {
    await sleep(MOCK_DELAY_MS)
    const ref = this.activeRef
    if (!ref) return { txHash, events: [] }

    const totalUsd = this.lastCreditUsd
    const now = new Date().toISOString()
    const entry: GdCreditEntry = {
      id: `${txHash}:0`,
      account: ref.payer,
      rootAccount: ref.payer,
      source: 'deposit',
      gdAmountWei: '0',
      totalCreditUsd: totalUsd.toString(),
      principalUsd: totalUsd.toString(),
      bonusUsd: '0',
      fundingStatus: 'pending',
      txHash,
      logIndex: 0,
      createdAt: now,
      streamUpdateMonth: now.slice(0, 7),
      buyerAddress: ref.buyer,
    }

    const state = this.getState(ref.payer)
    if (!state.transactions.find((item) => item.id === entry.id)) {
      state.transactions.unshift(entry)
    }
    return { txHash, events: [entry] }
  }

  async waitForSettlement(
    ref: AccountRef,
    _options: { txHashes?: string[]; previousBalance?: string } = {},
  ): Promise<SettlementResult> {
    await sleep(MOCK_DELAY_MS)
    const state = this.getState(ref.payer)
    for (const entry of state.transactions) {
      if (entry.fundingStatus !== 'pending') continue
      entry.fundingStatus = 'funded'
      state.principalUsd += BigInt(entry.principalUsd)
      state.bonusUsd += BigInt(entry.bonusUsd)
    }
    return { credits: balanceFromProfile(this.buildProfile(ref.payer)) }
  }

  async closeChannel(
    channelId: string,
    _body: ChannelOperationRequest = {},
  ): Promise<ChannelOperationResponse> {
    await sleep(MOCK_DELAY_MS)
    return { channelId, action: 'close', bridge: { enabled: true, txHash: '0xmock' } }
  }

  async withdrawCredits(
    _buyer: string,
    body: WithdrawPrincipalRequest,
  ): Promise<WithdrawPrincipalResponse> {
    await sleep(MOCK_DELAY_MS)
    return {
      account: _buyer,
      amountUsd: body.amount,
      bridge: { enabled: true, txHash: '0xmock' },
    }
  }

  async submitOperatorConsent(buyer: string, _body: OperatorConsentRequest): Promise<OperatorConsentResponse> {
    await sleep(MOCK_DELAY_MS)
    const normalizedBuyer = normalizeAddress(buyer)
    markMockOperatorConsent(normalizedBuyer)
    return { buyer: normalizedBuyer, bridge: { enabled: true, txHash: '0xmock' } }
  }
}

export class ProductionAiCreditsBackendClient implements AiCreditsBackendClient {
  private readonly backendUrl: string

  constructor(backendUrl: string) {
    this.backendUrl = backendUrl.replace(/\/$/, '')
  }

  private accountBase(payer: string): string {
    return `${this.backendUrl}/v1/accounts/${encodeURIComponent(normalizeAddress(payer))}`
  }

  async getAccountCredit(payer: string): Promise<AccountCreditResponse> {
    const response = await fetch(`${this.accountBase(payer)}/credit`)
    if (!response.ok) throw new Error(`Account credit request failed: ${response.status}`)
    return response.json() as Promise<AccountCreditResponse>
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
    const credit = await this.getAccountCredit(payer)
    const transactions = filterGdCredits(credit.gdCredits, options)
    return { account: normalizeAddress(payer), transactions }
  }

  async getUsageLog(payer: string): Promise<AiCreditsUsageEntry[]> {
    const credit = await this.getAccountCredit(payer)
    return gdCreditsToUsageEntries(filterGdCredits(credit.gdCredits))
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
    const baseline = options.previousBalance ? Number.parseFloat(options.previousBalance) : 0
    const txHashes = new Set((options.txHashes ?? []).map((hash) => hash.toLowerCase()))

    for (let attempt = 0; attempt < BRIDGE_POLL_MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) await sleep(BRIDGE_POLL_INTERVAL_MS)

      if (txHashes.size > 0) {
        const credit = await this.getAccountCredit(ref.payer)
        const matching = credit.gdCredits.filter(
          (entry) => entry.txHash && txHashes.has(entry.txHash.toLowerCase()),
        )
        const failed = matching.find((entry) => entry.fundingStatus === 'failed')
        if (failed) {
          throw new Error(failed.fundingError ?? 'Base funding failed for this deposit')
        }
        if (matching.length > 0 && matching.every((entry) => entry.fundingStatus === 'funded')) {
          const credit = await this.getAccountCredit(ref.payer)
          return { credits: balanceFromProfile(credit.profile) }
        }
        if (matching.some((entry) => entry.fundingStatus === 'pending')) continue
      }

      const credit = await this.getAccountCredit(ref.payer)
      const balance = Number.parseFloat(balanceFromProfile(credit.profile))
      if (balance > baseline + 0.0001) {
        return { credits: balanceFromProfile(credit.profile) }
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
      body: JSON.stringify(body),
    })
    const payload = await readBridgeResponseBody<OperatorConsentResponse>(response, 'Operator consent')
    return { buyer: normalizeAddress(payload.buyer ?? buyer), bridge: payload.bridge }
  }
}

export function createBackendClient(backendUrl: string | undefined): AiCreditsBackendClient {
  if (!backendUrl) {
    return new MockAiCreditsBackendClient()
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
): Promise<AccountView> {
  const normalizedPayer = normalizeAddress(payer)
  const [credit, outstanding] = await Promise.all([
    backend.getAccountCredit(payer),
    backend.getOutstanding(payer),
  ])
  const buyer = resolveBuyerAddress(credit)
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
