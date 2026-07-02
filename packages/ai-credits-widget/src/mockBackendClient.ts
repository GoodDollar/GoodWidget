import { parseUnits } from 'viem'
import type { AiCreditsQuote, AiCreditsUsageEntry } from './widgetRuntimeContract'
import {
  ANTSEED_DEPOSITS_BASE_ADDRESS,
  type BuyerOperatorStatus,
  type Eip712SigningPayload,
  type OperatorAcceptResponse,
  type OperatorConsentPayloadResponse,
} from './operatorConsent'

export type AccountRef = {
  payer: string
  buyer: string
}

type UserCreditProfile = {
  account: string
  rootAccount: string
  totalPrincipalUsd: string
  totalBonusUsd: string
  totalOutstandingFundingUsd?: string
  buyer?: string
  createdAt?: string
  updatedAt?: string
  totalGdDepositedWei?: string
  totalGDStreamedWei?: string
  streamFlowRateWeiPerSecond?: string
  lastStreamCreditAt?: string
}

export type GdCreditEntry = {
  id: string
  account?: string
  rootAccount?: string
  source: 'deposit' | 'streamUpdate' | 'streamRequest' | 'streamCron'
  gdAmountWei?: string
  principalUsd?: string
  bonusUsd?: string
  totalCreditUsd: string
  fundingStatus: 'pending' | 'funded' | 'failed'
  fundingTxHash?: string
  fundingError?: string
  txHash?: string
  logIndex?: number
  createdAt: string
  streamUpdateMonth?: string
  buyerAddress?: string
}

type AccountCreditResponse = {
  account: string
  profile: UserCreditProfile
  gdCredits: GdCreditEntry[]
}

export type AccountStatusResponse = {
  account: string
  buyer: string | null
  profile: UserCreditProfile
  operator: BuyerOperatorStatus
  withdrawableUsd: string
  outstandingFundingUsd: string
  outstandingFundingCount: number
}

export type TransactionsResponse = {
  account: string
  transactions: GdCreditEntry[]
  nextCursor?: string
}

export type CeloEventsRecordResponse = {
  txHash?: string
  account?: string
  fromBlock?: string
  toBlock?: string
  events: GdCreditEntry[]
}

export type SettlementResult = {
  credits: string
}

export interface AiCreditsBackendClient {
  getQuote(
    depositG: string,
    streamG: string,
    options?: { isGoodIdVerified?: boolean },
  ): Promise<AiCreditsQuote>

  getPayerStatus(payer: string): Promise<AccountStatusResponse>

  getOperatorStatus(ref: AccountRef): Promise<BuyerOperatorStatus>

  getOperatorConsentPayload(ref: AccountRef): Promise<OperatorConsentPayloadResponse>

  acceptOperator(ref: AccountRef, buyerSig: string): Promise<OperatorAcceptResponse>

  getCreditsBalance(payer: string): Promise<string>

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
}

const MOCK_DELAY_MS = 600
const CREDITS_PER_USD = 10_000
const REGULAR_BONUS_BPS = 1_000n
const STREAMING_BONUS_BPS = 2_000n
const BPS = 10_000n

type GdToCreditQuoteResponse = {
  direction: 'gd-to-credit'
  gdAmountWei: string
  gdPrice: string
  creditUsd: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

function gToWei(amountG: string): bigint {
  const trimmed = amountG.trim()
  if (!trimmed || Number.parseFloat(trimmed) <= 0) return 0n
  return parseUnits(trimmed, 18)
}

function formatProfileUsd(usd: bigint): string {
  return (Number(usd) / 1_000_000).toFixed(4)
}

export function usdToCredits(usd: string): string {
  const value = BigInt(usd || '0')
  const credits = Number(value) / CREDITS_PER_USD
  return credits.toFixed(2)
}

export function creditsBalanceFromStatus(status: AccountStatusResponse): string {
  const totalUsd =
    BigInt(status.profile.totalPrincipalUsd || '0') +
    BigInt(status.profile.totalBonusUsd || '0')
  return usdToCredits(totalUsd.toString())
}

function balanceFromProfile(profile: UserCreditProfile): string {
  const principal = BigInt(profile.totalPrincipalUsd || '0')
  const bonus = BigInt(profile.totalBonusUsd || '0')
  return usdToCredits((principal + bonus).toString())
}

function sourceLabel(source: GdCreditEntry['source']): string {
  if (source === 'deposit') return 'G$ deposit'
  return 'G$ stream'
}

function gdCreditsToUsageEntries(entries: GdCreditEntry[]): AiCreditsUsageEntry[] {
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
    }))
}

