import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeAbiParameters,
  formatUnits,
  http,
  parseAbi,
  parseUnits,
  type Address,
  type Chain,
  type EIP1193Provider as ViemEip1193Provider,
  type Hex,
  type PublicClient,
  type WalletClient,
} from 'viem'

import type { EIP1193Provider } from '@goodwidget/core'
import type { GovernanceHouse, GovernanceProfileDraft } from '../types'

export const CELO_CHAIN_ID = 42220
export const DEFAULT_CELO_RPC_URL = 'https://forno.celo.org'
export const G_TOKEN_CELO_ADDRESS: Address = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A'
export const CELO_GOODID_ADDRESS: Address = '0xC361A6E67822a0EDc17D899227dd9FC50BD62F42'
export const MOCK_FLOW_SPLITTER_POOL_ADDRESS: Address = '0x0000000000000000000000000000000000000001'

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
  'function getMember(address account) view returns (uint8 house, uint8 status, uint256 stakedAmount, uint256 joinedAt, uint256 updatedAt, uint256 unstakedAt, string name, string socialLinks, string projectWebpage, string missionStatement, string distributionStrategy)',
  'function getActiveMembers(uint8 house) view returns (address[])',
  'function cycleStartTime() view returns (uint256)',
  'function termDuration() view returns (uint256)',
  'function votingTermLength() view returns (uint256)',
  'function isVotingPeriod() view returns (bool)',
  'function getCurrentVoteId() view returns (uint256)',
  'function getVoteConfig(uint256 voteId) view returns (uint256 startTime, uint256 endTime, bool executed)',
  'function getVoteRecipients(uint256 voteId) view returns (address[])',
  'function getHasVoted(uint256 voteId, address voter) view returns (bool)',
  'function getFinalizedUnits(uint256 voteId, address recipient) view returns (uint128)',
  'function flowSplitterConfig() view returns (address pool, uint256 poolId)',
  'function registerAndStake(uint8 house, string name, string socialLinks, string projectWebpage, string missionStatement, string distributionStrategy)',
  'function stake(uint256 amount)',
  'function castVote(address[] recipients, uint256[] allocations)',
  'function unstake()',
])

export const FLOW_SPLITTER_ABI = parseAbi([
  'function getPoolById(uint256 poolId) view returns ((uint256 id, address poolAddress, address token, string metadata, bytes32 adminRole))',
  'function getPoolByAdminRole(bytes32 adminRole) view returns ((uint256 id, address poolAddress, address token, string metadata, bytes32 adminRole))',
  'function getPoolNameById(uint256 poolId) view returns (string)',
  'function getPoolSymbolById(uint256 poolId) view returns (string)',
  'function isPoolAdmin(uint256 poolId, address account) view returns (bool)',
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
  name: string
  socialLinks: string
  projectWebpage: string
  missionStatement: string
  distributionStrategy: string
}

export interface GovernanceContractAddresses {
  houses?: Address
  gToken: Address
  goodId: Address
  flowSplitterPool: Address
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
  flowSplitterPoolAddress?: Address
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
    flowSplitterPool:
      overrides.flowSplitterPoolAddress ??
      readConfiguredAddress('flowSplitterPoolAddress', [
        'GOODWIDGET_GOVERNANCE_FLOW_SPLITTER_POOL_ADDRESS',
        'VITE_GOODWIDGET_GOVERNANCE_FLOW_SPLITTER_POOL_ADDRESS',
        'NEXT_PUBLIC_GOODWIDGET_GOVERNANCE_FLOW_SPLITTER_POOL_ADDRESS',
      ]) ??
      MOCK_FLOW_SPLITTER_POOL_ADDRESS,
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

export function mapMemberRecord(rawMember: readonly unknown[]): GovernanceMemberRecord {
  const houseValue = Number(rawMember[0] ?? 0)
  const statusValue = Number(rawMember[1] ?? 0)

  return {
    house: CONTRACT_TO_HOUSE[houseValue] ?? 'citizenship',
    status: CONTRACT_TO_STATUS[statusValue] ?? 'none',
    stakedAmount: BigInt(String(rawMember[2] ?? 0)),
    joinedAt: timestampFromSeconds(BigInt(String(rawMember[3] ?? 0))),
    updatedAt: timestampFromSeconds(BigInt(String(rawMember[4] ?? 0))),
    unstakedAt: timestampFromSeconds(BigInt(String(rawMember[5] ?? 0))),
    name: String(rawMember[6] ?? ''),
    socialLinks: String(rawMember[7] ?? ''),
    projectWebpage: String(rawMember[8] ?? ''),
    missionStatement: String(rawMember[9] ?? ''),
    distributionStrategy: String(rawMember[10] ?? ''),
  }
}

export async function readMinimumStakeLabel(
  publicClient: PublicClient,
  housesAddress: Address,
  house: GovernanceHouse,
): Promise<{ amountWei: bigint; label: string }> {
  const amountWei = await publicClient.readContract({
    address: housesAddress,
    abi: GOODDAO_HOUSES_ABI,
    functionName: 'minimumStake',
    args: [houseToContractValue(house)],
  })

  return { amountWei, label: `${formatUnits(amountWei, 18)} G$` }
}

export async function readGoodIdVerification(
  publicClient: PublicClient,
  goodIdAddress: Address,
  account: Address,
): Promise<boolean> {
  const root = await publicClient.readContract({
    address: goodIdAddress,
    abi: GOODID_ABI,
    functionName: 'getWhitelistedRoot',
    args: [account],
  })
  return root.toLowerCase() !== '0x0000000000000000000000000000000000000000'
}

export async function registerWithTransferAndCall(params: {
  walletClient: WalletClient
  account: Address
  addresses: GovernanceContractAddresses & { houses: Address }
  selectedHouse: GovernanceHouse
  profileDraft: GovernanceProfileDraft
  stakeAmountWei: bigint
}): Promise<Hex> {
  const registrationData = encodeGovernanceRegistrationData(params.selectedHouse, params.profileDraft)

  return params.walletClient.writeContract({
    account: params.account,
    chain: CELO_CHAIN,
    address: params.addresses.gToken,
    abi: G_TOKEN_ABI,
    functionName: 'transferAndCall',
    args: [params.addresses.houses, params.stakeAmountWei, registrationData],
  })
}

export async function registerAndStakeFallback(params: {
  walletClient: WalletClient
  account: Address
  housesAddress: Address
  selectedHouse: GovernanceHouse
  profileDraft: GovernanceProfileDraft
}): Promise<Hex> {
  return params.walletClient.writeContract({
    account: params.account,
    chain: CELO_CHAIN,
    address: params.housesAddress,
    abi: GOODDAO_HOUSES_ABI,
    functionName: 'registerAndStake',
    args: [
      houseToContractValue(params.selectedHouse),
      params.profileDraft.name ?? '',
      params.profileDraft.socialLinks ?? '',
      params.profileDraft.projectWebpage ?? '',
      params.profileDraft.missionStatement ?? '',
      params.profileDraft.distributionStrategy ?? '',
    ],
  })
}

export async function requestCeloMainnetSwitch(provider: EIP1193Provider | null): Promise<void> {
  if (!provider) return

  await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: `0x${CELO_CHAIN_ID.toString(16)}` }],
  })
}

export function parseStakeAmountLabelToWei(stakeAmountLabel: string): bigint {
  const numericValue = stakeAmountLabel.replace(/[^0-9.]/g, '') || '0'
  return parseUnits(numericValue, 18)
}
