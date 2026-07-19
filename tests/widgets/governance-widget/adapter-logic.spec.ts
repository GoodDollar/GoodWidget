import { expect, test } from '@playwright/test'
import {
  calculateStreamAmountWei,
  fetchFundingReceivedSoFar,
  formatFundingAmountWei,
} from '../../../packages/governance-widget/src/sdks/funding'
import {
  encodeGovernanceRegistrationData,
  mapFlowSplitterConfig,
  mapHoaEligibilityRecord,
  mapMemberRecord,
  mapVoteConfig,
} from '../../../packages/governance-widget/src/sdks/contracts'
import {
  registerWithTransferAndCall,
  unstakeGovernanceMembership,
} from '../../../packages/governance-widget/src/sdks/transactions'
import {
  readGovernanceSchedule,
  readGovernanceVote,
  voteStartTimeFromSchedule,
} from '../../../packages/governance-widget/src/sdks/contractReads'
import {
  getUnstakeAvailability,
  statusFromMember,
} from '../../../packages/governance-widget/src/hooks/useGovernanceMembership'
import {
  createVotingState,
  resolveGovernanceVoterKey,
  validateGovernanceBallot,
} from '../../../packages/governance-widget/src/hooks/useGovernanceVoting'

type Address = `0x${string}`
type Hex = `0x${string}`
type PublicClient = Parameters<typeof registerWithTransferAndCall>[0]['publicClient']
type WalletClient = Parameters<typeof registerWithTransferAndCall>[0]['walletClient']

const account = '0x4E5B2D7a45C2e31a8F0d09b4bE1fA11aD3aC9F08' as Address
const houses = '0x1111111111111111111111111111111111111111' as Address
const token = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A' as Address
const hash = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hex

test('maps final GoodDaoHouses ABI tuples', () => {
  const member = mapMemberRecord([
    1,
    2,
    2000n,
    100n,
    110n,
    0n,
    7n,
    'Solar Commons',
    'https://social.example',
    'https://project.example',
    'Mission',
    'Distribution strategy',
  ])

  expect(member).toMatchObject({
    house: 'alignment',
    status: 'active',
    stakedAmount: 2000n,
    memberIndex: 7n,
    name: 'Solar Commons',
    distributionStrategy: 'Distribution strategy',
  })
  expect(member.joinedAt).toBe(100000)

  expect(mapVoteConfig([123n, 456n, 789n, true])).toMatchObject({
    startTime: 123000,
    endTime: 456000,
    executedAt: 789000,
    executed: true,
  })
  expect(mapFlowSplitterConfig(['0x2222222222222222222222222222222222222222', 9n, houses])).toMatchObject({
    splitter: '0x2222222222222222222222222222222222222222',
    poolId: 9n,
    poolAddress: houses,
  })
  expect(mapHoaEligibilityRecord([true, 10n, 20n, 0n])).toMatchObject({
    isEligible: true,
    listedAt: 10000,
    updatedAt: 20000,
    delistedAt: null,
  })
})

test('encodes house selection in registration payload', () => {
  const citizenshipData = encodeGovernanceRegistrationData('citizenship', { name: 'Citizen' })
  const alignmentData = encodeGovernanceRegistrationData('alignment', { name: 'Alignment' })

  expect(citizenshipData).not.toBe(alignmentData)
  expect(citizenshipData).toContain('436974697a656e')
  expect(alignmentData).toContain('416c69676e6d656e74')
})

