import type { InviteUser } from '@goodsdks/invite-sdk'
import { isAddressEqual, zeroAddress, zeroHash, type Address } from 'viem'

/**
 * A deferred inviter may be attached exactly while `invitedBy` is empty and the
 * invite bounty is unpaid — the protocol rule this widget must not change. This
 * does not require the caller to already have their own invite code: `join()`
 * can create the caller's code and attach the inviter in the same transaction
 * (see `performJoin`/`getMyInviteCode`), matching GoodWallet's own InvCodeBox,
 * which offers deferred attachment regardless of whether the caller has a code
 * or is whitelisted yet.
 */
export function canAttachInviter(user: InviteUser | null): boolean {
  return Boolean(user && isAddressEqual(user.invitedBy, zeroAddress) && !user.bountyPaid)
}

export async function getMyInviteCode(
  user: InviteUser | null,
  generateCode: () => Promise<`0x${string}`>,
): Promise<`0x${string}`> {
  if (user?.inviteCode && user.inviteCode !== zeroHash) return user.inviteCode
  return generateCode()
}

export function hasCollectableInvitees(collectableInvitees: Address[]): boolean {
  return collectableInvitees.length > 0
}

/** True when `invitee` is currently reported as collectable by the SDK. */
export function isInviteeCollectable(invitee: Address, collectableInvitees: Address[]): boolean {
  return collectableInvitees.some((collectable) => isAddressEqual(collectable, invitee))
}
