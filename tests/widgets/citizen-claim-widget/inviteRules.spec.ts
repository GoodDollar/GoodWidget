import { test, expect } from '@playwright/test'
import { zeroAddress, zeroHash, type Address } from 'viem'
import {
  canAttachInviter,
  getMyInviteCode,
  hasCollectableInvitees,
} from '../../../packages/citizen-claim-widget/src/inviteRules'
import {
  collectEligibleInviteRewards,
  encodeInviteCode,
  submitInviteJoin,
} from '../../../packages/citizen-claim-widget/src/inviteAdapter'

const address = '0x1234567890123456789012345678901234567890' as Address
const inviterAddress = '0x9876543210987654321098765432109876543210' as Address
const inviterCode = `0x${'01'.repeat(32)}` as `0x${string}`

function createUser(overrides = {}) {
  return {
    invitedBy: zeroAddress,
    inviteCode: inviterCode,
    bountyPaid: false,
    level: 0n,
    levelStarted: 0n,
    totalApprovedInvites: 0n,
    totalEarned: 0n,
    joinedAt: 1n,
    bountyAtJoin: 0n,
    ...overrides,
  }
}

test('code-only registered users attach an inviter with their original code', async () => {
  const user = createUser()
  let resolveCalls = 0

  expect(canAttachInviter(user)).toBe(true)
  await expect(
    getMyInviteCode(user, async () => {
      resolveCalls += 1
      return zeroHash
    }),
  ).resolves.toBe(inviterCode)
  expect(resolveCalls).toBe(0)
})

test('deferred join action validates the inviter and reuses the registered personal code', async () => {
  const calls: Array<{ myCode: `0x${string}`; inviter: `0x${string}` }> = []
  const sdk = {
    resolveCode: async () => inviterAddress,
    join: async (myCode: `0x${string}`, inviter: `0x${string}`) => {
      calls.push({ myCode, inviter })
      return zeroHash
    },
  }

  await expect(
    submitInviteJoin({
      sdk,
      address,
      user: createUser(),
      inviterCode: 'FRIEND-42',
    }),
  ).resolves.toBe(true)
  expect(calls).toEqual([{ myCode: inviterCode, inviter: encodeInviteCode('FRIEND-42') }])
})

test('paid or already-attached users cannot attach an inviter', () => {
  expect(canAttachInviter(createUser({ bountyPaid: true }))).toBe(false)
  expect(canAttachInviter(createUser({ invitedBy: address }))).toBe(false)
  expect(canAttachInviter(createUser({ inviteCode: zeroHash, joinedAt: 0n }))).toBe(false)
})

test('rewards are collectable only when the SDK reports collectable invitees', () => {
  expect(hasCollectableInvitees([])).toBe(false)
  expect(hasCollectableInvitees([address])).toBe(true)
})

test('collection action does not submit an empty batch and preserves SDK-reported scope', async () => {
  let collectionCalls = 0
  const sdk = {
    collectAllBounties: async () => {
      collectionCalls += 1
      return [
        {
          txHash: zeroHash,
          invitee: address,
          inviter: inviterAddress,
          bountyPaid: 5n,
          inviterLevel: 1n,
          earnedLevel: false,
        },
      ]
    },
  }

  await expect(collectEligibleInviteRewards(sdk, [])).resolves.toEqual([])
  expect(collectionCalls).toBe(0)

  const results = await collectEligibleInviteRewards(sdk, [address])
  expect(collectionCalls).toBe(1)
  expect(results.map((result) => result.invitee)).toEqual([address])
})
