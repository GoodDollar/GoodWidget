import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeAbiParameters,
  formatUnits,
  http,
  parseAbi,
  type Address,
  type Chain,
  type EIP1193Provider as ViemEip1193Provider,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
} from 'viem'

import type { EIP1193Provider } from '@goodwidget/core'
import type { GovernanceHouse, GovernanceProfileDraft } from '../types'

export const CELO_CHAIN_ID = 42220
export const DEFAULT_CELO_RPC_URL = 'https://forno.celo.org'
export const G_TOKEN_CELO_ADDRESS: Address = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A'
export const CELO_GOODID_ADDRESS: Address = '0xC361A6E67822a0EDc17D899227dd9FC50BD62F42'
export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000'

export const CELO_CHAIN: Chain = {
  id: CELO_CHAIN_ID,
  name: 'Celo',
  nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: [DEFAULT_CELO_RPC_URL] },
    public: { http: [DEFAULT_CELO_RPC_URL] },
  },
}

export const GOODDAO_HOUSES_ABI = parseAbi([
  'function minimumStake(uint8 house) view returns (uint256)',
  'function getMember(address account) view returns ((uint8 house, uint8 status, uint256 stakedAmount, uint64 joinedAt, uint64 updatedAt, uint64 unstakedAt, uint256 memberIndex, string name, string socialLinks, string projectWebpage, string missionStatement, string distributionStrategy))',
  'function getHoaEligibility(address account) view returns ((bool isEligible, uint64 listedAt, uint64 updatedAt, uint64 delistedAt))',
  'function getActiveMembers(uint8 house) view returns (address[])',
  'function getActiveMembers(uint8 house, uint256 startIndex, uint256 endIndex) view returns (address[])',
  'function cycleStartTime() view returns (uint64)',
  'function termDuration() view returns (uint64)',
  'function votingTermLength() view returns (uint64)',
  'function isVotingPeriod() view returns (bool)',
  'function getCurrentVoteId() view returns (uint256)',
  'function getVoteConfig(uint256 voteId) view returns ((uint64 startTime, uint64 endTime, uint64 executedAt, bool executed))',
  'function getVoteRecipients(uint256 voteId) view returns (address[])',
  'function getHasVoted(uint256 voteId, address voter) view returns (bool)',
  'function getFinalizedUnits(uint256 voteId, address recipient) view returns (uint128)',
  'function flowSplitterConfig() view returns (address splitter, uint256 poolId, address poolAddress)',
  'function castVote(address[] recipients, uint256[] allocations)',
])

export const G_TOKEN_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transferAndCall(address to, uint256 value, bytes data) returns (bool)',
])

export const GOODID_ABI = parseAbi([
  'function getWhitelistedRoot(address account) view returns (address)',
])

export type GovernanceMemberStatus = 'none' | 'pending' | 'active' | 'revoked' | 'unstaked'

export interface GovernanceMemberRecord {
  house: GovernanceHouse
  status: GovernanceMemberStatus
  stakedAmount: bigint
  joinedAt: number | null
  updatedAt: number | null
  unstakedAt: number | null
  memberIndex: bigint
  name: string
  socialLinks: string
  projectWebpage: string
  missionStatement: string
  distributionStrategy: string
}

export interface GovernanceVoteConfig {
  startTime: number | null
  endTime: number | null
  executedAt: number | null
  executed: boolean
}

export interface GovernanceFlowSplitterConfig {
  splitter: Address
  poolId: bigint
  poolAddress: Address
}

export interface GovernanceHoaEligibilityRecord {
  isEligible: boolean
  listedAt: number | null
  updatedAt: number | null
  delistedAt: number | null
}

export interface GovernanceContractAddresses {
  houses?: Address
  gToken: Address
  goodId: Address
}

export interface GovernanceClientOptions {
  provider?: EIP1193Provider | null
  account?: Address | null
  rpcUrl?: string
}

export interface GovernanceEnvironmentConfig {
  housesAddress?: Address
  gTokenAddress?: Address
  goodIdAddress?: Address
}