test('waits for successful registration and unstake receipts', async () => {
  const writes: unknown[] = []
  const registrationStages: string[] = []
  const unstakeStages: string[] = []
  const walletClient = {
    writeContract: async (request: unknown) => {
      writes.push(request)
      return hash
    },
  } as WalletClient
  const publicClient = {
    waitForTransactionReceipt: async () => ({ status: 'success' }),
  } as PublicClient

  await expect(registerWithTransferAndCall({
    publicClient,
    walletClient,
    account,
    addresses: { houses, gToken: token, goodId: account },
    selectedHouse: 'alignment',
    profileDraft: { name: 'Alignment' },
    stakeAmountWei: 2000n,
    onStage: (stage) => registrationStages.push(stage),
  })).resolves.toBe(hash)

  await expect(unstakeGovernanceMembership({
    publicClient,
    walletClient,
    account,
    housesAddress: houses,
    onStage: (stage) => unstakeStages.push(stage),
  })).resolves.toBe(hash)

  expect(writes).toHaveLength(2)
  expect(registrationStages).toEqual(['wallet_confirmation', 'submitted', 'confirmed'])
  expect(unstakeStages).toEqual(['wallet_confirmation', 'submitted', 'confirmed'])
  expect(writes[1]).toMatchObject({
    address: houses,
    functionName: 'unstake',
  })
})

test('does not report registration or unstake success for reverted receipts', async () => {
  const walletClient = { writeContract: async () => hash } as WalletClient
  const publicClient = {
    waitForTransactionReceipt: async () => ({ status: 'reverted' }),
  } as PublicClient
  const registrationStages: string[] = []
  const unstakeStages: string[] = []

  await expect(registerWithTransferAndCall({
    publicClient,
    walletClient,
    account,
    addresses: { houses, gToken: token, goodId: account },
    selectedHouse: 'citizenship',
    profileDraft: { name: 'Citizen' },
    stakeAmountWei: 1000n,
    onStage: (stage) => registrationStages.push(stage),
  })).rejects.toThrow('Transaction reverted')

  await expect(unstakeGovernanceMembership({
    publicClient,
    walletClient,
    account,
    housesAddress: houses,
    onStage: (stage) => unstakeStages.push(stage),
  })).rejects.toThrow('Transaction reverted')

  expect(registrationStages).toEqual(['wallet_confirmation', 'submitted'])
  expect(unstakeStages).toEqual(['wallet_confirmation', 'submitted'])
})

test('keeps registration and unstake in wallet confirmation when the user rejects', async () => {
  let receiptWaits = 0
  const walletClient = {
    writeContract: async () => {
      throw new Error('User rejected the request')
    },
  } as unknown as WalletClient
  const publicClient = {
    waitForTransactionReceipt: async () => {
      receiptWaits += 1
      return { status: 'success' }
    },
  } as PublicClient
  const registrationStages: string[] = []
  const unstakeStages: string[] = []

  await expect(registerWithTransferAndCall({
    publicClient,
    walletClient,
    account,
    addresses: { houses, gToken: token, goodId: account },
    selectedHouse: 'citizenship',
    profileDraft: { name: 'Citizen' },
    stakeAmountWei: 1000n,
    onStage: (stage) => registrationStages.push(stage),
  })).rejects.toThrow('User rejected')

  await expect(unstakeGovernanceMembership({
    publicClient,
    walletClient,
    account,
    housesAddress: houses,
    onStage: (stage) => unstakeStages.push(stage),
  })).rejects.toThrow('User rejected')

  expect(registrationStages).toEqual(['wallet_confirmation'])
  expect(unstakeStages).toEqual(['wallet_confirmation'])
  expect(receiptWaits).toBe(0)
})

test('aggregates active stopped multiple and paginated Superfluid streams', async () => {
  const nowSeconds = 2000n
  expect(calculateStreamAmountWei({
    sender: { id: account.toLowerCase() },
    currentFlowRate: '5',
    streamedUntilUpdatedAt: '100',
    updatedAtTimestamp: '1990',
  }, nowSeconds)).toBe(150n)

  let calls = 0
  const fetcher: typeof fetch = async (_url, init) => {
    calls += 1
    const body = JSON.parse(String(init?.body)) as { variables: { first: number; skip: number } }
    const count = body.variables.skip === 0 ? 1000 : 2
    return new Response(JSON.stringify({
      data: {
        streams: Array.from({ length: count }, (_, index) => ({
          sender: { id: `${account.toLowerCase()}-${index}` },
          currentFlowRate: index === 0 && body.variables.skip === 1000 ? '0' : '1',
          streamedUntilUpdatedAt: '10',
          updatedAtTimestamp: '1995',
        })),
      },
    }), { status: 200 })
  }

  const result = await fetchFundingReceivedSoFar({ receiver: houses, token, nowSeconds, fetcher })
  expect(calls).toBe(2)
  expect(result.streamCount).toBe(1002)
  expect(result.activeStreamCount).toBe(1001)
  expect(result.amountWei).toBe(15025n)
})

