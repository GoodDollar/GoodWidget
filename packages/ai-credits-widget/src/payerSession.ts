export type PayerWalletSession = {
  buyerKey?: string
  buyerKeyPrivate?: string
  buyerKeyConfirmed: boolean
  operatorConsentSigned: boolean
}

const payerWalletSessions = new Map<string, PayerWalletSession>()

function payerSessionKey(address: string): string {
  return address.toLowerCase()
}

export function readPayerSession(address: string | null): PayerWalletSession | null {
  if (!address) return null
  return payerWalletSessions.get(payerSessionKey(address)) ?? null
}

export function patchPayerSession(address: string, patch: Partial<PayerWalletSession>): void {
  const existing = readPayerSession(address)
  payerWalletSessions.set(payerSessionKey(address), {
    buyerKeyConfirmed: false,
    operatorConsentSigned: false,
    ...existing,
    ...patch,
  })
}

export function patchPayerSessionFields(address: string | null): {
  buyerKey?: string | null
  buyerKeyPrivate: string | null
  buyerKeyConfirmed: boolean
  operatorConsentSigned: boolean
} {
  const session = readPayerSession(address)
  if (!session) {
    return {
      buyerKeyPrivate: null,
      buyerKeyConfirmed: false,
      operatorConsentSigned: false,
    }
  }
  return {
    buyerKey: session.buyerKey,
    buyerKeyPrivate: session.buyerKeyPrivate ?? null,
    buyerKeyConfirmed: session.buyerKeyConfirmed,
    operatorConsentSigned: session.operatorConsentSigned,
  }
}

export function addressesMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  return payerSessionKey(a) === payerSessionKey(b)
}
