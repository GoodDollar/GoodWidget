/** Indicates how a buyer identity was created or loaded. */
export type BuyerIdentityType = 'derived' | 'imported' | 'address-only'

/** A single buyer identity stored per payer session. */
export type BuyerRecord = {
  /** Buyer's public address (checksummed or lowercase). */
  address: string
  /** Private key – absent for address-only buyers. */
  privateKey?: string
  /** How the buyer was created. */
  type: BuyerIdentityType
  /**
   * Derivation index used when signing the wallet message (undefined for
   * imported/address-only buyers).
   */
  derivationIndex?: number
  /** Optional human-readable label shown in the UI. */
  label?: string
}

export type PayerWalletSession = {
  /** Ordered list of buyer identities known for this payer. */
  buyers: BuyerRecord[]
  /** Address of the currently active buyer, or null if none selected. */
  activeBuyerAddress: string | null
  /** Whether operator consent has been granted for the active buyer. */
  operatorConsented: boolean
}

const payerWalletSessions = new Map<string, PayerWalletSession>()

function payerSessionKey(address: string): string {
  return address.toLowerCase()
}

/**
 * Reads the session for the given payer address.
 * Automatically migrates legacy single-buyer sessions into the new buyers array format.
 */
export function readPayerSession(address: string | null): PayerWalletSession | null {
  if (!address) return null
  const raw = payerWalletSessions.get(payerSessionKey(address))
  if (!raw) return null

  // Migration: old sessions may not have the `buyers` array yet
  if (!Array.isArray((raw as unknown as Record<string, unknown>).buyers)) {
    const legacy = raw as unknown as {
      buyerPubKey?: string
      buyerPrvKey?: string
      operatorConsented: boolean
    }
    const migrated: PayerWalletSession = {
      buyers: legacy.buyerPubKey
        ? [
            {
              address: legacy.buyerPubKey,
              privateKey: legacy.buyerPrvKey,
              type: 'derived',
              derivationIndex: 0,
              label: 'Buyer 1',
            },
          ]
        : [],
      activeBuyerAddress: legacy.buyerPubKey ?? null,
      operatorConsented: legacy.operatorConsented,
    }
    payerWalletSessions.set(payerSessionKey(address), migrated)
    return migrated
  }

  return raw
}

export function patchPayerSession(address: string, patch: Partial<PayerWalletSession>): void {
  const existing = readPayerSession(address)
  payerWalletSessions.set(payerSessionKey(address), {
    buyers: [],
    activeBuyerAddress: null,
    operatorConsented: false,
    ...existing,
    ...patch,
  })
}

/**
 * Adds a buyer record to the session if it is not already present,
 * and sets it as the active buyer.
 */
export function addBuyerToSession(address: string, buyer: BuyerRecord): void {
  const existing = readPayerSession(address) ?? {
    buyers: [],
    activeBuyerAddress: null,
    operatorConsented: false,
  }

  const alreadyExists = existing.buyers.some(
    (b) => b.address.toLowerCase() === buyer.address.toLowerCase(),
  )

  const updatedBuyers = alreadyExists
    ? existing.buyers.map((b) =>
        b.address.toLowerCase() === buyer.address.toLowerCase() ? { ...b, ...buyer } : b,
      )
    : [...existing.buyers, buyer]

  payerWalletSessions.set(payerSessionKey(address), {
    ...existing,
    buyers: updatedBuyers,
    activeBuyerAddress: buyer.address,
  })
}

/**
 * Returns the active buyer record from the session, or null if none exists.
 */
export function getActiveBuyer(address: string | null): BuyerRecord | null {
  const session = readPayerSession(address)
  if (!session?.activeBuyerAddress) return null
  return (
    session.buyers.find(
      (b) => b.address.toLowerCase() === session.activeBuyerAddress!.toLowerCase(),
    ) ?? null
  )
}

/**
 * Returns the fields derived from the active buyer for state initialization.
 * Keeps the same interface shape as the former `patchPayerSessionFields` so
 * existing call-sites continue to work.
 */
export function patchPayerSessionFields(address: string | null): {
  buyerPubKey?: string | null
  buyerPrvKey: string | null
  operatorConsented: boolean
  buyers: BuyerRecord[]
  activeBuyerAddress: string | null
} {
  const session = readPayerSession(address)
  if (!session) {
    return {
      buyerPrvKey: null,
      operatorConsented: false,
      buyers: [],
      activeBuyerAddress: null,
    }
  }

  const active = session.activeBuyerAddress
    ? session.buyers.find(
        (b) => b.address.toLowerCase() === session.activeBuyerAddress!.toLowerCase(),
      )
    : null

  return {
    buyerPubKey: active?.address ?? null,
    buyerPrvKey: active?.privateKey ?? null,
    operatorConsented: session.operatorConsented,
    buyers: session.buyers,
    activeBuyerAddress: session.activeBuyerAddress ?? null,
  }
}

export function addressesMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  return payerSessionKey(a) === payerSessionKey(b)
}
