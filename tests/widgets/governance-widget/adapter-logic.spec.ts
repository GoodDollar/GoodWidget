import { expect, test } from '@playwright/test'
import type { Address, Hex, PublicClient, WalletClient } from 'viem'
import {
  calculateStreamAmountWei,
  fetchFundingReceivedSoFar,
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
  restakeWithTransferAndCall,
} from '../../../packages/governance-widget/src/sdks/transactions'

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

test('waits for successful registration and restake receipts', async () => {
  const writes: unknown[] = []
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
  })).resolves.toBe(hash)

  await expect(restakeWithTransferAndCall({
    publicClient,
    walletClient,
    account,
    addresses: { houses, gToken: token, goodId: account },
    stakeAmountWei: 1000n,
  })).resolves.toBe(hash)

  expect(writes).toHaveLength(2)
  expect(JSON.stringify(writes[1], (_, value) => (typeof value === 'bigint' ? value.toString() : value))).toContain('0x')
})

test('does not report success for reverted transaction receipts', async () => {
  const walletClient = { writeContract: async () => hash } as WalletClient
  const publicClient = {
    waitForTransactionReceipt: async () => ({ status: 'reverted' }),
  } as PublicClient

  await expect(registerWithTransferAndCall({
    publicClient,
    walletClient,
    account,
    addresses: { houses, gToken: token, goodId: account },
    selectedHouse: 'citizenship',
    profileDraft: { name: 'Citizen' },
    stakeAmountWei: 1000n,
  })).rejects.toThrow('Transaction reverted')
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
  expect(result.amountWei).toBe(15025n)
})

test('surfaces failed Superfluid stream queries', async () => {
  await expect(fetchFundingReceivedSoFar({
    receiver: houses,
    token,
    fetcher: async () => new Response('nope', { status: 500 }),
  })).rejects.toThrow('HTTP 500')
})
