import type { AiCreditsQuote, AiCreditsUsageEntry } from './widgetRuntimeContract'
import {
  ANTSEED_DEPOSITS_BASE_ADDRESS,
  type OperatorConsentParams,
  type OperatorConsentSubmissionResult,
} from './operatorConsent'

export type { OperatorConsentParams, OperatorConsentSubmissionResult }

type UserCreditProfile = {
  account: string
  rootAccount: string
  totalPrincipalMicroUsd: string
  totalBonusMicroUsd: string
}

type GdCreditEntry = {
  id: string
  source: 'deposit' | 'streamUpdate' | 'streamRequest' | 'streamCron'
  totalCreditMicroUsd: string
  fundingStatus: 'pending' | 'funded' | 'failed'
  createdAt: string
}

type AccountCreditResponse = {
  account: string
  profile: UserCreditProfile
  gdCredits: GdCreditEntry[]
}

export type CeloEventsRecordResponse = {
  txHash?: string
  account?: string
  fromBlock?: string
  toBlock?: string
  events: GdCreditEntry[]
}

export interface AiCreditsBackendClient {
  getQuote(
    address: string,
    depositG: string,
    streamG: string,
    options?: { isGoodIdVerified?: boolean },
  ): Promise<AiCreditsQuote>

  getCreditsBalance(account: string): Promise<string>

  getUsageLog(account: string): Promise<AiCreditsUsageEntry[]>

  getOperatorConsentParams(buyer: string): Promise<OperatorConsentParams>

  submitOperatorConsent(
    buyer: string,
    nonce: string,
    signature: string,
  ): Promise<OperatorConsentSubmissionResult>

  notifyPayment(txHash: string): Promise<CeloEventsRecordResponse>

  waitForSettlement(account: string, previousBalance?: string): Promise<{ credits: string }>
}

const MOCK_DELAY_MS = 600
const CREDITS_PER_MICRO_USD = 10_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function microUsdToCredits(microUsd: string): string {
  const value = BigInt(microUsd || '0')
  const credits = Number(value) / CREDITS_PER_MICRO_USD
  return credits.toFixed(2)
}

function balanceFromAccountCredit(data: AccountCreditResponse): string {
  const principal = BigInt(data.profile.totalPrincipalMicroUsd || '0')
  const bonus = BigInt(data.profile.totalBonusMicroUsd || '0')
  return microUsdToCredits((principal + bonus).toString())
}