test('formats exact funding totals without leaking unbounded token decimals into the UI', () => {
  const token = 10n ** 18n

  expect(formatFundingAmountWei(450n * token + 1n)).toBe('450')
  expect(formatFundingAmountWei(450n * token + token / 2n)).toBe('450.5')
  expect(formatFundingAmountWei(450n * token + 123_600_000_000_000_000n)).toBe('450.124')
})

test('distinguishes stopped historical streams from an empty funding history', async () => {
  const stopped = await fetchFundingReceivedSoFar({
    receiver: houses,
    token,
    nowSeconds: 2000n,
    fetcher: async () => new Response(JSON.stringify({
      data: {
        streams: [{
          sender: { id: account.toLowerCase() },
          currentFlowRate: '0',
          streamedUntilUpdatedAt: '125',
          updatedAtTimestamp: '1900',
        }],
      },
    }), { status: 200 }),
  })
  expect(stopped).toMatchObject({ amountWei: 125n, streamCount: 1, activeStreamCount: 0 })

  const empty = await fetchFundingReceivedSoFar({
    receiver: houses,
    token,
    fetcher: async () => new Response(JSON.stringify({ data: { streams: [] } }), { status: 200 }),
  })
  expect(empty).toMatchObject({ amountWei: 0n, streamCount: 0, activeStreamCount: 0 })
})

test('maps unstaked members to onboarding and keeps revoked members non-actionable', () => {
  const baseMember = mapMemberRecord([
    0,
    2,
    1000n,
    100n,
    200n,
    0n,
    0n,
    'Citizen',
    '',
    '',
    '',
    '',
  ])

  expect(statusFromMember({ ...baseMember, status: 'unstaked' })).toBe('onboarding_required')
  expect(statusFromMember({ ...baseMember, status: 'revoked' })).toBe('revoked')
})

test('enforces the exact updatedAt plus termDuration unstake boundary', () => {
  const member = mapMemberRecord([
    0,
    2,
    1000n,
    100n,
    200n,
    0n,
    0n,
    'Citizen',
    '',
    '',
    '',
    '',
  ])
  const unlockAt = 200000 + 60_000

  expect(getUnstakeAvailability(member, 60n, unlockAt - 1)).toMatchObject({
    canUnstake: false,
    unlockAt,
  })
  expect(getUnstakeAvailability(member, 60n, unlockAt)).toEqual({
    canUnstake: true,
    unlockAt,
  })
})

