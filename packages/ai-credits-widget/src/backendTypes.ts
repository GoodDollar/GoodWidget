import type { SignerOperatorStatus } from './operatorConsent'

export type AccountRef = {
  payer: string
  signer: string
}

export type UserCreditProfile = {
  account: string
  rootAccount: string
  createdAt: string
  updatedAt: string
  totalGdDepositedWei: string
  totalPrincipalUsd: string
  totalBonusUsd: string
  totalGDStreamedWei: string
  totalOutstandingFundingUsd: string
  streamFlowRateWeiPerSecond: string
  lastStreamCreditAt?: string
}

export type GdCreditEntry = {
  id: string
  account: string
  rootAccount: string
  source: 'deposit' | 'streamUpdate' | 'streamRequest' | 'streamCron'
  gdAmountWei: string
  principalUsd: string
  bonusUsd: string
  totalCreditUsd: string
  fundingStatus: 'pending' | 'funded' | 'failed'
  fundingTxHash?: string
  fundingError?: string
  txHash?: string
  logIndex?: number
  createdAt: string
  streamUpdateMonth: string
  buyerAddress?: string
}

export type AccountCreditResponse = {
  account: string
  profile: UserCreditProfile
}

export type CreditHistoryResponse = {
  account: string
  items: GdCreditEntry[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export type CreditHistoryQuery = {
  limit?: number
  offset?: number
  source?: GdCreditEntry['source']
  fundingStatus?: GdCreditEntry['fundingStatus']
  from?: string
  to?: string
}

export type AccountView = {
  account: string
  signer: string | null
  profile: UserCreditProfile
  /**
   * Null when the operator read did not answer. Distinct from a read that came
   * back saying "no operator": callers must not present an unread status as
   * "not authorized", or an already-authorized account looks unconfigured.
   */
  operator: SignerOperatorStatus | null
  /** Null when the withdrawable read did not answer. */
  withdrawableUsd: string | null
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
  totalCreditUsd: string
}

export type DiscountConfig = {
  depositBonusPercent: number
  streamBonusPercent: number
}

export type BackendConfigValuesResponse = {
  ok?: boolean
  config?: {
    REGULAR_BONUS_BPS?: string | number
    STREAMING_BONUS_BPS?: string | number
  }
}