function calculateMockQuote(
  depositG: string,
  streamG: string,
  isGoodIdVerified: boolean,
): AiCreditsQuote {
  const deposit = Number.parseFloat(depositG) || 0
  const stream = Number.parseFloat(streamG) || 0
  const G_USD_RATE = 0.0015
  const depositUsd = deposit * G_USD_RATE
  const streamUsd = stream * G_USD_RATE
  const bonusPercent = stream > 0 && isGoodIdVerified ? 20 : 10
  const totalUsd = depositUsd + streamUsd
  const totalCredits = totalUsd * 100 * (1 + bonusPercent / 100)

  return {
    depositAmountG: deposit.toFixed(2),
    streamAmountG: stream.toFixed(2),
    depositAmountUsd: depositUsd.toFixed(4),
    streamAmountUsd: streamUsd.toFixed(4),
    bonusPercent,
    totalCredits: totalCredits.toFixed(2),
  }
}

async function fetchGdToCreditQuote(
  backendUrl: string,
  gdAmountWei: bigint,
): Promise<GdToCreditQuoteResponse> {
  if (gdAmountWei === 0n) {
    return { direction: 'gd-to-credit', gdAmountWei: '0', gdPrice: '0', creditUsd: '0' }
  }
  const response = await fetch(
    `${backendUrl}/v1/quote/gd-to-credit?gdAmountWei=${gdAmountWei.toString()}`,
  )
  if (!response.ok) throw new Error(`Quote request failed: ${response.status}`)
  return response.json() as Promise<GdToCreditQuoteResponse>
}

async function buildProductionQuote(
  backendUrl: string,
  depositG: string,
  streamG: string,
  isGoodIdVerified: boolean,
): Promise<AiCreditsQuote> {
  const depositWei = gToWei(depositG)
  const streamWei = gToWei(streamG)
  const [depositQuote, streamQuote] = await Promise.all([
    fetchGdToCreditQuote(backendUrl, depositWei),
    fetchGdToCreditQuote(backendUrl, streamWei),
  ])

  const depositPrincipalUsd = BigInt(depositQuote.creditUsd)
  const streamPrincipalUsd = BigInt(streamQuote.creditUsd)
  const depositBonusUsd = isGoodIdVerified
    ? (depositPrincipalUsd * REGULAR_BONUS_BPS) / BPS
    : 0n
  const streamBonusUsd = isGoodIdVerified
    ? (streamPrincipalUsd * STREAMING_BONUS_BPS) / BPS
    : 0n
  const totalUsd =
    depositPrincipalUsd + depositBonusUsd + streamPrincipalUsd + streamBonusUsd
  const hasStream = streamWei > 0n
  const bonusPercent = hasStream && isGoodIdVerified ? 20 : 10

  return {
    depositAmountG: depositG,
    streamAmountG: streamG,
    depositAmountUsd: formatProfileUsd(depositPrincipalUsd),
    streamAmountUsd: formatProfileUsd(streamPrincipalUsd),
    bonusPercent,
    totalCredits: usdToCredits(totalUsd.toString()),
  }
}

