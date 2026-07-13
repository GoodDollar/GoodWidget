import type { Address, PublicClient } from 'viem'
import type { GovernanceHouse } from '../types'
import {
  GOODDAO_HOUSES_ABI,
  formatStakeAmount,
  houseToContractValue,
  mapFlowSplitterConfig,
  mapHoaEligibilityRecord,
  mapMemberRecord,
  mapVoteConfig,
  readGoodIdRoot,
  type GovernanceFlowSplitterConfig,
  type GovernanceHoaEligibilityRecord,
  type GovernanceMemberRecord,
  type GovernanceVoteConfig,
} from './contracts'

export interface GovernanceStakeRequirements {
  citizenship: bigint
  alignment: bigint
}

export interface GovernanceSchedule {
  cycleStartTime: number | null
  termDurationSeconds: bigint
  votingTermLengthSeconds: bigint
}

export interface GovernanceMembershipReads {
  member: GovernanceMemberRecord
  minimumStakes: GovernanceStakeRequirements
  hoaEligibility: GovernanceHoaEligibilityRecord
  identityRoot: Address
  activeCitizens: Address[]
  activeAlignment: Address[]
}

export async function readGovernanceMembership(params: {
  publicClient: PublicClient
  housesAddress: Address
  goodIdAddress: Address
  account: Address
}): Promise<GovernanceMembershipReads> {
  const { publicClient, housesAddress, goodIdAddress, account } = params
  const [member, citizenshipStake, alignmentStake, hoaEligibility, identityRoot, activeCitizens, activeAlignment] =
    await Promise.all([
      publicClient.readContract({
        address: housesAddress,
        abi: GOODDAO_HOUSES_ABI,
        functionName: 'getMember',
        args: [account],
      }),
      publicClient.readContract({
        address: housesAddress,
        abi: GOODDAO_HOUSES_ABI,
        functionName: 'minimumStake',
        args: [houseToContractValue('citizenship')],
      }),
      publicClient.readContract({
        address: housesAddress,
        abi: GOODDAO_HOUSES_ABI,
        functionName: 'minimumStake',
        args: [houseToContractValue('alignment')],
      }),
      publicClient.readContract({
        address: housesAddress,
        abi: GOODDAO_HOUSES_ABI,
        functionName: 'getHoaEligibility',
        args: [account],
      }),
      readGoodIdRoot(publicClient, goodIdAddress, account),
      publicClient.readContract({
        address: housesAddress,
        abi: GOODDAO_HOUSES_ABI,
        functionName: 'getActiveMembers',
        args: [houseToContractValue('citizenship')],
      }),
      publicClient.readContract({
        address: housesAddress,
        abi: GOODDAO_HOUSES_ABI,
        functionName: 'getActiveMembers',
        args: [houseToContractValue('alignment')],
      }),
    ])

  return {
    member: mapMemberRecord(member),
    minimumStakes: {
      citizenship: citizenshipStake,
      alignment: alignmentStake,
    },
    hoaEligibility: mapHoaEligibilityRecord(hoaEligibility),
    identityRoot,
    activeCitizens,
    activeAlignment,
  }
}

export async function readGovernanceSchedule(params: {
  publicClient: PublicClient
  housesAddress: Address
}): Promise<GovernanceSchedule> {
  const { publicClient, housesAddress } = params
  const [cycleStartTime, termDuration, votingTermLength] = await Promise.all([
    publicClient.readContract({
      address: housesAddress,
      abi: GOODDAO_HOUSES_ABI,
      functionName: 'cycleStartTime',
    }),
    publicClient.readContract({
      address: housesAddress,
      abi: GOODDAO_HOUSES_ABI,
      functionName: 'termDuration',
    }),
    publicClient.readContract({
      address: housesAddress,
      abi: GOODDAO_HOUSES_ABI,
      functionName: 'votingTermLength',
    }),
  ])

  return {
    cycleStartTime: cycleStartTime > 0n ? Number(cycleStartTime) * 1000 : null,
    termDurationSeconds: termDuration,
    votingTermLengthSeconds: votingTermLength,
  }
}

export async function readGovernanceVote(params: {
  publicClient: PublicClient
  housesAddress: Address
  voterKey: Address
  activeAlignment: Address[]
}): Promise<{
  isVotingPeriod: boolean
  voteId: bigint
  voteConfig: GovernanceVoteConfig
  recipients: Address[]
  hasVoted: boolean
  finalizedUnits: Record<Address, bigint>
}> {
  const { publicClient, housesAddress, voterKey, activeAlignment } = params
  const [isVotingPeriod, voteId] = await Promise.all([
    publicClient.readContract({ address: housesAddress, abi: GOODDAO_HOUSES_ABI, functionName: 'isVotingPeriod' }),
    publicClient.readContract({ address: housesAddress, abi: GOODDAO_HOUSES_ABI, functionName: 'getCurrentVoteId' }),
  ])

  const [rawVoteConfig, rawRecipients, hasVoted] = await Promise.all([
    publicClient.readContract({
      address: housesAddress,
      abi: GOODDAO_HOUSES_ABI,
      functionName: 'getVoteConfig',
      args: [voteId],
    }),
    publicClient.readContract({
      address: housesAddress,
      abi: GOODDAO_HOUSES_ABI,
      functionName: 'getVoteRecipients',
      args: [voteId],
    }),
    publicClient.readContract({
      address: housesAddress,
      abi: GOODDAO_HOUSES_ABI,
      functionName: 'getHasVoted',
      args: [voteId, voterKey],
    }),
  ])

  const voteConfig = mapVoteConfig(rawVoteConfig)
  const recipients = rawRecipients.length > 0 ? rawRecipients : isVotingPeriod ? activeAlignment : rawRecipients
  const finalizedEntries = await Promise.all(
    recipients.map(async (recipient) => {
      const units = await publicClient.readContract({
        address: housesAddress,
        abi: GOODDAO_HOUSES_ABI,
        functionName: 'getFinalizedUnits',
        args: [voteId, recipient],
      })
      return [recipient, units] as const
    }),
  )

  return {
    isVotingPeriod,
    voteId,
    voteConfig,
    recipients,
    hasVoted,
    finalizedUnits: Object.fromEntries(finalizedEntries) as Record<Address, bigint>,
  }
}

export async function readFlowSplitterConfig(params: {
  publicClient: PublicClient
  housesAddress: Address
}): Promise<GovernanceFlowSplitterConfig> {
  const rawConfig = await params.publicClient.readContract({
    address: params.housesAddress,
    abi: GOODDAO_HOUSES_ABI,
    functionName: 'flowSplitterConfig',
  })
  return mapFlowSplitterConfig(rawConfig)
}

export function stakeRequirementLabel(minimumStakes: GovernanceStakeRequirements, house: GovernanceHouse): string {
  return formatStakeAmount(minimumStakes[house])
}
