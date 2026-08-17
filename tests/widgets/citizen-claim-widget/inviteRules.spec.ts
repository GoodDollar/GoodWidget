import { test, expect } from '@playwright/test'
import { zeroAddress, zeroHash, type Address } from 'viem'
import { canAttachInviter, getMyInviteCode, hasCollectableInvitees } from '../../../packages/citizen-claim-widget/src/inviteRules'

const address = '0x1234567890123456789012345678901234567890' as Address
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

test('paid or already-attached users cannot attach an inviter', () => {
  expect(canAttachInviter(createUser({ bountyPaid: true }))).toBe(false)
  expect(canAttachInviter(createUser({ invitedBy: address }))).toBe(false)
})

test('users without a personal code yet can still attach a deferred inviter', () => {
  // Matches GoodWallet's InvCodeBox and the InvitesV2 join() contract call, which
  // creates the caller's own code and attaches the inviter in one transaction —
  // having a code first is not a precondition of the deferred-inviter rule.
  expect(canAttachInviter(createUser({ inviteCode: zeroHash, joinedAt: 0n }))).toBe(true)
})

test('rewards are collectable only when the SDK reports collectable invitees', () => {
  expect(hasCollectableInvitees([])).toBe(false)
  expect(hasCollectableInvitees([address])).toBe(true)
})
