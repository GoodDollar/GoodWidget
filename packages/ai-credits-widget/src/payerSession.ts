export type BuyerKeyEntry = {
  privateKey?: string
  operatorSignature?: string
}

export type PayerWalletSession = {
  buyerKeys: Record<string, BuyerKeyEntry>
  activeBuyerAddress: string | null
  derivedBuyerAddress: string | null
  operatorConsented: boolean
}

const MEMORY_SESSIONS = new Map<string, PayerWalletSession>()
const STORAGE_KEY_PREFIX = 'goodwidget.ai-credits.payerSession.'

function payerSessionKey(address: string): string {
  return address.toLowerCase()
}

function normalizeBuyerAddress(address: string): string {
  return address.toLowerCase()
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function emptySession(): PayerWalletSession {
  return {
    buyerKeys: {},
    activeBuyerAddress: null,
    derivedBuyerAddress: null,
    operatorConsented: false,
  }
}

function isBuyerKeyEntry(value: unknown): value is BuyerKeyEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return (
    (entry.privateKey === undefined || typeof entry.privateKey === 'string') &&
    (entry.operatorSignature === undefined || typeof entry.operatorSignature === 'string')
  )
}

function migrateLegacySession(raw: Record<string, unknown>): PayerWalletSession {
  const session = emptySession()

  if (typeof raw.buyerPubKey === 'string' && raw.buyerPubKey) {
    const address = normalizeBuyerAddress(raw.buyerPubKey)
    session.activeBuyerAddress = address
    session.derivedBuyerAddress = address
    if (typeof raw.buyerPrvKey === 'string' && raw.buyerPrvKey) {
      session.buyerKeys[address] = { privateKey: raw.buyerPrvKey }
    }
  }

  if (Array.isArray(raw.buyers)) {
    for (const item of raw.buyers) {
      if (!item || typeof item !== 'object') continue
      const buyer = item as Record<string, unknown>
      if (typeof buyer.address !== 'string' || !buyer.address) continue
      const address = normalizeBuyerAddress(buyer.address)
      const entry: BuyerKeyEntry = {}
      if (typeof buyer.privateKey === 'string' && buyer.privateKey) {
        entry.privateKey = buyer.privateKey
      }
      if (typeof buyer.operatorSignature === 'string' && buyer.operatorSignature) {
        entry.operatorSignature = buyer.operatorSignature
      }
      if (entry.privateKey || entry.operatorSignature) {
        session.buyerKeys[address] = {
          ...session.buyerKeys[address],
          ...entry,
        }
      }
      if (buyer.type === 'derived' && entry.privateKey) {
        session.derivedBuyerAddress = address
      }
    }
  }

  if (typeof raw.activeBuyerAddress === 'string' && raw.activeBuyerAddress) {
    session.activeBuyerAddress = normalizeBuyerAddress(raw.activeBuyerAddress)
  }
  if (typeof raw.derivedBuyerAddress === 'string' && raw.derivedBuyerAddress) {
    session.derivedBuyerAddress = normalizeBuyerAddress(raw.derivedBuyerAddress)
  }
  if (typeof raw.operatorConsented === 'boolean') {
    session.operatorConsented = raw.operatorConsented
  }
  if (typeof raw.operatorSignature === 'string' && raw.operatorSignature && session.activeBuyerAddress) {
    const active = session.activeBuyerAddress
    session.buyerKeys[active] = {
      ...session.buyerKeys[active],
      operatorSignature: raw.operatorSignature,
    }
  }

  if (raw.buyerKeys && typeof raw.buyerKeys === 'object') {
    for (const [address, entry] of Object.entries(raw.buyerKeys as Record<string, unknown>)) {
      if (!isBuyerKeyEntry(entry)) continue
      const key = normalizeBuyerAddress(address)
      session.buyerKeys[key] = {
        ...session.buyerKeys[key],
        ...entry,
      }
    }
  }

  return session
}

function parseStoredSession(raw: string): PayerWalletSession | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (parsed.buyerKeys && typeof parsed.buyerKeys === 'object' && !Array.isArray(parsed.buyers)) {
      return migrateLegacySession(parsed)
    }
    return migrateLegacySession(parsed)
  } catch {
    return null
  }
}

