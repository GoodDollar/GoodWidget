import {
  createPublicClient,
  http,
  parseAbi,
  type Address,
  type Chain,
  type PublicClient,
} from 'viem'
import type { AiCreditsQuote } from './widgetRuntimeContract'
import type { SignerOperatorStatus, OperatorConsentPayloadResponse } from './operatorConsent'
import { ANTSEED_DEPOSITS_BASE_ADDRESS, buildSetOperatorPayload } from './operatorConsent'
import type { AccountRef } from './backendTypes'
import { buildQuoteAmounts } from './quoteMath'

export const BASE_CHAIN_ID = 8453
export const DEFAULT_BASE_RPC_URL = 'https://base.drpc.org'
export const CELO_GD_ANTSEED_VAULT_ADDRESS =
  '0x4Dd0136b9aabD5823cf0F65d89e8fB882C660885' as const
export const CELO_GOODID_ADDRESS = '0xC361A6E67822a0EDc17D899227dd9FC50BD62F42' as const
export const DEFAULT_CELO_RPC_URL = 'https://forno.celo.org'

const CELO_CHAIN: Chain = {
  id: 42220,
  name: 'Celo',
  nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: [DEFAULT_CELO_RPC_URL] },
    public: { http: [DEFAULT_CELO_RPC_URL] },
  },
}

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
  'function getOperator(address signer) view returns (address)',
  'function getOperatorNonce(address signer) view returns (uint256)',
  'function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)',
])

const FUNDING_VAULT_ABI = parseAbi([
  'function withdrawablePrincipal(address signer) view returns (uint256)',
  'function usedNonces(address signer) view returns (uint256)',
])

const GOODID_ABI = parseAbi([
  'function getWhitelistedRoot(address account) view returns (address)',
])

function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

export type AiCreditsChainClientOptions = {
  baseRpcUrl?: string
  fundingVaultAddress?: Address
  celoRpcUrl?: string
  celoVaultAddress?: Address
  celoGoodIdAddress?: Address
  depositsAddress?: Address
}

export interface AiCreditsChainClient {
  fetchGdUsdPerToken(): Promise<number>
  /** Resolves the GoodID whitelist state, or rejects when the read fails. */
  isGoodIdVerified(account: string): Promise<boolean>
  buildQuote(depositG: string, streamG: string): Promise<AiCreditsQuote>
  getSignerOperatorStatus(ref: AccountRef): Promise<SignerOperatorStatus>
  buildOperatorConsentPayload(
    ref: AccountRef,
    operatorStatus?: SignerOperatorStatus,
  ): Promise<OperatorConsentPayloadResponse>
  getWithdrawableUsd(signer: string): Promise<string>
  getSignerAuthNonce(signer: string): Promise<bigint>
}

export class ProductionAiCreditsChainClient implements AiCreditsChainClient {
  private readonly baseClient: PublicClient
  private readonly celoClient: PublicClient | null
  private readonly fundingVaultAddress?: Address
  private readonly celoVaultAddress?: Address
  private readonly celoGoodIdAddress?: Address
  private readonly depositsAddress: Address

  constructor(options: AiCreditsChainClientOptions = {}) {
    const baseRpcUrl = options.baseRpcUrl ?? DEFAULT_BASE_RPC_URL
    const celoRpcUrl = options.celoRpcUrl ?? DEFAULT_CELO_RPC_URL
    this.baseClient = createPublicClient({ chain: BASE_CHAIN, transport: http(baseRpcUrl) })
    this.fundingVaultAddress = options.fundingVaultAddress
    this.celoVaultAddress = options.celoVaultAddress
    this.celoGoodIdAddress = options.celoGoodIdAddress ?? CELO_GOODID_ADDRESS
    this.depositsAddress = options.depositsAddress ?? ANTSEED_DEPOSITS_BASE_ADDRESS
    this.celoClient =
      this.celoVaultAddress || this.celoGoodIdAddress
        ? createPublicClient({ chain: CELO_CHAIN, transport: http(celoRpcUrl) })
        : null
  }

