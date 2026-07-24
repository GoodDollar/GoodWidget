import { test, expect } from '@playwright/test'
import { zeroAddress, zeroHash, type Address } from 'viem'
import {
  encodeInviteCode,
  loadInviteSnapshot,
  performCollectAll,
  performJoin,
  type InviteWriteSdk,
} from '../../../packages/citizen-claim-widget/src/inviteAdapter'
import { isInviteeCollectable } from '../../../packages/citizen-claim-widget/src/inviteRules'

const inviter = '0x1234567890123456789012345678901234567890' as Address
const invitee = '0x2222222222222222222222222222222222222222' as Address
const collectableInvitee = '0x3333333333333333333333333333333333333333' as Address
const myCode = `0x${'01'.repeat(32)}` as `0x${string}`
const inviterCode = `0x${'02'.repeat(32)}` as `0x${string}`

function createUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    invitedBy: zeroAddress,
    inviteCode: myCode,
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

/** Deterministic in-memory double for the subset of InviteSDK used by adapter actions. */
function createFakeSdk(overrides: Partial<InviteWriteSdk> = {}): InviteWriteSdk {
  const eligibility = {
    isActive: true,
    inviteeWhitelisted: true,
    inviterWhitelisted: true,
    minimumClaims: 5,
    minimumDays: 3,
    reverificationDue: false,
  }

  return {
    getUser: async () => createUser(),
    getLevel: async () => ({ toNext: 5n, bounty: 100n, daysToComplete: 30n }),
    getInvitees: async () => [invitee, collectableInvitee],
    getPendingInvitees: async () => [invitee, collectableInvitee],
    getCollectableInvitees: async () => [collectableInvitee],
    checkEligibilityDetails: async () => ({ eligible: true, details: eligibility }),
    resolveCode: async () => zeroAddress,
    join: async () => '0xjoin' as `0x${string}`,
    collectAllBounties: async () => [],
    ...overrides,
  }
}

test('loadInviteSnapshot distinguishes pending from collectable invitees', async () => {
  const sdk = createFakeSdk()
  const snapshot = await loadInviteSnapshot(sdk, inviter)

  expect(snapshot.invitees).toEqual([invitee, collectableInvitee])
  expect(snapshot.pendingInvitees).toEqual([invitee, collectableInvitee])
  expect(snapshot.collectableInvitees).toEqual([collectableInvitee])
  expect(isInviteeCollectable(invitee, snapshot.collectableInvitees)).toBe(false)
  expect(isInviteeCollectable(collectableInvitee, snapshot.collectableInvitees)).toBe(true)
})

test('performJoin reuses the caller original code when attaching a deferred inviter', async () => {
  let joinArgs: [`0x${string}`, `0x${string}`] | null = null
  let resolveCodeCalls = 0
  const sdk = createFakeSdk({
    getUser: async () => createUser({ inviteCode: myCode, invitedBy: zeroAddress, bountyPaid: false }),
    resolveCode: async () => {
      resolveCodeCalls += 1
      return zeroAddress
    },
    join: async (code, invCode) => {
      joinArgs = [code, invCode]
      return '0xjoin' as `0x${string}`
    },
  })

  const outcome = await performJoin(sdk, inviter, createUser({ inviteCode: myCode }), inviterCode)

  // The registered personal code is reused verbatim — no new code is generated.
  expect(resolveCodeCalls).toBe(0)
  expect(joinArgs).toEqual([myCode, inviterCode])
  expect(outcome.successMessage).toBe('Joined inviter successfully.')
  expect(outcome.snapshot).not.toBeNull()
})

test('performJoin generates a code only when the caller has none yet', async () => {
  let joinArgs: [`0x${string}`, `0x${string}`] | null = null
  const sdk = createFakeSdk({
    // First candidate prefix is free.
    resolveCode: async () => zeroAddress,
    join: async (code, invCode) => {
      joinArgs = [code, invCode]
      return '0xjoin' as `0x${string}`
    },
  })

  const outcome = await performJoin(sdk, inviter, createUser({ inviteCode: zeroHash }), undefined)

  expect(joinArgs).not.toBeNull()
  expect(joinArgs![1]).toBe(zeroHash)
  expect(outcome.successMessage).toBe('Invite code created successfully.')
})

test('performJoin surfaces success even when the post-join snapshot reload fails', async () => {
  const sdk = createFakeSdk({
    getUser: async () => {
      throw new Error('RPC unavailable')
    },
  })

  // getUser only fails on the reload path in this fixture (join itself does not call getUser).
  const outcome = await performJoin(sdk, inviter, createUser({ inviteCode: myCode }), inviterCode)
  expect(outcome.successMessage).toBe('Joined inviter successfully.')
  expect(outcome.snapshot).toBeNull()
})

test('performCollectAll reports no rewards collected when nothing was eligible', async () => {
  const sdk = createFakeSdk({ collectAllBounties: async () => [] })
  const outcome = await performCollectAll(sdk, inviter)
  expect(outcome.successMessage).toBe('No rewards were collected.')
})

test('performCollectAll reports success and refreshed collectable state after a payout', async () => {
  const sdk = createFakeSdk({
    collectAllBounties: async () => [
      {
        txHash: '0xabc' as `0x${string}`,
        invitee: collectableInvitee,
        inviter,
        bountyPaid: 100n,
        inviterLevel: 0n,
        earnedLevel: false,
      },
    ],
    // After collection, the previously-collectable invitee is no longer pending.
    getPendingInvitees: async () => [invitee],
    getCollectableInvitees: async () => [],
  })

  const outcome = await performCollectAll(sdk, inviter)

  expect(outcome.successMessage).toBe('Invite rewards collected successfully.')
  expect(outcome.snapshot?.pendingInvitees).toEqual([invitee])
  expect(outcome.snapshot?.collectableInvitees).toEqual([])
})

test('encodeInviteCode round-trips through performJoin without mutating an unrelated code', async () => {
  const encoded = encodeInviteCode('friendcode')
  let joinArgs: [`0x${string}`, `0x${string}`] | null = null
  const sdk = createFakeSdk({
    join: async (code, invCode) => {
      joinArgs = [code, invCode]
      return '0xjoin' as `0x${string}`
    },
  })

  await performJoin(sdk, inviter, createUser({ inviteCode: myCode }), encoded)
  expect(joinArgs).toEqual([myCode, encoded])
})