test('rejects governance timestamps that cannot be represented safely', async () => {
  const unsafeSeconds = 18_446_744_073_709_551_615n
  const member = mapMemberRecord([
    0,
    2,
    1000n,
    100n,
    200n,
    0n,
    0n,
    'Citizen',
    '',
    '',
    '',
    '',
  ])

  expect(mapVoteConfig([unsafeSeconds, unsafeSeconds, unsafeSeconds, false])).toMatchObject({
    startTime: null,
    endTime: null,
    executedAt: null,
  })
  expect(getUnstakeAvailability(member, unsafeSeconds, Date.UTC(2026, 6, 19))).toMatchObject({
    canUnstake: false,
    unlockAt: null,
  })

  const unsafeSchedule = {
    cycleStartTime: 100_000,
    termDurationSeconds: unsafeSeconds,
    votingTermLengthSeconds: 50n,
    currentBlockTime: null,
  }
  expect(voteStartTimeFromSchedule(unsafeSchedule, 2n)).toBeNull()
  expect(createVotingState({
    member,
    identityRoot: account,
    voteId: 2n,
    isVotingOpen: false,
    voteStartTime: null,
    voteConfig: { startTime: null, endTime: null, executedAt: null, executed: false },
    recipients: [],
    hasVoted: false,
    finalizedUnits: {},
    schedule: unsafeSchedule,
    minimumStake: 1000n,
  }).summaryLabel).toBe('Contract schedule unavailable')

  const publicClient = {
    readContract: async ({ functionName }: { functionName: string }) => {
      if (functionName === 'cycleStartTime') return unsafeSeconds
      if (functionName === 'termDuration') return 100n
      if (functionName === 'votingTermLength') return 50n
      throw new Error(`Unexpected contract read: ${functionName}`)
    },
    getBlock: async () => ({ timestamp: 1_000n }),
  } as unknown as PublicClient
  await expect(readGovernanceSchedule({ publicClient, housesAddress: houses })).resolves.toEqual({
    cycleStartTime: null,
    termDurationSeconds: 100n,
    votingTermLengthSeconds: 50n,
    currentBlockTime: 1_000_000,
  })
})

test('derives vote start and excludes late provisional Alignment recipients', async () => {
  const earlyRecipient = '0x1111111111111111111111111111111111111111' as Address
  const lateRecipient = '0x2222222222222222222222222222222222222222' as Address
  const schedule = {
    cycleStartTime: 1_000_000,
    termDurationSeconds: 100n,
    votingTermLengthSeconds: 50n,
    currentBlockTime: 1_200_000,
  }
  expect(voteStartTimeFromSchedule(schedule, 2n)).toBe(1_200_000)

  const publicClient = {
    readContract: async ({ functionName, args }: { functionName: string; args?: readonly unknown[] }) => {
      if (functionName === 'isVotingPeriod') return true
      if (functionName === 'getCurrentVoteId') return 2n
      if (functionName === 'getVoteConfig') return [0n, 0n, 0n, false]
      if (functionName === 'getVoteRecipients') return []
      if (functionName === 'getHasVoted') return false
      if (functionName === 'getMember') {
        const joinedAt = args?.[0] === earlyRecipient ? 1100n : 1300n
        return [1, 2, 1000n, joinedAt, joinedAt, 0n, 0n, '', '', '', '', '']
      }
      if (functionName === 'getFinalizedUnits') return 0n
      throw new Error(`Unexpected contract read: ${functionName}`)
    },
  } as unknown as PublicClient

  const result = await readGovernanceVote({
    publicClient,
    housesAddress: houses,
    voterKey: account,
    activeAlignment: [earlyRecipient, lateRecipient],
    schedule,
  })
  expect(result.voteStartTime).toBe(1_200_000)
  expect(result.recipients).toEqual([earlyRecipient])
})

