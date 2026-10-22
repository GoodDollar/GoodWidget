/**
 * Rules for deciding whether a wallet address is live.
 *
 * A widget learns the connected address one of two ways: it tracks the raw
 * provider itself, or an integrator supplies it from their own connection SDK
 * (`addressOverride`). The second is the one that goes stale — AppKit and wagmi
 * restore the last account from storage and report a connected session while the
 * wallet behind it is locked, so the address is real but cannot sign.
 *
 * These decide what an `eth_accounts` read means for that address. They are split
 * out from the provider because the direction of the rule is the whole point and
 * is worth testing on its own: the wallet may contradict a supplied address,
 * never invent one.
 */

/**
 * The address to expose, given what the wallet last said about its accounts.
 *
 * @param candidate address from the override, or from our own provider tracking
 * @param walletReportsNoAccounts whether the wallet has said it has no accounts
 */
export function resolveLiveAddress(
  candidate: string | null,
  walletReportsNoAccounts: boolean,
): string | null {
  return walletReportsNoAccounts ? null : candidate
}

export interface VerifiedAddressOptions {
  /** Whether an integrator supplied the address, rather than us tracking it. */
  hasAddressOverride: boolean
  /** The address currently in play, from whichever of those two sources. */
  candidate: string | null
}

/**
 * What a fresh `eth_accounts` read resolves to for a caller about to request a
 * signature. An empty list is authoritative in both directions — it means no
 * signature is possible right now, whatever the integrator believes.
 *
 * With an override in play the wallet is consulted about *whether* the account
 * is live, not *which* account is active: a wallet whose first authorized
 * account differs from the override (the user switched accounts in MetaMask
 * while the SDK still points at the old one) still confirms a signable session,
 * and picking the wallet's account here would silently swap identities.
 */
export function resolveVerifiedAddress(
  accounts: string[],
  { hasAddressOverride, candidate }: VerifiedAddressOptions,
): string | null {
  if (accounts.length === 0) return null
  return hasAddressOverride ? candidate : (accounts[0] ?? null)
}

/**
 * The address to track when we read the wallet ourselves, rather than being
 * handed one.
 *
 * An `accountsChanged` event is authoritative in both directions — the wallet is
 * telling us what it now has. A polled `eth_accounts` read only ever adds: a
 * transient empty result during a reconnect would otherwise wipe a good address,
 * which is why the startup read has always been add-only.
 */
export function resolveTrackedAddress(
  current: string | null,
  accounts: string[],
  source: 'event' | 'poll',
): string | null {
  if (source === 'event') return accounts[0] ?? null
  return accounts.length > 0 ? (accounts[0] ?? null) : current
}
