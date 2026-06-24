import type { AiCreditsQuote, AiCreditsUsageEntry } from './widgetRuntimeContract'
import type {
  OperatorConsentParams,
  OperatorConsentSubmissionResult,
} from './operatorConsent'

export type { OperatorConsentParams, OperatorConsentSubmissionResult }

export interface AiCreditsBackendClient {
  /**
   * Returns a pricing quote for the given deposit and stream amounts.
   * @param address - Payer wallet address
   * @param depositG - One-time deposit amount in G$ (e.g. "10")
   * @param streamG - Monthly stream amount in G$ (e.g. "5")
   */
  getQuote(address: string, depositG: string, streamG: string): Promise<AiCreditsQuote>

  /**
   * Returns the current AI credits balance for the given account.
   * @param account - Payer wallet address
   */
  getCreditsBalance(account: string): Promise<string>

  /**
   * Returns the usage log for the given account.
   * @param account - Payer wallet address
   */
  getUsageLog(account: string): Promise<AiCreditsUsageEntry[]>

  getOperatorConsentParams(buyer: string): Promise<OperatorConsentParams>

  submitOperatorConsent(
    buyer: string,
    nonce: string,
    signature: string,
  ): Promise<OperatorConsentSubmissionResult>

  notifyPayment(txHash: string): Promise<{ estimatedCredits: string }>

  /**
   * Polls the backend for credit settlement status after a payment.
   * Resolves when credits are confirmed or throws on timeout/error.
   * @param account - Payer wallet address
   */
  waitForSettlement(account: string): Promise<{ credits: string }>
}

// ---------------------------------------------------------------------------
// Mock backend client — returns deterministic fake data.
// Completely separate from any production code path; no if(mock) sprinkled in adapter.
// ---------------------------------------------------------------------------

const MOCK_DELAY_MS = 600

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Deterministic mock quote calculation: $1 G$ ≈ 0.0015 USD, 1 USD ≈ 100 credits */
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
  /** Whether to simulate the GoodID verified bonus in quote calculations */
  private readonly isGoodIdVerified: boolean

  constructor(options: { isGoodIdVerified?: boolean } = {}) {
    this.isGoodIdVerified = options.isGoodIdVerified ?? false
  }

  async getQuote(_address: string, depositG: string, streamG: string): Promise<AiCreditsQuote> {
    await sleep(MOCK_DELAY_MS)
    return calculateMockQuote(depositG, streamG, this.isGoodIdVerified)
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
      },
      {
        sessionId: 'sess-002',
        timestamp: '2025-06-21T14:30:00Z',
        creditsUsed: 8.0,
        model: 'gpt-4o',
      },
      {
        sessionId: 'sess-003',
        timestamp: '2025-06-22T09:15:00Z',
        creditsUsed: 22.0,
        model: 'claude-3-5-sonnet',
      },
    ]
  }

  async getOperatorConsentParams(buyer: string): Promise<OperatorConsentParams> {
    await sleep(MOCK_DELAY_MS)
    return {
      enabled: true,
      buyer: buyer.toLowerCase(),
      depositsAddress: '0x0000000000000000000000000000000000000003',
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

  async notifyPayment(_txHash: string): Promise<{ estimatedCredits: string }> {
    await sleep(MOCK_DELAY_MS)
    return { estimatedCredits: '110.00' }
  }

  async waitForSettlement(_account: string): Promise<{ credits: string }> {
    // Simulate backend settlement taking 2 seconds
    await sleep(2000)
    return { credits: '110.00' }
  }
}

// ---------------------------------------------------------------------------
// Production backend client stub — calls backendUrl REST endpoints.
// Separated from mock so the adapter only receives a single client implementation.
// ---------------------------------------------------------------------------

export class ProductionAiCreditsBackendClient implements AiCreditsBackendClient {
  private readonly backendUrl: string

  constructor(backendUrl: string) {
    this.backendUrl = backendUrl.replace(/\/$/, '')
  }

  async getQuote(address: string, depositG: string, streamG: string): Promise<AiCreditsQuote> {
    const url = `${this.backendUrl}/quote?address=${encodeURIComponent(address)}&depositG=${depositG}&streamG=${streamG}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Quote request failed: ${response.status}`)
    return response.json() as Promise<AiCreditsQuote>
  }

  async getCreditsBalance(account: string): Promise<string> {
    const url = `${this.backendUrl}/v1/accounts/${encodeURIComponent(account)}/credit`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Balance request failed: ${response.status}`)
    const data = (await response.json()) as { balance: string }
    return data.balance
  }

  async getUsageLog(account: string): Promise<AiCreditsUsageEntry[]> {
    const url = `${this.backendUrl}/v1/accounts/${encodeURIComponent(account)}/credit`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Usage log request failed: ${response.status}`)
    const data = (await response.json()) as { requests?: AiCreditsUsageEntry[] }
    return data.requests ?? []
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

  async notifyPayment(txHash: string): Promise<{ estimatedCredits: string }> {
    const url = `${this.backendUrl}/v1/celo/events/record`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash }),
    })
    if (!response.ok) throw new Error(`Payment notification failed: ${response.status}`)
    return response.json() as Promise<{ estimatedCredits: string }>
  }

  async waitForSettlement(account: string): Promise<{ credits: string }> {
    const POLL_INTERVAL_MS = 3000
    const MAX_ATTEMPTS = 20

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS)
      const url = `${this.backendUrl}/v1/accounts/${encodeURIComponent(account)}/credit`
      const response = await fetch(url)
      if (!response.ok) continue
      const data = (await response.json()) as { balance?: string; status?: string }
      if (data.balance && Number.parseFloat(data.balance) > 0) {
        return { credits: data.balance }
      }
    }

    throw new Error('Settlement polling timeout — credits may still be arriving')
  }
}

// ---------------------------------------------------------------------------
// Factory helper — resolves the correct backend client based on context
// ---------------------------------------------------------------------------

export function createBackendClient(
  backendUrl: string | undefined,
  options: { isGoodIdVerified?: boolean } = {},
): AiCreditsBackendClient {
  if (!backendUrl) {
    return new MockAiCreditsBackendClient(options)
  }
  return new ProductionAiCreditsBackendClient(backendUrl)
}
