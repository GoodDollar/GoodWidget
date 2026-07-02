import type { AiCreditsUsageEntry } from './widgetRuntimeContract'
import type { OperatorAcceptResponse } from './operatorConsent'
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
import type { AiCreditsChainClient } from './chainClient'
import {
  flowRateWeiToMonthlyG,
  isGoodIdVerifiedFromProfile,
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

function normalizeAddress(address: string): string {
  return address.toLowerCase()
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
  const goodIdVerified = isGoodIdVerifiedFromProfile(profile.account, profile.rootAccount)
  const monthlyStreamG = flowRateWeiToMonthlyG(profile.streamFlowRateWeiPerSecond ?? '0')
  let monthlyStreamCredits: string | null = null
  if (Number.parseFloat(monthlyStreamG) > 0) {
    monthlyStreamCredits = (await chain.buildQuote('0', monthlyStreamG, goodIdVerified)).totalCredits
  }
  const depositedWei = BigInt(profile.totalGdDepositedWei ?? '0')
  const buyer =
    profile.buyer && isAddress(profile.buyer) ? profile.buyer.toLowerCase() : null
  return {
    balance: balanceFromProfile(profile),
    goodIdVerified,
    bonusPercent: goodIdVerified ? 20 : 10,
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
    }))
}

export interface AiCreditsBackendClient {
  getAccountCredit(payer: string): Promise<AccountCreditResponse>
  getOutstanding(payer: string): Promise<{ outstandingFundingUsd: string; count: number }>
  acceptOperator(ref: AccountRef, buyerSig: string, nonce: string): Promise<OperatorAcceptResponse>
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
  closeChannel(channelId: string): Promise<{ ok: boolean }>
  withdrawCredits(
    payer: string,
    body: { buyerAddress: string; amountUsd: string; recipient: string; timestamp: number; buyerSig: string },
  ): Promise<{ ok: boolean }>
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
      operatorAccepted: boolean
      buyer: string | null
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
        operatorAccepted: false,
        buyer: null,
        rootAccount: key,
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
      rootAccount: state.rootAccount,
      totalPrincipalUsd: state.principalUsd.toString(),
      totalBonusUsd: state.bonusUsd.toString(),
      totalOutstandingFundingUsd: outstanding.toString(),
      buyer: state.buyer ?? undefined,
      totalGdDepositedWei: '0',
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

  async acceptOperator(ref: AccountRef, _buyerSig: string, _nonce: string): Promise<OperatorAcceptResponse> {
    await sleep(MOCK_DELAY_MS)
    const state = this.getState(ref.payer)
    state.operatorAccepted = true
    state.buyer = normalizeAddress(ref.buyer)
    return {
      account: normalizeAddress(ref.payer),
      buyerAddress: normalizeAddress(ref.buyer),
      bridge: { txHash: `0xmock${Date.now().toString(16)}` },
    }
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
    const page = await this.getTransactions(payer, { limit: 20 })
    return gdCreditsToUsageEntries(page.transactions ?? [])
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
    const entry: GdCreditEntry = {
      id: `${txHash}:0`,
      source: 'deposit',
      totalCreditUsd: totalUsd.toString(),
      principalUsd: totalUsd.toString(),
      bonusUsd: '0',
      fundingStatus: 'pending',
      txHash,
      logIndex: 0,
      createdAt: new Date().toISOString(),
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
      state.principalUsd += BigInt(entry.principalUsd ?? '0')
      state.bonusUsd += BigInt(entry.bonusUsd ?? '0')
    }
    return { credits: balanceFromProfile(this.buildProfile(ref.payer)) }
  }

  async closeChannel(_channelId: string): Promise<{ ok: boolean }> {
    await sleep(MOCK_DELAY_MS)
    return { ok: true }
  }

  async withdrawCredits(): Promise<{ ok: boolean }> {
    await sleep(MOCK_DELAY_MS)
    return { ok: true }
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
    const data = (await response.json()) as { outstandingFundingUsd?: string; count?: number }
    return {
      outstandingFundingUsd: data.outstandingFundingUsd ?? '0',
      count: data.count ?? 0,
    }
  }

  async acceptOperator(ref: AccountRef, buyerSig: string, nonce: string): Promise<OperatorAcceptResponse> {
    const response = await fetch(`${this.accountBase(ref.payer)}/operator/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyerAddress: normalizeAddress(ref.buyer),
        buyerSig,
        nonce,
      }),
    })
    if (!response.ok) throw new Error(`Operator accept request failed: ${response.status}`)
    return response.json() as Promise<OperatorAcceptResponse>
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

  async closeChannel(channelId: string): Promise<{ ok: boolean }> {
    const response = await fetch(`${this.backendUrl}/v1/channels/${encodeURIComponent(channelId)}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!response.ok) throw new Error(`Close channel request failed: ${response.status}`)
    return { ok: true }
  }

  async withdrawCredits(
    payer: string,
    body: { buyerAddress: string; amountUsd: string; recipient: string; timestamp: number; buyerSig: string },
  ): Promise<{ ok: boolean }> {
    const response = await fetch(`${this.accountBase(payer)}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error(`Withdraw request failed: ${response.status}`)
    return { ok: true }
  }
}

export function createBackendClient(backendUrl: string | undefined): AiCreditsBackendClient {
  if (!backendUrl) {
    return new MockAiCreditsBackendClient()
  }
  return new ProductionAiCreditsBackendClient(backendUrl)
}

export async function buildAccountView(
  payer: string,
  backend: AiCreditsBackendClient,
  chain: AiCreditsChainClient,
): Promise<AccountView> {
  const [credit, outstanding] = await Promise.all([
    backend.getAccountCredit(payer),
    backend.getOutstanding(payer),
  ])
  const buyer = credit.profile.buyer ?? payer
  const [operator, withdrawableUsd] = await Promise.all([
    chain.getBuyerOperatorStatus({ payer, buyer }),
    chain.getWithdrawableUsd(buyer),
  ])
  return {
    account: normalizeAddress(payer),
    buyer: credit.profile.buyer ?? null,
    profile: credit.profile,
    operator,
    withdrawableUsd,
    outstandingFundingUsd: outstanding.outstandingFundingUsd,
    outstandingFundingCount: outstanding.count,
  }
}