function buildMockOperatorStatus(ref: AccountRef): BuyerOperatorStatus {
  const payer = normalizeAddress(ref.payer)
  const buyer = normalizeAddress(ref.buyer)
  return {
    enabled: true,
    account: payer,
    buyerAddress: buyer,
    operatorAddress: '0x0000000000000000000000000000000000000004',
    currentOperator: '0x0000000000000000000000000000000000000000',
    operatorAccepted: false,
    consentNonce: '0',
  }
}

function buildMockConsentPayload(ref: AccountRef): OperatorConsentPayloadResponse {
  const payer = normalizeAddress(ref.payer)
  const buyer = normalizeAddress(ref.buyer)
  const typedData: Eip712SigningPayload = {
    primaryType: 'SetOperator',
    domain: {
      name: 'AntseedDeposits',
      version: '1',
      chainId: 8453,
      verifyingContract: ANTSEED_DEPOSITS_BASE_ADDRESS,
    },
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      SetOperator: [
        { name: 'operator', type: 'address' },
        { name: 'nonce', type: 'uint256' },
      ],
    },
    message: {
      operator: '0x0000000000000000000000000000000000000004',
      nonce: '0',
    },
  }
  return { enabled: true, account: payer, buyerAddress: buyer, typedData }
}

export class MockAiCreditsBackendClient implements AiCreditsBackendClient {
  private readonly isGoodIdVerified: boolean
  private activeRef: AccountRef | null = null
  private lastQuote: AiCreditsQuote | null = null

  private readonly accountStates = new Map<
    string,
    {
      principalUsd: bigint
      bonusUsd: bigint
      transactions: GdCreditEntry[]
      operatorAccepted: boolean
      buyer: string | null
    }
  >()

  constructor(options: { isGoodIdVerified?: boolean } = {}) {
    this.isGoodIdVerified = options.isGoodIdVerified ?? false
  }

  private touchRef(ref: AccountRef): void {
    this.activeRef = { payer: normalizeAddress(ref.payer), buyer: normalizeAddress(ref.buyer) }
  }

  private getState(payer: string): {
    principalUsd: bigint
    bonusUsd: bigint
    transactions: GdCreditEntry[]
    operatorAccepted: boolean
    buyer: string | null
  } {
    const key = normalizeAddress(payer)
    if (!this.accountStates.has(key)) {
      this.accountStates.set(key, {
        principalUsd: 0n,
        bonusUsd: 0n,
        transactions: [],
        operatorAccepted: false,
        buyer: null,
      })
    }
    return this.accountStates.get(key)!
  }

  private buildProfile(payer: string): UserCreditProfile {
    const state = this.getState(payer)
    const outstanding = state.transactions
      .filter((entry) => entry.fundingStatus === 'pending' || entry.fundingStatus === 'failed')
      .reduce((sum, entry) => sum + BigInt(entry.totalCreditUsd || '0'), 0n)
    return {
      account: normalizeAddress(payer),
      rootAccount: normalizeAddress(payer),
      totalPrincipalUsd: state.principalUsd.toString(),
      totalBonusUsd: state.bonusUsd.toString(),
      totalOutstandingFundingUsd: outstanding.toString(),
      buyer: state.buyer ?? undefined,
    }
  }

  async getQuote(
    depositG: string,
    streamG: string,
    options?: { isGoodIdVerified?: boolean },
  ): Promise<AiCreditsQuote> {
    await sleep(MOCK_DELAY_MS)
    const quote = calculateMockQuote(
      depositG,
      streamG,
      options?.isGoodIdVerified ?? this.isGoodIdVerified,
    )
    this.lastQuote = quote
    return quote
  }