test('requires voters to have joined before vote start and validates exact ballots', () => {
  const recipient = '0x1111111111111111111111111111111111111111' as Address
  const member = mapMemberRecord([
    0,
    2,
    1000n,
    100n,
    100n,
    0n,
    0n,
    'Citizen',
    '',
    '',
    '',
    '',
  ])
  const schedule = {
    cycleStartTime: 100000,
    termDurationSeconds: 100n,
    votingTermLengthSeconds: 50n,
    currentBlockTime: 150000,
  }
  const voting = createVotingState({
    member,
    identityRoot: account,
    voteId: 0n,
    isVotingOpen: true,
    voteStartTime: 150000,
    voteConfig: { startTime: 150000, endTime: 200000, executedAt: null, executed: false },
    recipients: [recipient],
    hasVoted: false,
    finalizedUnits: { [recipient]: 0n },
    schedule,
    minimumStake: 1000n,
  })
  expect(voting.canVote).toBe(true)

  const lateVoting = createVotingState({
    ...{
      member: { ...member, joinedAt: 150001 },
      identityRoot: account,
      voteId: 0n,
      isVotingOpen: true,
      voteStartTime: 150000,
      voteConfig: { startTime: 150000, endTime: 200000, executedAt: null, executed: false },
      recipients: [recipient],
      hasVoted: false,
      finalizedUnits: { [recipient]: 0n },
      schedule,
      minimumStake: 1000n,
    },
  })
  expect(lateVoting.canVote).toBe(false)
  expect(lateVoting.disabledReason).toContain('joined after')

  expect(resolveGovernanceVoterKey(member, account, houses)).toBe(account)
  expect(resolveGovernanceVoterKey({ ...member, house: 'alignment' }, account, houses)).toBe(houses)

  const unverifiedCitizenVoting = createVotingState({
    member,
    identityRoot: null,
    voteId: 0n,
    isVotingOpen: true,
    voteStartTime: 150000,
    voteConfig: { startTime: 150000, endTime: 200000, executedAt: null, executed: false },
    recipients: [recipient],
    hasVoted: false,
    finalizedUnits: { [recipient]: 0n },
    schedule,
    minimumStake: 1000n,
  })
  expect(unverifiedCitizenVoting.canVote).toBe(false)
  expect(unverifiedCitizenVoting.disabledReason).toContain('GoodID')

  const alignmentVoting = createVotingState({
    member: { ...member, house: 'alignment' },
    identityRoot: null,
    voteId: 0n,
    isVotingOpen: true,
    voteStartTime: 150000,
    voteConfig: { startTime: 150000, endTime: 200000, executedAt: null, executed: false },
    recipients: [recipient],
    hasVoted: false,
    finalizedUnits: { [recipient]: 0n },
    schedule,
    minimumStake: 1000n,
  })
  expect(alignmentVoting.canVote).toBe(true)

  expect(validateGovernanceBallot([recipient], { [recipient]: 10_000 })).toEqual({
    recipients: [recipient],
    allocations: [10_000n],
  })
  expect(() => validateGovernanceBallot([recipient], { [recipient]: 9_999 })).toThrow(
    'Alloc != 10000',
  )
  expect(() => validateGovernanceBallot([recipient, recipient], { [recipient]: 10_000 })).toThrow(
    'Duplicate recipient',
  )
  expect(() => validateGovernanceBallot([recipient], { [recipient]: 10_000.5 })).toThrow(
    'Invalid allocation',
  )
})

test('requires the current minimum stake for voters from either house', () => {
  const recipient = '0x1111111111111111111111111111111111111111' as Address
  const schedule = {
    cycleStartTime: 100000,
    termDurationSeconds: 100n,
    votingTermLengthSeconds: 50n,
    currentBlockTime: 150000,
  }
  const baseMember = mapMemberRecord([
    0,
    2,
    1000n,
    100n,
    100n,
    0n,
    0n,
    'Member',
    '',
    '',
    '',
    '',
  ])

  for (const house of ['citizenship', 'alignment'] as const) {
    for (const [stakedAmount, expected] of [
      [999n, false],
      [1000n, true],
      [1001n, true],
    ] as const) {
      const voting = createVotingState({
        member: { ...baseMember, house, stakedAmount },
        identityRoot: house === 'citizenship' ? account : null,
        voteId: 0n,
        isVotingOpen: true,
        voteStartTime: 150000,
        voteConfig: { startTime: 150000, endTime: 200000, executedAt: null, executed: false },
        recipients: [recipient],
        hasVoted: false,
        finalizedUnits: { [recipient]: 0n },
        schedule,
        minimumStake: 1000n,
      })

      expect(voting.canVote).toBe(expected)
      if (!expected) expect(voting.disabledReason).toContain('below the current minimum')
    }
  }
})

test('surfaces failed Superfluid stream queries', async () => {
  await expect(fetchFundingReceivedSoFar({
    receiver: houses,
    token,
    fetcher: async () => new Response('nope', { status: 500 }),
  })).rejects.toThrow('HTTP 500')
})
