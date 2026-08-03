/** Indicates how a buyer identity was created or loaded. */
export type BuyerIdentityType = 'derived' | 'imported' | 'deep-link'

/** A single buyer identity stored per payer session. */
export type BuyerRecord = {
  address: string
  /** Present for derived/imported buyers; absent for deep-link buyers. */
  privateKey?: string
  type: BuyerIdentityType
  label?: string
  /** Pre-signed operator-approval token (NCDI deep link). Never a private key. */
  operatorSignature?: string
}

export type PayerWalletSession = {
  buyers: BuyerRecord[]
  activeBuyerAddress: string | null
  operatorConsented: boolean
  operatorSignature?: string | null
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
              label: 'Wallet buyer',
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
    ? existing.buyers.map((b) => {
        if (b.address.toLowerCase() !== buyer.address.toLowerCase()) return b
        const privateKey = buyer.privateKey ?? b.privateKey
        return {
          ...b,
          ...buyer,
          privateKey,
          type: privateKey ? (buyer.privateKey ? buyer.type : b.type) : buyer.type ?? b.type,
          operatorSignature: buyer.operatorSignature ?? b.operatorSignature,
        }
      })
    : [...existing.buyers, buyer]

  payerWalletSessions.set(payerSessionKey(address), {
    ...existing,
    buyers: updatedBuyers,
    activeBuyerAddress: buyer.address,
    operatorSignature: buyer.operatorSignature ?? existing.operatorSignature ?? null,
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