  async getPayerStatus(payer: string): Promise<AccountStatusResponse> {
    await sleep(MOCK_DELAY_MS)
    const normalizedPayer = normalizeAddress(payer)
    const state = this.getState(normalizedPayer)
    const buyer = state.buyer ?? normalizedPayer
    const operator = buildMockOperatorStatus({ payer: normalizedPayer, buyer })
    operator.operatorAccepted = state.operatorAccepted
    if (state.operatorAccepted) {
      operator.currentOperator = operator.operatorAddress!
    }
    const outstandingFundingCredits = state.transactions.filter(
      (entry) => entry.fundingStatus === 'pending' || entry.fundingStatus === 'failed',
    )
    const profile = this.buildProfile(normalizedPayer)
    return {
      account: normalizedPayer,
      buyer: state.buyer,
      profile,
      operator,
      withdrawableUsd: state.principalUsd.toString(),
      outstandingFundingUsd: profile.totalOutstandingFundingUsd ?? '0',
      outstandingFundingCount: outstandingFundingCredits.length,
    }
  }

  async getOperatorStatus(ref: AccountRef): Promise<BuyerOperatorStatus> {
    const status = await this.getPayerStatus(ref.payer)
    return status.operator
  }

  async getOperatorConsentPayload(ref: AccountRef): Promise<OperatorConsentPayloadResponse> {
    await sleep(MOCK_DELAY_MS)
    this.touchRef(ref)
    return buildMockConsentPayload(ref)
  }

  async acceptOperator(ref: AccountRef, _buyerSig: string): Promise<OperatorAcceptResponse> {
    await sleep(MOCK_DELAY_MS)
    this.touchRef(ref)
    const state = this.getState(ref.payer)
    state.operatorAccepted = true
    state.buyer = normalizeAddress(ref.buyer)
    const operator = buildMockOperatorStatus(ref)
    operator.operatorAccepted = true
    operator.currentOperator = operator.operatorAddress!
    return {
      account: normalizeAddress(ref.payer),
      buyerAddress: normalizeAddress(ref.buyer),
      operator,
      bridge: { txHash: `0xmock${Date.now().toString(16)}` },
    }
  }

  async getCreditsBalance(payer: string): Promise<string> {
    await sleep(MOCK_DELAY_MS)
    return balanceFromProfile(this.buildProfile(payer))
  }

  async getTransactions(
    payer: string,
    options: { status?: 'pending' | 'funded' | 'failed'; limit?: number; cursor?: string } = {},
  ): Promise<TransactionsResponse> {
    await sleep(MOCK_DELAY_MS)
    const state = this.getState(payer)
    let transactions = [...state.transactions]
    if (options.status) {
      transactions = transactions.filter((entry) => entry.fundingStatus === options.status)
    }
    const limit = options.limit ?? 20
    if (options.cursor) {
      const cursorIndex = transactions.findIndex((entry) => entry.id === options.cursor)
      if (cursorIndex >= 0) {
        transactions = transactions.slice(cursorIndex + 1)
      }
    }
    const page = transactions.slice(0, limit)
    const nextCursor =
      transactions.length > limit ? page[page.length - 1]?.id : undefined
    return {
      account: normalizeAddress(payer),
      transactions: page,
      nextCursor,
    }
  }

  async getUsageLog(payer: string): Promise<AiCreditsUsageEntry[]> {
    const page = await this.getTransactions(payer, { limit: 20 })
    return gdCreditsToUsageEntries(page.transactions ?? [])
  }

  async notifyPayment(txHash: string): Promise<CeloEventsRecordResponse> {
    await sleep(MOCK_DELAY_MS)
    const ref = this.activeRef
    if (!ref) {
      return { txHash, events: [] }
    }

    const quote = this.lastQuote ?? calculateMockQuote('10', '0', this.isGoodIdVerified)
    const totalUsd = BigInt(
      Math.round(Number.parseFloat(quote.totalCredits) * CREDITS_PER_USD),
    )
    const bonusPercent = BigInt(quote.bonusPercent)
    const principalUsd = (totalUsd * 10000n) / (10000n + bonusPercent * 100n)
    const bonusUsd = totalUsd - principalUsd

    const entry: GdCreditEntry = {
      id: `${txHash}:0`,
      source: 'deposit',
      totalCreditUsd: totalUsd.toString(),
      principalUsd: principalUsd.toString(),
      bonusUsd: bonusUsd.toString(),
      fundingStatus: 'pending',
      txHash,
      logIndex: 0,
      createdAt: new Date().toISOString(),
      buyerAddress: ref.buyer,
    }

    const state = this.getState(ref.payer)
    const existing = state.transactions.find((item) => item.id === entry.id)
    if (!existing) {
      state.transactions.unshift(entry)
    }

    return { txHash, events: [existing ?? entry] }
  }