function gdCreditsToUsageEntries(entries: GdCreditEntry[]): AiCreditsUsageEntry[] {
  return [...entries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((entry) => ({
      sessionId: entry.id,
      timestamp: entry.createdAt,
      creditsUsed: Number.parseFloat(microUsdToCredits(entry.totalCreditMicroUsd)),
      model: entry.source === 'deposit' ? 'G$ deposit' : 'G$ stream',
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

export class MockAiCreditsBackendClient implements AiCreditsBackendClient {
  private readonly isGoodIdVerified: boolean

  constructor(options: { isGoodIdVerified?: boolean } = {}) {
    this.isGoodIdVerified = options.isGoodIdVerified ?? false
  }

  async getQuote(
    _address: string,
    depositG: string,
    streamG: string,
    options?: { isGoodIdVerified?: boolean },
  ): Promise<AiCreditsQuote> {
    await sleep(MOCK_DELAY_MS)
    return calculateMockQuote(depositG, streamG, options?.isGoodIdVerified ?? this.isGoodIdVerified)
  }

  async getCreditsBalance(_account: string): Promise<string> {
    await sleep(MOCK_DELAY_MS)
    return '124.50'
  }

  async getUsageLog(_account: string): Promise<AiCreditsUsageEntry[]> {
    await sleep(MOCK_DELAY_MS)
    return [
      {
        sessionId: 'sess-001',
        timestamp: '2025-06-20T10:00:00Z',
        creditsUsed: 12.5,
        model: 'claude-3-5-sonnet',
        kind: 'usage',
      },
      {
        sessionId: 'sess-002',
        timestamp: '2025-06-21T14:30:00Z',
        creditsUsed: 8.0,
        model: 'gpt-4o',
        kind: 'usage',
      },
      {
        sessionId: 'sess-003',
        timestamp: '2025-06-22T09:15:00Z',
        creditsUsed: 22.0,
        model: 'claude-3-5-sonnet',
        kind: 'usage',
      },
    ]
  }

  async getOperatorConsentParams(buyer: string): Promise<OperatorConsentParams> {
    await sleep(MOCK_DELAY_MS)
    return {
      enabled: true,
      buyer: buyer.toLowerCase(),
      depositsAddress: ANTSEED_DEPOSITS_BASE_ADDRESS,
      operatorAddress: '0x0000000000000000000000000000000000000004',
      chainId: 8453,
      domainSeparator: `0x${'00'.repeat(64)}`,
      nonce: '0',
      alreadyAccepted: false,
    }
  }

  async submitOperatorConsent(
    _buyer: string,
    _nonce: string,
    _signature: string,
  ): Promise<OperatorConsentSubmissionResult> {
    await sleep(MOCK_DELAY_MS)
    return { accepted: true, txHash: `0xmock${Date.now().toString(16)}` }
  }

  async notifyPayment(_txHash: string): Promise<CeloEventsRecordResponse> {
    await sleep(MOCK_DELAY_MS)
    return { events: [] }
  }

  async waitForSettlement(_account: string, _previousBalance?: string): Promise<{ credits: string }> {
    await sleep(2000)
    return { credits: '110.00' }
  }
}

export class ProductionAiCreditsBackendClient implements AiCreditsBackendClient {
  private readonly backendUrl: string

  constructor(backendUrl: string) {
    this.backendUrl = backendUrl.replace(/\/$/, '')
  }

  private async fetchAccountCredit(account: string): Promise<AccountCreditResponse | null> {
    const url = `${this.backendUrl}/v1/accounts/${encodeURIComponent(account)}/credit`
    const response = await fetch(url)
    if (!response.ok) return null
    return response.json() as Promise<AccountCreditResponse>
  }

  async getQuote(
    _address: string,
    depositG: string,
    streamG: string,
    options?: { isGoodIdVerified?: boolean },
  ): Promise<AiCreditsQuote> {
    return calculateMockQuote(depositG, streamG, options?.isGoodIdVerified ?? false)
  }

  async getCreditsBalance(account: string): Promise<string> {
    const data = await this.fetchAccountCredit(account)
    if (!data) throw new Error('Balance request failed')
    return balanceFromAccountCredit(data)
  }

  async getUsageLog(account: string): Promise<AiCreditsUsageEntry[]> {
    const data = await this.fetchAccountCredit(account)
    if (!data) throw new Error('Usage log request failed')
    return gdCreditsToUsageEntries(data.gdCredits ?? [])
  }

  async getOperatorConsentParams(buyer: string): Promise<OperatorConsentParams> {
    const url = `${this.backendUrl}/v1/operator/consent?buyer=${encodeURIComponent(buyer)}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Operator consent params request failed: ${response.status}`)
    return response.json() as Promise<OperatorConsentParams>
  }

  async submitOperatorConsent(
    buyer: string,
    nonce: string,
    signature: string,
  ): Promise<OperatorConsentSubmissionResult> {
    const url = `${this.backendUrl}/v1/operator/consent`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyer, nonce, signature }),
    })
    if (!response.ok) throw new Error(`Operator consent submission failed: ${response.status}`)
    return response.json() as Promise<OperatorConsentSubmissionResult>
  }

  async notifyPayment(txHash: string): Promise<CeloEventsRecordResponse> {
    const url = `${this.backendUrl}/v1/celo/events/record`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash }),
    })
    if (!response.ok) throw new Error(`Payment notification failed: ${response.status}`)
    return response.json() as Promise<CeloEventsRecordResponse>
  }

  async waitForSettlement(account: string, previousBalance?: string): Promise<{ credits: string }> {
    const POLL_INTERVAL_MS = 3000
    const MAX_ATTEMPTS = 20
    const baseline = previousBalance ? Number.parseFloat(previousBalance) : 0

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) await sleep(POLL_INTERVAL_MS)
      const data = await this.fetchAccountCredit(account)
      if (!data) continue

      const balance = Number.parseFloat(balanceFromAccountCredit(data))
      const hasFundedCredit = (data.gdCredits ?? []).some((entry) => entry.fundingStatus === 'funded')
      const increased = balance > baseline + 0.0001

      if (increased || (baseline === 0 && balance > 0 && hasFundedCredit)) {
        return { credits: balanceFromAccountCredit(data) }
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
