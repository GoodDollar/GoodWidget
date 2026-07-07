import type { BuyerOperatorStatus } from './operatorConsent'

export type AccountRef = {
  payer: string
  buyer: string
}

export type UserCreditProfile = {
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

export type AccountCreditResponse = {
  account: string
  profile: UserCreditProfile
  gdCredits: GdCreditEntry[]
}

export type AccountView = {
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
