export type PayerWalletSession = {
  buyerKey: string
  buyerKeyPrivate: string
  buyerKeyConfirmed: boolean
}

const payerWalletSessions = new Map<string, PayerWalletSession>()

function payerSessionKey(address: string): string {
  return address.toLowerCase()
}

export function readPayerSession(address: string | null): PayerWalletSession | null {
  if (!address) return null
  return payerWalletSessions.get(payerSessionKey(address)) ?? null
}

export function writePayerSession(address: string, session: PayerWalletSession): void {
  payerWalletSessions.set(payerSessionKey(address), session)
}

export function patchPayerSessionFields(address: string | null): {
  buyerKey?: string | null
  buyerKeyPrivate: string | null
  buyerKeyConfirmed: boolean
} {
  const session = readPayerSession(address)
  if (!session) {
    return {
      buyerKeyPrivate: null,
      buyerKeyConfirmed: false,
    }
  }
  return {
    buyerKey: session.buyerKey,
    buyerKeyPrivate: session.buyerKeyPrivate,
    buyerKeyConfirmed: session.buyerKeyConfirmed,
  }
}

export function addressesMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  return payerSessionKey(a) === payerSessionKey(b)
}