  async waitForSettlement(
    ref: AccountRef,
    options: { txHashes?: string[]; previousBalance?: string } = {},
  ): Promise<SettlementResult> {
    this.touchRef(ref)
    const POLL_INTERVAL_MS = 400
    const MAX_ATTEMPTS = 6
    const baseline = options.previousBalance ? Number.parseFloat(options.previousBalance) : 0
    const txHashes = new Set((options.txHashes ?? []).map((hash) => hash.toLowerCase()))
    const state = this.getState(ref.payer)

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) await sleep(POLL_INTERVAL_MS)

      if (txHashes.size > 0) {
        const matching = state.transactions.filter(
          (entry) => entry.txHash && txHashes.has(entry.txHash.toLowerCase()),
        )

        const failed = matching.find((entry) => entry.fundingStatus === 'failed')
        if (failed) {
          throw new Error(failed.fundingError ?? 'Base funding failed for this deposit')
        }

        const pending = matching.filter((entry) => entry.fundingStatus === 'pending')
        if (pending.length > 0 && attempt === MAX_ATTEMPTS - 1) {
          for (const entry of pending) {
            entry.fundingStatus = 'funded'
            state.principalUsd += BigInt(entry.principalUsd ?? '0')
            state.bonusUsd += BigInt(entry.bonusUsd ?? '0')
          }
        } else if (pending.length > 0) {
          continue
        }

        if (
          matching.length > 0 &&
          matching.every((entry) => entry.fundingStatus === 'funded')
        ) {
          return { credits: balanceFromProfile(this.buildProfile(ref.payer)) }
        }
      }

