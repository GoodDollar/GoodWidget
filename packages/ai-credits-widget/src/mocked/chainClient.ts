import type { AccountRef } from '../backendTypes'
import { BASE_CHAIN_ID, type AiCreditsChainClient } from '../chainClient'
import { ANTSEED_DEPOSITS_BASE_ADDRESS, buildSetOperatorPayload } from '../operatorConsent'
import { buildQuoteAmounts } from '../quoteMath'
import type { SignerOperatorStatus, OperatorConsentPayloadResponse } from '../operatorConsent'
import type { AiCreditsQuote } from '../widgetRuntimeContract'

const mockOperatorAcceptedSigners = new Set<string>()
// Revocation has to outrank the constructor's `operatorAccepted`, otherwise a mock seeded
// as consented could never report the withdrawal and waitForOperatorRevoke would spin.
const mockOperatorRevokedSigners = new Set<string>()

function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

export function markMockOperatorConsent(signer: string): void {
  const normalized = normalizeAddress(signer)
  mockOperatorRevokedSigners.delete(normalized)
  mockOperatorAcceptedSigners.add(normalized)
}

export function clearMockOperatorConsent(signer: string): void {
  const normalized = normalizeAddress(signer)
  mockOperatorAcceptedSigners.delete(normalized)
  mockOperatorRevokedSigners.add(normalized)
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

  async getSignerOperatorStatus(ref: AccountRef): Promise<SignerOperatorStatus> {
    const payer = normalizeAddress(ref.payer)
    const signer = normalizeAddress(ref.signer)
    const operatorAddress = '0x0000000000000000000000000000000000000004'
    const operatorAccepted =
      !mockOperatorRevokedSigners.has(signer) &&
      (this.operatorAccepted || mockOperatorAcceptedSigners.has(signer))
    return {
      enabled: true,
      account: payer,
      signerAddress: signer,
      operatorAddress,
      currentOperator: operatorAccepted ? operatorAddress : '0x0000000000000000000000000000000000000000',
      operatorAccepted,
      consentNonce: '0',
    }
  }

  async buildOperatorConsentPayload(
    ref: AccountRef,
    operatorStatus?: SignerOperatorStatus,
  ): Promise<OperatorConsentPayloadResponse> {
    const status = operatorStatus ?? (await this.getSignerOperatorStatus(ref))
    if (!status.enabled || !status.operatorAddress) {
      return {
        enabled: false,
        account: normalizeAddress(ref.payer),
        signerAddress: normalizeAddress(ref.signer),
      }
    }
    return {
      enabled: true,
      account: normalizeAddress(ref.payer),
      signerAddress: normalizeAddress(ref.signer),
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

  async getSignerAuthNonce(): Promise<bigint> {
    return 0n
  }
}
