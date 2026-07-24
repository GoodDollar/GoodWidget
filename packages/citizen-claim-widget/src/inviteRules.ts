import type { InviteUser } from '@goodsdks/invite-sdk'
import { isAddressEqual, zeroAddress, zeroHash, type Address } from 'viem'

export function canAttachInviter(user: InviteUser | null): boolean {
  return Boolean(
    user &&
      user.inviteCode !== zeroHash &&
      isAddressEqual(user.invitedBy, zeroAddress) &&
      !user.bountyPaid,
  )
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
