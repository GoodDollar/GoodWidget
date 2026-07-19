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
  safeMillisecondsFromSeconds,
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
  currentBlockTime: number | null
}

export function voteStartTimeFromSchedule(
  schedule: GovernanceSchedule,
  voteId: bigint,
): number | null {
  if (!schedule.cycleStartTime || schedule.termDurationSeconds <= 0n) return null
  const voteOffsetMs = safeMillisecondsFromSeconds(voteId * schedule.termDurationSeconds)
  if (voteOffsetMs === null) return null
  const voteStartTime = schedule.cycleStartTime + voteOffsetMs
  return Number.isSafeInteger(voteStartTime) ? voteStartTime : null
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
    activeCitizens: [...activeCitizens],
    activeAlignment: [...activeAlignment],
  }
}

export async function readGovernanceSchedule(params: {
  publicClient: PublicClient
  housesAddress: Address
}): Promise<GovernanceSchedule> {
  const { publicClient, housesAddress } = params
  const [cycleStartTime, termDuration, votingTermLength, currentBlockTime] = await Promise.all([
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
    publicClient.getBlock({ blockTag: 'latest' })
      .then((block) => safeMillisecondsFromSeconds(block.timestamp))
      .catch(() => null),
  ])

  return {
    cycleStartTime: safeMillisecondsFromSeconds(cycleStartTime),
    termDurationSeconds: termDuration,
    votingTermLengthSeconds: votingTermLength,
    currentBlockTime,
  }
}

export async function readGovernanceVote(params: {
  publicClient: PublicClient
  housesAddress: Address
  voterKey: Address
  activeAlignment: Address[]
  schedule: GovernanceSchedule
}): Promise<{
  isVotingPeriod: boolean
  voteId: bigint
  voteConfig: GovernanceVoteConfig
  recipients: Address[]
  hasVoted: boolean
  finalizedUnits: Record<Address, bigint>
  voteStartTime: number | null
}> {
  const { publicClient, housesAddress, voterKey, activeAlignment, schedule } = params
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
  const voteStartTime = voteConfig.startTime ?? voteStartTimeFromSchedule(schedule, voteId)
  let recipients: Address[] = [...rawRecipients]

  if (rawRecipients.length === 0 && isVotingPeriod && voteStartTime) {
    // Before the first ballot creates the on-chain snapshot, mirror the
    // contract rule so late-joining HoA members are never submitted.
    const provisionalRecords = await Promise.all(
      activeAlignment.map(async (recipient) => ({
        recipient,
        member: mapMemberRecord(
          await publicClient.readContract({
            address: housesAddress,
            abi: GOODDAO_HOUSES_ABI,
            functionName: 'getMember',
            args: [recipient],
          }),
        ),
      })),
    )
    recipients = provisionalRecords
      .filter(({ member }) =>
        member.status === 'active' &&
        member.house === 'alignment' &&
        member.joinedAt !== null &&
        member.joinedAt <= voteStartTime,
      )
      .map(({ recipient }) => recipient)
  }
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
    voteStartTime,
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