const HOUSE_TO_CONTRACT: Record<GovernanceHouse, 0 | 1> = {
  citizenship: 0,
  alignment: 1,
}

const CONTRACT_TO_HOUSE: Record<number, GovernanceHouse> = {
  0: 'citizenship',
  1: 'alignment',
}

const CONTRACT_TO_STATUS: Record<number, GovernanceMemberStatus> = {
  0: 'none',
  1: 'pending',
  2: 'active',
  3: 'revoked',
  4: 'unstaked',
}

type PublicRuntimeEnv = Record<string, string | undefined>

type RuntimeGlobal = typeof globalThis & {
  process?: { env?: PublicRuntimeEnv }
  __GOODWIDGET_GOVERNANCE__?: GovernanceEnvironmentConfig
}

function readConfiguredAddress(key: keyof GovernanceEnvironmentConfig, envNames: string[]): Address | undefined {
  const runtimeGlobal = globalThis as RuntimeGlobal
  const explicitAddress = runtimeGlobal.__GOODWIDGET_GOVERNANCE__?.[key]
  if (explicitAddress) return explicitAddress

  const publicEnv = runtimeGlobal.process?.env
  const configuredValue = envNames.map((envName) => publicEnv?.[envName]).find(Boolean)
  return configuredValue as Address | undefined
}

export function resolveGovernanceAddresses(
  overrides: GovernanceEnvironmentConfig = {},
): GovernanceContractAddresses {
  return {
    houses:
      overrides.housesAddress ??
      readConfiguredAddress('housesAddress', [
        'GOODWIDGET_GOVERNANCE_HOUSES_ADDRESS',
        'VITE_GOODWIDGET_GOVERNANCE_HOUSES_ADDRESS',
        'NEXT_PUBLIC_GOODWIDGET_GOVERNANCE_HOUSES_ADDRESS',
      ]),
    gToken: overrides.gTokenAddress ?? G_TOKEN_CELO_ADDRESS,
    goodId: overrides.goodIdAddress ?? CELO_GOODID_ADDRESS,
  }
}

export function createGovernancePublicClient(rpcUrl = DEFAULT_CELO_RPC_URL): PublicClient {
  return createPublicClient({ chain: CELO_CHAIN, transport: http(rpcUrl) })
}

export function createGovernanceWalletClient({
  provider,
  account,
}: GovernanceClientOptions): WalletClient | null {
  if (!provider || !account) return null

  return createWalletClient({
    account,
    chain: CELO_CHAIN,
    transport: custom(provider as ViemEip1193Provider),
  })
}

export function houseToContractValue(house: GovernanceHouse): 0 | 1 {
  return HOUSE_TO_CONTRACT[house]
}

export function encodeGovernanceRegistrationData(
  house: GovernanceHouse,
  profileDraft: GovernanceProfileDraft,
): Hex {
  return encodeAbiParameters(
    [
      { type: 'uint8' },
      { type: 'string' },
      { type: 'string' },
      { type: 'string' },
      { type: 'string' },
      { type: 'string' },
    ],
    [
      houseToContractValue(house),
      profileDraft.name ?? '',
      profileDraft.socialLinks ?? '',
      profileDraft.projectWebpage ?? '',
      profileDraft.missionStatement ?? '',
      profileDraft.distributionStrategy ?? '',
    ],
  )
}

function timestampFromSeconds(value: bigint): number | null {
  return value > 0n ? Number(value) * 1000 : null
}

function tupleValue(rawValue: unknown, index: number, key: string): unknown {
  if (Array.isArray(rawValue)) return rawValue[index]
  return (rawValue as Record<string, unknown> | undefined)?.[key]
}

