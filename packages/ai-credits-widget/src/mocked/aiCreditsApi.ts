import type {
  AiCreditsAccountId,
  AiCreditsApi,
  AiCreditsApiAccount,
  AiCreditsApiKeyIssue,
  AiCreditsKeyPurchase,
} from '../aiCreditsApi/types'
import type { CreditHistoryResponse } from '../backendTypes'

// MOCK DATA: Storybook/dev only. The base URL is deliberately unusable (`.invalid` never resolves).
export const MOCK_GATEWAY_BASE_URL = 'https://mock-gateway.invalid'

const MOCK_DELAY_MS = 400
const MOCK_USED_THIS_MONTH_USD_MICRO = '12340000'
const MOCK_KEY_PREFIX = 'sk-mock-'
const MOCK_KEY_RANDOM_LENGTH = 24
const MOCK_MASK_VISIBLE_TAIL = 4
const DAYS_PER_MOCK_LIMIT_WINDOW = 30
const MILLISECONDS_PER_DAY = 86_400_000

interface MockAiCreditsApiOptions {
  /** Accounts that already hold a key, keyed by account id. Accounts not listed start with no key. */
  seededAccounts?: Record<AiCreditsAccountId, { limitUsdMicro: string }>
  /** Forces the next calls of the named methods to reject, to exercise error states. */
  failingMethods?: ReadonlyArray<keyof AiCreditsApi>
  /** Simulated network latency in milliseconds. */
  delayMs?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function generateMockFullKey(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let randomPart = ''
  for (let index = 0; index < MOCK_KEY_RANDOM_LENGTH; index += 1) {
    randomPart += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `${MOCK_KEY_PREFIX}${randomPart}`
}

function maskKey(fullKey: string): string {
  return `${MOCK_KEY_PREFIX}…${fullKey.slice(-MOCK_MASK_VISIBLE_TAIL)}`
}

function computeNextResetIso(): string {
  return new Date(Date.now() + DAYS_PER_MOCK_LIMIT_WINDOW * MILLISECONDS_PER_DAY).toISOString()
}

/** In-memory `AiCreditsApi` that mints fake keys. Never ship it to production. */
export class MockAiCreditsApi implements AiCreditsApi {
  private readonly accounts = new Map<AiCreditsAccountId, AiCreditsApiAccount>()

  private readonly failingMethods: ReadonlySet<keyof AiCreditsApi>

  private readonly delayMs: number

  constructor(options: MockAiCreditsApiOptions = {}) {
    this.failingMethods = new Set(options.failingMethods ?? [])
    this.delayMs = options.delayMs ?? MOCK_DELAY_MS
    Object.entries(options.seededAccounts ?? {}).forEach(([accountId, seed]) => {
      this.accounts.set(
        accountId.toLowerCase(),
        this.buildAccount(accountId, generateMockFullKey(), seed.limitUsdMicro),
      )
    })
  }

  async getAccount(accountId: AiCreditsAccountId): Promise<AiCreditsApiAccount> {
    await this.simulateRequest('getAccount')
    return this.readAccount(accountId)
  }

  async createOrTopUpKey(purchase: AiCreditsKeyPurchase): Promise<AiCreditsApiKeyIssue> {
    await this.simulateRequest('createOrTopUpKey')
    const existingAccount = this.readAccount(purchase.accountId)

    if (existingAccount.apiKey && existingAccount.spendLimit) {
      const toppedUpLimit = (
        BigInt(existingAccount.spendLimit.limitUsdMicro) + BigInt(purchase.creditUsdMicro)
      ).toString()
      const toppedUpAccount: AiCreditsApiAccount = {
        ...existingAccount,
        spendLimit: { ...existingAccount.spendLimit, limitUsdMicro: toppedUpLimit },
      }
      this.accounts.set(purchase.accountId.toLowerCase(), toppedUpAccount)
      return { account: toppedUpAccount, fullKey: null }
    }

    const fullKey = generateMockFullKey()
    const createdAccount = this.buildAccount(purchase.accountId, fullKey, purchase.creditUsdMicro)
    this.accounts.set(purchase.accountId.toLowerCase(), createdAccount)
    return { account: createdAccount, fullKey }
  }

  async rotateKey(accountId: AiCreditsAccountId): Promise<AiCreditsApiKeyIssue> {
    await this.simulateRequest('rotateKey')
    const existingAccount = this.readAccount(accountId)
    if (!existingAccount.apiKey || !existingAccount.spendLimit) {
      throw new Error('There is no API key to rotate.')
    }
    const fullKey = generateMockFullKey()
    const rotatedAccount = this.buildAccount(
      accountId,
      fullKey,
      existingAccount.spendLimit.limitUsdMicro,
    )
    this.accounts.set(accountId.toLowerCase(), rotatedAccount)
    return { account: rotatedAccount, fullKey }
  }

  async revokeKey(accountId: AiCreditsAccountId): Promise<AiCreditsApiAccount> {
    await this.simulateRequest('revokeKey')
    const revokedAccount: AiCreditsApiAccount = {
      ...this.readAccount(accountId),
      apiKey: null,
      spendLimit: null,
    }
    this.accounts.set(accountId.toLowerCase(), revokedAccount)
    return revokedAccount
  }

  async getHistory(accountId: AiCreditsAccountId): Promise<CreditHistoryResponse> {
    await this.simulateRequest('getHistory')
    return { account: accountId, items: [], total: 0, limit: 0, offset: 0, hasMore: false }
  }

  private async simulateRequest(method: keyof AiCreditsApi): Promise<void> {
    await sleep(this.delayMs)
    if (this.failingMethods.has(method)) {
      throw new Error(`Mock ${method} failed on purpose.`)
    }
  }

  private readAccount(accountId: AiCreditsAccountId): AiCreditsApiAccount {
    return (
      this.accounts.get(accountId.toLowerCase()) ?? {
        accountId,
        baseUrl: MOCK_GATEWAY_BASE_URL,
        apiKey: null,
        spendLimit: null,
        usedThisMonthUsdMicro: '0',
      }
    )
  }

  private buildAccount(
    accountId: AiCreditsAccountId,
    fullKey: string,
    limitUsdMicro: string,
  ): AiCreditsApiAccount {
    return {
      accountId,
      baseUrl: MOCK_GATEWAY_BASE_URL,
      apiKey: { maskedKey: maskKey(fullKey), createdAt: new Date().toISOString() },
      spendLimit: { limitUsdMicro, resetsAt: computeNextResetIso() },
      usedThisMonthUsdMicro: MOCK_USED_THIS_MONTH_USD_MICRO,
    }
  }
}