      const balance = Number.parseFloat(balanceFromProfile(this.buildProfile(ref.payer)))
      if (balance > baseline + 0.0001) {
        return { credits: balanceFromProfile(this.buildProfile(ref.payer)) }
      }
    }

    for (const entry of state.transactions) {
      if (entry.fundingStatus !== 'pending') continue
      if (txHashes.size > 0 && entry.txHash && !txHashes.has(entry.txHash.toLowerCase())) continue
      entry.fundingStatus = 'funded'
      state.principalUsd += BigInt(entry.principalUsd ?? '0')
      state.bonusUsd += BigInt(entry.bonusUsd ?? '0')
    }

    return { credits: balanceFromProfile(this.buildProfile(ref.payer)) }
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

  private withBuyer(url: string, buyer: string): string {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}buyer=${encodeURIComponent(normalizeAddress(buyer))}`
  }

  private async fetchAccountCredit(payer: string): Promise<AccountCreditResponse | null> {
    const response = await fetch(`${this.accountBase(payer)}/credit`)
    if (!response.ok) return null
    return response.json() as Promise<AccountCreditResponse>
  }

  async getQuote(
    depositG: string,
    streamG: string,
    options?: { isGoodIdVerified?: boolean },
  ): Promise<AiCreditsQuote> {
    return buildProductionQuote(
      this.backendUrl,
      depositG,
      streamG,
      options?.isGoodIdVerified ?? false,
    )
  }

  async getPayerStatus(payer: string): Promise<AccountStatusResponse> {
    const response = await fetch(`${this.accountBase(payer)}/status`)
    if (!response.ok) throw new Error(`Account status request failed: ${response.status}`)
    return response.json() as Promise<AccountStatusResponse>
  }

  async getOperatorStatus(ref: AccountRef): Promise<BuyerOperatorStatus> {
    const url = this.withBuyer(`${this.accountBase(ref.payer)}/operator`, ref.buyer)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Operator status request failed: ${response.status}`)
    return response.json() as Promise<BuyerOperatorStatus>
  }

  async getOperatorConsentPayload(ref: AccountRef): Promise<OperatorConsentPayloadResponse> {
    const url = this.withBuyer(`${this.accountBase(ref.payer)}/operator/consent-payload`, ref.buyer)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Operator consent payload request failed: ${response.status}`)
    return response.json() as Promise<OperatorConsentPayloadResponse>
  }

  async acceptOperator(ref: AccountRef, buyerSig: string): Promise<OperatorAcceptResponse> {
    const response = await fetch(`${this.accountBase(ref.payer)}/operator/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyerAddress: normalizeAddress(ref.buyer),
        buyerSig,
      }),
    })
    if (!response.ok) throw new Error(`Operator accept request failed: ${response.status}`)
    return response.json() as Promise<OperatorAcceptResponse>
  }

  async getCreditsBalance(payer: string): Promise<string> {
    const data = await this.fetchAccountCredit(payer)
    if (!data) throw new Error('Balance request failed')
    return balanceFromProfile(data.profile)
  }

  async getTransactions(
    payer: string,
    options: { status?: 'pending' | 'funded' | 'failed'; limit?: number; cursor?: string } = {},
  ): Promise<TransactionsResponse> {
    const params = new URLSearchParams()
    if (options.status) params.set('status', options.status)
    if (options.limit) params.set('limit', String(options.limit))
    if (options.cursor) params.set('cursor', options.cursor)
    const query = params.toString()
    const url = `${this.accountBase(payer)}/transactions${query ? `?${query}` : ''}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Transactions request failed: ${response.status}`)
    return response.json() as Promise<TransactionsResponse>
  }

  async getUsageLog(payer: string): Promise<AiCreditsUsageEntry[]> {
    const page = await this.getTransactions(payer, { limit: 20 })
    return gdCreditsToUsageEntries(page.transactions ?? [])
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
    const POLL_INTERVAL_MS = 3000
    const MAX_ATTEMPTS = 20
    const baseline = options.previousBalance ? Number.parseFloat(options.previousBalance) : 0
    const txHashes = new Set((options.txHashes ?? []).map((hash) => hash.toLowerCase()))

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) await sleep(POLL_INTERVAL_MS)

      if (txHashes.size > 0) {
        const page = await this.getTransactions(ref.payer, { limit: 20 })
        const matching = (page.transactions ?? []).filter(
          (entry) => entry.txHash && txHashes.has(entry.txHash.toLowerCase()),
        )

        const failed = matching.find((entry) => entry.fundingStatus === 'failed')
        if (failed) {
          throw new Error(failed.fundingError ?? 'Base funding failed for this deposit')
        }

        if (matching.length > 0 && matching.every((entry) => entry.fundingStatus === 'funded')) {
          const status = await this.getPayerStatus(ref.payer)
          return { credits: balanceFromProfile(status.profile) }
        }

        const pending = matching.some((entry) => entry.fundingStatus === 'pending')
        if (pending) continue
      }

      const status = await this.getPayerStatus(ref.payer)
      const balance = Number.parseFloat(balanceFromProfile(status.profile))
      if (balance > baseline + 0.0001) {
        return { credits: balanceFromProfile(status.profile) }
      }

      if (baseline === 0 && balance > 0 && status.outstandingFundingCount === 0) {
        return { credits: balanceFromProfile(status.profile) }
      }
    }

    throw new Error('Settlement polling timeout — credits may still be arriving')
  }
}

export function createBackendClient(
  backendUrl: string | undefined,
  options: { isGoodIdVerified?: boolean } = {},
): AiCreditsBackendClient {
  if (!backendUrl) {
    return new MockAiCreditsBackendClient(options)
  }
  return new ProductionAiCreditsBackendClient(backendUrl)
}