function persistSession(address: string, session: PayerWalletSession): void {
  MEMORY_SESSIONS.set(payerSessionKey(address), session)
  if (!canUseLocalStorage()) return
  try {
    window.localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${payerSessionKey(address)}`,
      JSON.stringify(session),
    )
  } catch {
    return
  }
}

export function readPayerSession(address: string | null): PayerWalletSession | null {
  if (!address) return null
  const key = payerSessionKey(address)
  const cached = MEMORY_SESSIONS.get(key)
  if (cached) return cached

  if (canUseLocalStorage()) {
    try {
      const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`)
      if (raw) {
        const parsed = parseStoredSession(raw)
        if (parsed) {
          MEMORY_SESSIONS.set(key, parsed)
          return parsed
        }
      }
    } catch {
      return null
    }
  }

  return null
}

export function patchPayerSession(address: string, patch: Partial<PayerWalletSession>): void {
  const existing = readPayerSession(address) ?? emptySession()
  persistSession(address, {
    ...existing,
    ...patch,
    buyerKeys: patch.buyerKeys ?? existing.buyerKeys,
  })
}

export function getBuyerKeyEntry(payer: string, buyerAddress: string): BuyerKeyEntry | null {
  const session = readPayerSession(payer)
  if (!session) return null
  return session.buyerKeys[normalizeBuyerAddress(buyerAddress)] ?? null
}

export function upsertBuyerKey(
  payer: string,
  buyerAddress: string,
  entry: BuyerKeyEntry,
  options?: { setActive?: boolean; setDerived?: boolean },
): PayerWalletSession {
  const existing = readPayerSession(payer) ?? emptySession()
  const key = normalizeBuyerAddress(buyerAddress)
  const previous = existing.buyerKeys[key] ?? {}
  const next: PayerWalletSession = {
    ...existing,
    buyerKeys: {
      ...existing.buyerKeys,
      [key]: {
        privateKey: entry.privateKey ?? previous.privateKey,
        operatorSignature: entry.operatorSignature ?? previous.operatorSignature,
      },
    },
    activeBuyerAddress: options?.setActive === false ? existing.activeBuyerAddress : key,
    derivedBuyerAddress: options?.setDerived ? key : existing.derivedBuyerAddress,
    operatorConsented: options?.setActive === false ? existing.operatorConsented : false,
  }
  persistSession(payer, next)
  return next
}

export function setActiveBuyerAddress(payer: string, buyerAddress: string | null): PayerWalletSession {
  const existing = readPayerSession(payer) ?? emptySession()
  const next: PayerWalletSession = {
    ...existing,
    activeBuyerAddress: buyerAddress ? normalizeBuyerAddress(buyerAddress) : null,
    operatorConsented: false,
  }
  persistSession(payer, next)
  return next
}

export function mergeBuyerAddressList(
  backendBuyers: string[],
  ...extras: Array<string | null | undefined>
): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const address of [...backendBuyers, ...extras]) {
    if (!address) continue
    const key = normalizeBuyerAddress(address)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(address.startsWith('0x') ? `0x${key.slice(2)}` : key)
  }

  return result
}

export function normalizeBuyerAddressList(buyers: Array<string | { address: string }> | undefined | null): string[] {
  if (!buyers || buyers.length === 0) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of buyers) {
    const address = typeof item === 'string' ? item : item.address
    if (!address) continue
    const key = normalizeBuyerAddress(address)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(`0x${key.slice(2)}`)
  }
  return result
}

export function patchPayerSessionFields(address: string | null): {
  buyerPubKey: string | null
  buyerPrvKey: string | null
  operatorSignature: string | null
  operatorConsented: boolean
  activeBuyerAddress: string | null
  derivedBuyerAddress: string | null
} {
  const session = readPayerSession(address)
  if (!session) {
    return {
      buyerPubKey: null,
      buyerPrvKey: null,
      operatorSignature: null,
      operatorConsented: false,
      activeBuyerAddress: null,
      derivedBuyerAddress: null,
    }
  }

  const active = session.activeBuyerAddress
  const entry = active ? session.buyerKeys[normalizeBuyerAddress(active)] : undefined

  return {
    buyerPubKey: active,
    buyerPrvKey: entry?.privateKey ?? null,
    operatorSignature: entry?.operatorSignature ?? null,
    operatorConsented: session.operatorConsented,
    activeBuyerAddress: active,
    derivedBuyerAddress: session.derivedBuyerAddress,
  }
}

export function addressesMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  return payerSessionKey(a) === payerSessionKey(b)
}
