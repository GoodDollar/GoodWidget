import {
  createPublicClient,
  http,
  parseAbi,
  type Address,
  type Chain,
  type PublicClient,
} from 'viem'
import type { AiCreditsQuote } from './widgetRuntimeContract'
import type { BuyerOperatorStatus, OperatorConsentPayloadResponse } from './operatorConsent'
import { ANTSEED_DEPOSITS_BASE_ADDRESS, buildSetOperatorPayload } from './operatorConsent'
import type { AccountRef } from './backendTypes'
import { buildQuoteFromGdAmounts } from './quoteMath'

export const BASE_CHAIN_ID = 8453
export const DEFAULT_BASE_RPC_URL = 'https://mainnet.base.org'

const BASE_CHAIN: Chain = {
  id: BASE_CHAIN_ID,
  name: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [DEFAULT_BASE_RPC_URL] },
    public: { http: [DEFAULT_BASE_RPC_URL] },
  },
}

const CELO_VAULT_ABI = parseAbi([
  'function gdUsdPerToken(uint128 amount) view returns (uint256)',
])

const DEPOSITS_ABI = parseAbi([
  'function getOperator(address buyer) view returns (address)',
  'function operatorNonces(address buyer) view returns (uint256)',
  'function nonces(address buyer) view returns (uint256)',
  'function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)',
])

const FUNDING_VAULT_ABI = parseAbi([
  'function withdrawablePrincipal(address buyer) view returns (uint256)',
])

function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

export type AiCreditsChainClientOptions = {
  baseRpcUrl?: string
  fundingVaultAddress?: Address
  celoRpcUrl?: string
  celoVaultAddress?: Address
  depositsAddress?: Address
}

export interface AiCreditsChainClient {
  fetchGdUsdPerToken(): Promise<number>
  buildQuote(
    depositG: string,
    streamG: string,
    isGoodIdVerified: boolean,
  ): Promise<AiCreditsQuote>
  getBuyerOperatorStatus(ref: AccountRef): Promise<BuyerOperatorStatus>
  buildOperatorConsentPayload(
    ref: AccountRef,
    operatorStatus?: BuyerOperatorStatus,
  ): Promise<OperatorConsentPayloadResponse>
  getWithdrawableUsd(buyer: string): Promise<string>
}

export class ProductionAiCreditsChainClient implements AiCreditsChainClient {
  private readonly baseClient: PublicClient
  private readonly celoClient: PublicClient | null
  private readonly fundingVaultAddress?: Address
  private readonly celoVaultAddress?: Address
  private readonly depositsAddress: Address

  constructor(options: AiCreditsChainClientOptions = {}) {
    const baseRpcUrl = options.baseRpcUrl ?? DEFAULT_BASE_RPC_URL
    this.baseClient = createPublicClient({ chain: BASE_CHAIN, transport: http(baseRpcUrl) })
    this.fundingVaultAddress = options.fundingVaultAddress
    this.celoVaultAddress = options.celoVaultAddress
    this.depositsAddress = options.depositsAddress ?? ANTSEED_DEPOSITS_BASE_ADDRESS
    this.celoClient = options.celoVaultAddress
      ? createPublicClient({
          chain: {
            id: 42220,
            name: 'Celo',
            nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
            rpcUrls: {
              default: { http: [options.celoRpcUrl ?? 'https://forno.celo.org'] },
            },
          },
          transport: http(options.celoRpcUrl ?? 'https://forno.celo.org'),
        })
      : null
  }

  async fetchGdUsdPerToken(): Promise<number> {
    if (!this.celoClient || !this.celoVaultAddress) return 0.0015
    const quoteWei = await this.celoClient.readContract({
      address: this.celoVaultAddress,
      abi: CELO_VAULT_ABI,
      functionName: 'gdUsdPerToken',
      args: [10n ** 18n],
    })
    return Number(quoteWei) / 1e18
  }

  async buildQuote(
    depositG: string,
    streamG: string,
    isGoodIdVerified: boolean,
  ): Promise<AiCreditsQuote> {
    const gdUsdPerToken = await this.fetchGdUsdPerToken()
    return buildQuoteFromGdAmounts(depositG, streamG, gdUsdPerToken, isGoodIdVerified)
  }