export function mapMemberRecord(rawMember: readonly unknown[] | Record<string, unknown>): GovernanceMemberRecord {
  const houseValue = Number(tupleValue(rawMember, 0, 'house') ?? 0)
  const statusValue = Number(tupleValue(rawMember, 1, 'status') ?? 0)

  return {
    house: CONTRACT_TO_HOUSE[houseValue] ?? 'citizenship',
    status: CONTRACT_TO_STATUS[statusValue] ?? 'none',
    stakedAmount: BigInt(String(tupleValue(rawMember, 2, 'stakedAmount') ?? 0)),
    joinedAt: timestampFromSeconds(BigInt(String(tupleValue(rawMember, 3, 'joinedAt') ?? 0))),
    updatedAt: timestampFromSeconds(BigInt(String(tupleValue(rawMember, 4, 'updatedAt') ?? 0))),
    unstakedAt: timestampFromSeconds(BigInt(String(tupleValue(rawMember, 5, 'unstakedAt') ?? 0))),
    memberIndex: BigInt(String(tupleValue(rawMember, 6, 'memberIndex') ?? 0)),
    name: String(tupleValue(rawMember, 7, 'name') ?? ''),
    socialLinks: String(tupleValue(rawMember, 8, 'socialLinks') ?? ''),
    projectWebpage: String(tupleValue(rawMember, 9, 'projectWebpage') ?? ''),
    missionStatement: String(tupleValue(rawMember, 10, 'missionStatement') ?? ''),
    distributionStrategy: String(tupleValue(rawMember, 11, 'distributionStrategy') ?? ''),
  }
}

export function mapVoteConfig(rawConfig: readonly unknown[] | Record<string, unknown>): GovernanceVoteConfig {
  return {
    startTime: timestampFromSeconds(BigInt(String(tupleValue(rawConfig, 0, 'startTime') ?? 0))),
    endTime: timestampFromSeconds(BigInt(String(tupleValue(rawConfig, 1, 'endTime') ?? 0))),
    executedAt: timestampFromSeconds(BigInt(String(tupleValue(rawConfig, 2, 'executedAt') ?? 0))),
    executed: Boolean(tupleValue(rawConfig, 3, 'executed')),
  }
}

export function mapFlowSplitterConfig(rawConfig: readonly unknown[] | Record<string, unknown>): GovernanceFlowSplitterConfig {
  return {
    splitter: (tupleValue(rawConfig, 0, 'splitter') ?? ZERO_ADDRESS) as Address,
    poolId: BigInt(String(tupleValue(rawConfig, 1, 'poolId') ?? 0)),
    poolAddress: (tupleValue(rawConfig, 2, 'poolAddress') ?? ZERO_ADDRESS) as Address,
  }
}

export function mapHoaEligibilityRecord(rawRecord: readonly unknown[] | Record<string, unknown>): GovernanceHoaEligibilityRecord {
  return {
    isEligible: Boolean(tupleValue(rawRecord, 0, 'isEligible')),
    listedAt: timestampFromSeconds(BigInt(String(tupleValue(rawRecord, 1, 'listedAt') ?? 0))),
    updatedAt: timestampFromSeconds(BigInt(String(tupleValue(rawRecord, 2, 'updatedAt') ?? 0))),
    delistedAt: timestampFromSeconds(BigInt(String(tupleValue(rawRecord, 3, 'delistedAt') ?? 0))),
  }
}

export function formatStakeAmount(amountWei: bigint): string {
  return `${formatUnits(amountWei, 18)} G$`
}

export async function readGoodIdRoot(
  publicClient: PublicClient,
  goodIdAddress: Address,
  account: Address,
): Promise<Address> {
  return publicClient.readContract({
    address: goodIdAddress,
    abi: GOODID_ABI,
    functionName: 'getWhitelistedRoot',
    args: [account],
  })
}

export async function readGoodIdVerification(
  publicClient: PublicClient,
  goodIdAddress: Address,
  account: Address,
): Promise<boolean> {
  const root = await readGoodIdRoot(publicClient, goodIdAddress, account)
  return root.toLowerCase() !== ZERO_ADDRESS
}

export async function waitForSuccessfulReceipt(
  publicClient: PublicClient,
  hash: Hex,
): Promise<TransactionReceipt> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') {
    throw new Error('Transaction reverted')
  }
  return receipt
}

export async function requestCeloMainnetSwitch(provider: EIP1193Provider | null): Promise<void> {
  if (!provider) return

  await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: `0x${CELO_CHAIN_ID.toString(16)}` }],
  })
}
