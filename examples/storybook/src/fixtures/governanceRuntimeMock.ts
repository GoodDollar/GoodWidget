import {
  decodeFunctionData,
  encodeFunctionResult,
  parseAbi,
  type Address,
  type Hex,
} from 'viem'

const HOUSES_READ_ABI = parseAbi([
  'function minimumStake(uint8 house) view returns (uint256)',
  'function getMember(address account) view returns ((uint8 house, uint8 status, uint256 stakedAmount, uint64 joinedAt, uint64 updatedAt, uint64 unstakedAt, uint256 memberIndex, string name, string socialLinks, string projectWebpage, string missionStatement, string distributionStrategy))',
  'function getHoaEligibility(address account) view returns ((bool isEligible, uint64 listedAt, uint64 updatedAt, uint64 delistedAt))',
  'function getActiveMembers(uint8 house) view returns (address[])',
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
])

const GOOD_ID_READ_ABI = parseAbi([
  'function getWhitelistedRoot(address account) view returns (address)',
])

export const MOCK_HOUSES = '0x4444444444444444444444444444444444444444' as Address
export const MOCK_GOOD_ID = '0x5555555555555555555555555555555555555555' as Address
export const MOCK_CITIZEN = '0x6666666666666666666666666666666666666666' as Address
export const MOCK_ALIGNMENT = '0x7777777777777777777777777777777777777777' as Address
export const MOCK_POOL = '0x8888888888888888888888888888888888888888' as Address

export interface MockGovernanceReadOptions {
  memberStatus?: 0 | 1 | 2 | 3 | 4
}

export function encodeMockGovernanceRead(
  to: Address,
  data: Hex,
  options: MockGovernanceReadOptions = {},
): Hex {
  if (to.toLowerCase() === MOCK_GOOD_ID.toLowerCase()) {
    const decoded = decodeFunctionData({ abi: GOOD_ID_READ_ABI, data })
    if (decoded.functionName !== 'getWhitelistedRoot') {
      throw new Error(`Unexpected GoodID read: ${decoded.functionName}`)
    }
    return encodeFunctionResult({
      abi: GOOD_ID_READ_ABI,
      functionName: 'getWhitelistedRoot',
      result: MOCK_CITIZEN,
    })
  }

  if (to.toLowerCase() !== MOCK_HOUSES.toLowerCase()) {
    throw new Error(`Unexpected contract address: ${to}`)
  }

  const decoded = decodeFunctionData({ abi: HOUSES_READ_ABI, data })
  switch (decoded.functionName) {
    case 'getMember':
      const memberStatus = options.memberStatus ?? 2
      const hasMembership = memberStatus !== 0 && memberStatus !== 4
      return encodeFunctionResult({
        abi: HOUSES_READ_ABI,
        functionName: 'getMember',
        result: {
          house: 0,
          status: memberStatus,
          stakedAmount: hasMembership ? 1_000n * 10n ** 18n : 0n,
          joinedAt: hasMembership ? 1_761_955_200n : 0n,
          updatedAt: hasMembership ? 1_764_547_200n : 0n,
          unstakedAt: memberStatus === 4 ? 1_784_044_800n : 0n,
          memberIndex: 0n,
          name: hasMembership ? 'Mocked Citizen' : '',
          socialLinks: hasMembership ? 'https://example.com/citizen' : '',
          projectWebpage: '',
          missionStatement: '',
          distributionStrategy: '',
        },
      })
    case 'minimumStake':
      return encodeFunctionResult({
        abi: HOUSES_READ_ABI,
        functionName: 'minimumStake',
        result: 1_000n * 10n ** 18n,
      })
    case 'getHoaEligibility':
      return encodeFunctionResult({
        abi: HOUSES_READ_ABI,
        functionName: 'getHoaEligibility',
        result: {
          isEligible: true,
          listedAt: 1_761_955_200n,
          updatedAt: 1_761_955_200n,
          delistedAt: 0n,
        },
      })
    case 'getActiveMembers': {
      const house = Number(decoded.args[0])
      return encodeFunctionResult({
        abi: HOUSES_READ_ABI,
        functionName: 'getActiveMembers',
        result: house === 0 ? [MOCK_CITIZEN] : [MOCK_ALIGNMENT],
      })
    }
    case 'cycleStartTime':
      return encodeFunctionResult({
        abi: HOUSES_READ_ABI,
        functionName: 'cycleStartTime',
        result: 1_764_547_200n,
      })
    case 'termDuration':
      return encodeFunctionResult({
        abi: HOUSES_READ_ABI,
        functionName: 'termDuration',
        result: 19_440_000n,
      })
    case 'votingTermLength':
      return encodeFunctionResult({
        abi: HOUSES_READ_ABI,
        functionName: 'votingTermLength',
        result: 1_209_600n,
      })
    case 'isVotingPeriod':
      return encodeFunctionResult({
        abi: HOUSES_READ_ABI,
        functionName: 'isVotingPeriod',
        result: true,
      })
    case 'getCurrentVoteId':
      return encodeFunctionResult({
        abi: HOUSES_READ_ABI,
        functionName: 'getCurrentVoteId',
        result: 1n,
      })
    case 'getVoteConfig':
      return encodeFunctionResult({
        abi: HOUSES_READ_ABI,
        functionName: 'getVoteConfig',
        result: {
          startTime: 1_783_987_200n,
          endTime: 1_785_196_800n,
          executedAt: 0n,
          executed: false,
        },
      })
    case 'getVoteRecipients':
      return encodeFunctionResult({
        abi: HOUSES_READ_ABI,
        functionName: 'getVoteRecipients',
        result: [MOCK_ALIGNMENT],
      })
    case 'getHasVoted':
      return encodeFunctionResult({
        abi: HOUSES_READ_ABI,
        functionName: 'getHasVoted',
        result: false,
      })
    case 'getFinalizedUnits':
      return encodeFunctionResult({
        abi: HOUSES_READ_ABI,
        functionName: 'getFinalizedUnits',
        result: 0n,
      })
    case 'flowSplitterConfig':
      return encodeFunctionResult({
        abi: HOUSES_READ_ABI,
        functionName: 'flowSplitterConfig',
        result: [MOCK_HOUSES, 1n, MOCK_POOL],
      })
    default:
      throw new Error(`Unexpected houses read: ${decoded.functionName}`)
  }
}
