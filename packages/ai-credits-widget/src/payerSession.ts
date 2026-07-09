export type PayerWalletSession = {
  buyerPubKey?: string
  buyerPrvKey?: string
  operatorConsented: boolean
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
    operatorConsented: false,
    ...existing,
    ...patch,
  })
}

export function patchPayerSessionFields(address: string | null): {
  buyerPubKey?: string | null
  buyerPrvKey: string | null
  operatorConsented: boolean
} {
  const session = readPayerSession(address)
  if (!session) {
    return {
      buyerPrvKey: null,
      operatorConsented: false,
    }
  }
  return {
    buyerPubKey: session.buyerPubKey,
    buyerPrvKey: session.buyerPrvKey ?? null,
    operatorConsented: session.operatorConsented,
  }
}

export function addressesMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  return payerSessionKey(a) === payerSessionKey(b)
}