  async getBuyerOperatorStatus(ref: AccountRef): Promise<BuyerOperatorStatus> {
    const payer = normalizeAddress(ref.payer)
    const buyer = normalizeAddress(ref.buyer)
    const operatorAddress = this.fundingVaultAddress?.toLowerCase()

    if (!operatorAddress) {
      return {
        enabled: false,
        account: payer,
        buyerAddress: buyer,
        currentOperator: '0x0000000000000000000000000000000000000000',
        operatorAccepted: false,
        consentNonce: '0',
      }
    }

    const [currentOperator, consentNonce] = await Promise.all([
      this.baseClient.readContract({
        address: this.depositsAddress,
        abi: DEPOSITS_ABI,
        functionName: 'getOperator',
        args: [buyer as Address],
      }),
      this.readOperatorNonce(buyer as Address),
    ])

    const current = String(currentOperator).toLowerCase()
    return {
      enabled: true,
      account: payer,
      buyerAddress: buyer,
      operatorAddress,
      currentOperator: current,
      operatorAccepted: current === operatorAddress,
      consentNonce: consentNonce.toString(),
    }
  }

  async buildOperatorConsentPayload(
    ref: AccountRef,
    operatorStatus?: BuyerOperatorStatus,
  ): Promise<OperatorConsentPayloadResponse> {
    const payer = normalizeAddress(ref.payer)
    const buyer = normalizeAddress(ref.buyer)
    const status = operatorStatus ?? (await this.getBuyerOperatorStatus(ref))

    if (!status.enabled || !status.operatorAddress) {
      return { enabled: false, account: payer, buyerAddress: buyer }
    }

    const domain = await this.readDepositsDomain()

    return {
      enabled: true,
      account: payer,
      buyerAddress: buyer,
      typedData: buildSetOperatorPayload(
        BASE_CHAIN_ID,
        this.depositsAddress,
        status.operatorAddress,
        BigInt(status.consentNonce),
        domain,
      ),
    }
  }

  async getWithdrawableUsd(buyer: string): Promise<string> {
    if (!this.fundingVaultAddress) return '0'
    const amount = await this.baseClient.readContract({
      address: this.fundingVaultAddress,
      abi: FUNDING_VAULT_ABI,
      functionName: 'withdrawablePrincipal',
      args: [normalizeAddress(buyer) as Address],
    })
    return amount.toString()
  }

  private async readOperatorNonce(buyer: Address): Promise<bigint> {
    try {
      return await this.baseClient.readContract({
        address: this.depositsAddress,
        abi: DEPOSITS_ABI,
        functionName: 'operatorNonces',
        args: [buyer],
      })
    } catch {
      return this.baseClient.readContract({
        address: this.depositsAddress,
        abi: DEPOSITS_ABI,
        functionName: 'nonces',
        args: [buyer],
      })
    }
  }

  private async readDepositsDomain(): Promise<{ name: string; version: string }> {
    try {
      const domain = await this.baseClient.readContract({
        address: this.depositsAddress,
        abi: DEPOSITS_ABI,
        functionName: 'eip712Domain',
      })
      return { name: String(domain[1]), version: String(domain[2]) }
    } catch {
      return { name: 'AntseedDeposits', version: '1' }
    }
  }
}

export class MockAiCreditsChainClient implements AiCreditsChainClient {
  private readonly operatorAccepted: boolean
  private readonly gdUsdPerToken: number

  constructor(options: { operatorAccepted?: boolean; gdUsdPerToken?: number } = {}) {
    this.operatorAccepted = options.operatorAccepted ?? false
    this.gdUsdPerToken = options.gdUsdPerToken ?? 0.0015
  }

  async fetchGdUsdPerToken(): Promise<number> {
    return this.gdUsdPerToken
  }

  async buildQuote(
    depositG: string,
    streamG: string,
    isGoodIdVerified: boolean,
  ): Promise<AiCreditsQuote> {
    return buildQuoteFromGdAmounts(depositG, streamG, this.gdUsdPerToken, isGoodIdVerified)
  }

  async getBuyerOperatorStatus(ref: AccountRef): Promise<BuyerOperatorStatus> {
    const payer = normalizeAddress(ref.payer)
    const buyer = normalizeAddress(ref.buyer)
    const operatorAddress = '0x0000000000000000000000000000000000000004'
    return {
      enabled: true,
      account: payer,
      buyerAddress: buyer,
      operatorAddress,
      currentOperator: this.operatorAccepted ? operatorAddress : '0x0000000000000000000000000000000000000000',
      operatorAccepted: this.operatorAccepted,
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

  async getWithdrawableUsd(_buyer: string): Promise<string> {
    return '0'
  }
}

export function createChainClient(
  backendUrl: string | undefined,
  options: AiCreditsChainClientOptions = {},
): AiCreditsChainClient {
  if (!backendUrl) {
    return new MockAiCreditsChainClient()
  }
  return new ProductionAiCreditsChainClient(options)
}
