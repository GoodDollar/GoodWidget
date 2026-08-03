import type { AccountRef } from '../backendTypes'
import { BASE_CHAIN_ID, type AiCreditsChainClient } from '../chainClient'
import { ANTSEED_DEPOSITS_BASE_ADDRESS, buildSetOperatorPayload } from '../operatorConsent'
import { buildQuoteAmounts } from '../quoteMath'
import type { BuyerOperatorStatus, OperatorConsentPayloadResponse } from '../operatorConsent'
import type { AiCreditsQuote } from '../widgetRuntimeContract'

const mockOperatorAcceptedBuyers = new Set<string>()

function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

export function markMockOperatorConsent(buyer: string): void {
  mockOperatorAcceptedBuyers.add(normalizeAddress(buyer))
}

export class MockAiCreditsChainClient implements AiCreditsChainClient {
  private operatorAccepted: boolean
  private readonly gdUsdPerToken: number
  private readonly goodIdVerified: boolean

  constructor(
    options: { operatorAccepted?: boolean; gdUsdPerToken?: number; goodIdVerified?: boolean } = {},
  ) {
    this.operatorAccepted = options.operatorAccepted ?? false
    this.gdUsdPerToken = options.gdUsdPerToken ?? 0.0015
    this.goodIdVerified = options.goodIdVerified ?? false
  }

  async isGoodIdVerified(): Promise<boolean> {
    return this.goodIdVerified
  }

  async fetchGdUsdPerToken(): Promise<number> {
    return this.gdUsdPerToken
  }

  async buildQuote(depositG: string, streamG: string): Promise<AiCreditsQuote> {
    return buildQuoteAmounts(depositG, streamG)
  }

  async getBuyerOperatorStatus(ref: AccountRef): Promise<BuyerOperatorStatus> {
    const payer = normalizeAddress(ref.payer)
    const buyer = normalizeAddress(ref.buyer)
    const operatorAddress = '0x0000000000000000000000000000000000000004'
    const operatorAccepted = this.operatorAccepted || mockOperatorAcceptedBuyers.has(buyer)
    return {
      enabled: true,
      account: payer,
      buyerAddress: buyer,
      operatorAddress,
      currentOperator: operatorAccepted ? operatorAddress : '0x0000000000000000000000000000000000000000',
      operatorAccepted,
      consentNonce: '0',
    }
  }

  async buildOperatorConsentPayload(
    ref: AccountRef,
    operatorStatus?: BuyerOperatorStatus,
  ): Promise<OperatorConsentPayloadResponse> {
    const status = operatorStatus ?? (await this.getBuyerOperatorStatus(ref))
    if (!status.enabled || !status.operatorAddress) {
      return {
        enabled: false,
        account: normalizeAddress(ref.payer),
        buyerAddress: normalizeAddress(ref.buyer),
      }
    }
    return {
      enabled: true,
      account: normalizeAddress(ref.payer),
      buyerAddress: normalizeAddress(ref.buyer),
      typedData: buildSetOperatorPayload(
        BASE_CHAIN_ID,
        ANTSEED_DEPOSITS_BASE_ADDRESS,
        status.operatorAddress,
        BigInt(status.consentNonce),
        { name: 'AntseedDeposits', version: '1' },
      ),
    }
  }

  async getWithdrawableUsd(): Promise<string> {
    return '0'
  }
}
