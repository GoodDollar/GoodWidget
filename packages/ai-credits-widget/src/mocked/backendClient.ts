import type {
  AccountCreditResponse,
  AccountRef,
  CeloEventsRecordResponse,
  ChannelOperationResponse,
  CreditHistoryQuery,
  CreditHistoryResponse,
  DiscountConfig,
  GdCreditEntry,
  OperatorConsentResponse,
  OperatorRevokeResponse,
  SettlementResult,
  TransactionsResponse,
  UserCreditProfile,
  WithdrawPrincipalRequest,
  WithdrawPrincipalResponse,
} from '../backendClient'
import { DEFAULT_DISCOUNT_CONFIG, totalCreditUsdFromProfile } from '../backendClient'
import type { AiCreditsBackendClient } from '../backendClient'
import { clearMockOperatorConsent, markMockOperatorConsent } from './chainClient'

const MOCK_DELAY_MS = 600
const DEFAULT_HISTORY_LIMIT = 20
const MAX_HISTORY_LIMIT = 100

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

function paginateGdCredits(
  entries: GdCreditEntry[],
  options: CreditHistoryQuery = {},
): CreditHistoryResponse {
  let result = [...entries].sort((a, b) => {
    const byCreated = b.createdAt.localeCompare(a.createdAt)
    return byCreated !== 0 ? byCreated : b.id.localeCompare(a.id)
  })
  if (options.source) result = result.filter((entry) => entry.source === options.source)
  if (options.fundingStatus) result = result.filter((entry) => entry.fundingStatus === options.fundingStatus)
  if (options.from) {
    const fromMs = Date.parse(options.from)
    result = result.filter((entry) => Date.parse(entry.createdAt) >= fromMs)
  }
  if (options.to) {
    const toMs = Date.parse(options.to)
    result = result.filter((entry) => Date.parse(entry.createdAt) <= toMs)
  }
  const limit = options.limit === undefined
    ? DEFAULT_HISTORY_LIMIT
    : Math.min(Math.max(1, Math.floor(options.limit)), MAX_HISTORY_LIMIT)
  const offset = Math.max(0, Math.floor(options.offset ?? 0))
  return {
    account: '',
    items: result.slice(offset, offset + limit),
    total: result.length,
    limit,
    offset,
    hasMore: offset + limit < result.length,
  }
}

function createDemoHistory(account: string): GdCreditEntry[] {
  const normalized = normalizeAddress(account)
  return [
    {
      id: 'demo-deposit-1', account: normalized, rootAccount: normalized, source: 'deposit',
      gdAmountWei: '440000000000000000000', totalCreditUsd: '6600', principalUsd: '6000',
      bonusUsd: '600', fundingStatus: 'funded', txHash: '0xdemo01', logIndex: 0,
      createdAt: '2026-06-25T14:30:00.000Z', streamUpdateMonth: '2026-06', buyerAddress: normalized,
    },
    {
      id: 'demo-stream-update-1', account: normalized, rootAccount: normalized, source: 'streamUpdate',
      gdAmountWei: '10000000000000000000', totalCreditUsd: '0', principalUsd: '0',
      bonusUsd: '0', fundingStatus: 'funded', txHash: '0xdemo02', logIndex: 0,
      createdAt: '2026-06-24T12:00:00.000Z', streamUpdateMonth: '2026-06', buyerAddress: normalized,
    },
    {
      id: 'demo-stream-request-1', account: normalized, rootAccount: normalized, source: 'streamRequest',
      gdAmountWei: '8000000000000000000', totalCreditUsd: '1200', principalUsd: '1000',
      bonusUsd: '200', fundingStatus: 'pending', txHash: '0xdemo03', logIndex: 0,
      createdAt: '2026-06-23T09:15:00.000Z', streamUpdateMonth: '2026-06', buyerAddress: normalized,
    },
    {
      id: 'demo-stream-cron-1', account: normalized, rootAccount: normalized, source: 'streamCron',
      gdAmountWei: '5000000000000000000', totalCreditUsd: '900', principalUsd: '750',
      bonusUsd: '150', fundingStatus: 'funded', createdAt: '2026-06-22T08:00:00.000Z',
      streamUpdateMonth: '2026-06', buyerAddress: normalized,
    },
  ]
}

export class MockAiCreditsBackendClient implements AiCreditsBackendClient {
  private activeRef: AccountRef | null = null
  private lastCreditUsd = 0n
  private readonly accountStates = new Map<string, {
    principalUsd: bigint
    bonusUsd: bigint
    transactions: GdCreditEntry[]
    rootAccount: string
  }>()

  private getState(payer: string) {
    const key = normalizeAddress(payer)
    if (!this.accountStates.has(key)) {
      this.accountStates.set(key, {
        principalUsd: 0n,
        bonusUsd: 0n,
        transactions: createDemoHistory(key),
        rootAccount: key,
      })
    }
    return this.accountStates.get(key)!
  }