  /**
   * Reads the GoodID whitelist root for `account`.
   *
   * Rejects when the read fails. A transport error must never surface as
   * "not verified": the public Celo RPC rate-limits the burst of reads the
   * widget issues on load, and swallowing that here is what made a verified
   * wallet show up as unverified on some loads and not others.
   */
  async isGoodIdVerified(account: string): Promise<boolean> {
    if (!this.celoClient || !this.celoGoodIdAddress) {
      throw new Error('GoodID contract is not configured')
    }
    const root = await this.celoClient.readContract({
      address: this.celoGoodIdAddress,
      abi: GOODID_ABI,
      functionName: 'getWhitelistedRoot',
      args: [normalizeAddress(account) as Address],
    })
    const rootAddress = String(root).toLowerCase()
    return rootAddress !== '0x0000000000000000000000000000000000000000'
  }

  async fetchGdUsdPerToken(): Promise<number> {
    if (!this.celoClient || !this.celoVaultAddress) return 0.0015
    const usd18 = await this.celoClient.readContract({
      address: this.celoVaultAddress,
      abi: CELO_VAULT_ABI,
      functionName: 'gdUsdPerToken',
      args: [10n ** 18n],
    })
    return Number(usd18) / 1e18
  }

  async buildQuote(depositG: string, streamG: string): Promise<AiCreditsQuote> {
    return buildQuoteAmounts(depositG, streamG)
  }

  async getSignerOperatorStatus(ref: AccountRef): Promise<SignerOperatorStatus> {
    const payer = normalizeAddress(ref.payer)
    const signer = normalizeAddress(ref.signer)
    const operatorAddress = this.fundingVaultAddress?.toLowerCase()

    if (!operatorAddress) {
      return {
        enabled: false,
        account: payer,
        signerAddress: signer,
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
        args: [signer as Address],
      }),
      this.readOperatorNonce(signer as Address),
    ])

    const current = String(currentOperator).toLowerCase()
    return {
      enabled: true,
      account: payer,
      signerAddress: signer,
      operatorAddress,
      currentOperator: current,
      operatorAccepted: current === operatorAddress,
      consentNonce: consentNonce.toString(),
    }
  }

  async buildOperatorConsentPayload(
    ref: AccountRef,
    operatorStatus?: SignerOperatorStatus,
  ): Promise<OperatorConsentPayloadResponse> {
    const payer = normalizeAddress(ref.payer)
    const signer = normalizeAddress(ref.signer)
    const status = operatorStatus ?? (await this.getSignerOperatorStatus(ref))

    if (!status.enabled || !status.operatorAddress) {
      return { enabled: false, account: payer, signerAddress: signer }
    }

    const domain = await this.readDepositsDomain()

    return {
      enabled: true,
      account: payer,
      signerAddress: signer,
      typedData: buildSetOperatorPayload(
        BASE_CHAIN_ID,
        this.depositsAddress,
        status.operatorAddress,
        BigInt(status.consentNonce),
        domain,
      ),
    }
  }

  async getWithdrawableUsd(signer: string): Promise<string> {
    if (!this.fundingVaultAddress) return '0'
    const amount = await this.baseClient.readContract({
      address: this.fundingVaultAddress,
      abi: FUNDING_VAULT_ABI,
      functionName: 'withdrawablePrincipal',
      args: [normalizeAddress(signer) as Address],
    })
    return amount.toString()
  }

  async getSignerAuthNonce(signer: string): Promise<bigint> {
    // Never fall back to a default: the nonce is signed over, so a wrong one produces a
    // valid signature the vault will reject — or worse, replay-protect the wrong slot.
    if (!this.fundingVaultAddress) {
      throw new Error('Funding vault address is not configured')
    }
    return this.baseClient.readContract({
      address: this.fundingVaultAddress,
      abi: FUNDING_VAULT_ABI,
      functionName: 'usedNonces',
      args: [normalizeAddress(signer) as Address],
    })
  }

  private async readOperatorNonce(signer: Address): Promise<bigint> {
    return this.baseClient.readContract({
      address: this.depositsAddress,
      abi: DEPOSITS_ABI,
      functionName: 'getOperatorNonce',
      args: [signer],
    })
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

export function createChainClient(
  options: AiCreditsChainClientOptions = {},
): AiCreditsChainClient {
  return new ProductionAiCreditsChainClient({
    ...options,
    celoGoodIdAddress: options.celoGoodIdAddress ?? CELO_GOODID_ADDRESS,
  })
}