  async getDiscountConfig(): Promise<DiscountConfig> {
    await sleep(MOCK_DELAY_MS)
    return { ...DEFAULT_DISCOUNT_CONFIG }
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
    return { account: profile.account, profile }
  }

  async getCreditHistory(payer: string, options: CreditHistoryQuery = {}): Promise<CreditHistoryResponse> {
    await sleep(MOCK_DELAY_MS)
    return { ...paginateGdCredits(this.getState(payer).transactions, options), account: normalizeAddress(payer) }
  }

  async getOutstanding(payer: string): Promise<{ outstandingFundingUsd: string; count: number }> {
    await sleep(MOCK_DELAY_MS)
    const pending = this.getState(payer).transactions.filter(
      (entry) => entry.fundingStatus === 'pending' || entry.fundingStatus === 'failed',
    )
    return {
      outstandingFundingUsd: pending.reduce((sum, entry) => sum + BigInt(entry.totalCreditUsd || '0'), 0n).toString(),
      count: pending.length,
    }
  }

  async getTransactions(payer: string, options: { status?: 'pending' | 'funded' | 'failed'; limit?: number; cursor?: string } = {}): Promise<TransactionsResponse> {
    const history = await this.getCreditHistory(payer, {
      fundingStatus: options.status, limit: options.limit, offset: options.cursor ? Number(options.cursor) || 0 : 0,
    })
    return { account: history.account, transactions: history.items }
  }

  prepareSettlement(ref: AccountRef, creditUsd: bigint): void {
    this.activeRef = { payer: normalizeAddress(ref.payer), buyer: normalizeAddress(ref.buyer) }
    this.lastCreditUsd = creditUsd
  }

  async notifyPayment(txHash: string): Promise<CeloEventsRecordResponse> {
    await sleep(MOCK_DELAY_MS)
    const ref = this.activeRef
    if (!ref) return { txHash, events: [] }
    const now = new Date().toISOString()
    const entry: GdCreditEntry = {
      id: `${txHash}:0`, account: ref.payer, rootAccount: ref.payer, source: 'deposit',
      gdAmountWei: '0', totalCreditUsd: this.lastCreditUsd.toString(), principalUsd: this.lastCreditUsd.toString(),
      bonusUsd: '0', fundingStatus: 'pending', txHash, logIndex: 0, createdAt: now,
      streamUpdateMonth: now.slice(0, 7), buyerAddress: ref.buyer,
    }
    const state = this.getState(ref.payer)
    if (!state.transactions.find((item) => item.id === entry.id)) state.transactions.unshift(entry)
    return { txHash, events: [entry] }
  }

  async waitForSettlement(ref: AccountRef): Promise<SettlementResult> {
    await sleep(MOCK_DELAY_MS)
    const state = this.getState(ref.payer)
    for (const entry of state.transactions) {
      if (entry.fundingStatus !== 'pending') continue
      entry.fundingStatus = 'funded'
      state.principalUsd += BigInt(entry.principalUsd)
      state.bonusUsd += BigInt(entry.bonusUsd)
    }
    return { totalCreditUsd: totalCreditUsdFromProfile(this.buildProfile(ref.payer)) }
  }

  async closeChannel(channelId: string): Promise<ChannelOperationResponse> {
    await sleep(MOCK_DELAY_MS)
    return { channelId, action: 'close', bridge: { enabled: true, txHash: '0xmock' } }
  }

  async withdrawCredits(buyer: string, body: WithdrawPrincipalRequest): Promise<WithdrawPrincipalResponse> {
    await sleep(MOCK_DELAY_MS)
    return { account: buyer, amountUsd: body.amount, bridge: { enabled: true, txHash: '0xmock' } }
  }

  async submitOperatorConsent(
    buyer: string,
    {}: { nonce: string; signature: string },
  ): Promise<OperatorConsentResponse> {
    await sleep(MOCK_DELAY_MS)
    const normalizedBuyer = normalizeAddress(buyer)
    markMockOperatorConsent(normalizedBuyer)
    return {
      buyer: normalizedBuyer,
      bridge: { enabled: true, txHash: '0xmock' },
    }
  }

  async revokeOperatorConsent(
    buyer: string,
    {}: { nonce: string; signature: string },
  ): Promise<OperatorRevokeResponse> {
    await sleep(MOCK_DELAY_MS)
    // Mirrors submitOperatorConsent: the chain mock is what waitForOperatorRevoke polls.
    clearMockOperatorConsent(normalizeAddress(buyer))
    return {
      buyer: normalizeAddress(buyer),
      bridge: { enabled: true, txHash: '0xmock' },
    }
  }
}
