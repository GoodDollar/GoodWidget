export type BuyerKeyEntry = {
  privateKey?: string
  operatorSignature?: string
  operatorConsented?: boolean
}

export type PayerWalletSession = {
  buyerKeys: Record<string, BuyerKeyEntry>
  knownBuyers: string[]
  activeBuyerAddress: string | null
  derivedBuyerAddress: string | null
}

export type BuyerStateFields = {
  buyers: string[]
  buyerPubKey: string | null
  buyerPrvKey: string | null
  operatorSignature: string | null
  operatorConsented: boolean
  derivedBuyerAddress: string | null
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

function formatBuyerAddress(address: string): string {
  const key = normalizeBuyerAddress(address)
  return key.startsWith('0x') ? `0x${key.slice(2)}` : key
}

function emptySession(): PayerWalletSession {
  return {
    buyerKeys: {},
    knownBuyers: [],
    activeBuyerAddress: null,
    derivedBuyerAddress: null,
  }
}

function isBuyerKeyEntry(value: unknown): value is BuyerKeyEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return (
    (entry.privateKey === undefined || typeof entry.privateKey === 'string') &&
    (entry.operatorSignature === undefined || typeof entry.operatorSignature === 'string') &&
    (entry.operatorConsented === undefined || typeof entry.operatorConsented === 'boolean')
  )
}

function migrateLegacySession(raw: Record<string, unknown>): PayerWalletSession {
  const session = emptySession()
  const known = new Set<string>()

  const trackKnown = (address: string | null | undefined) => {
    if (!address) return
    known.add(normalizeBuyerAddress(address))
  }

  if (typeof raw.buyerPubKey === 'string' && raw.buyerPubKey) {
    const address = normalizeBuyerAddress(raw.buyerPubKey)
    session.activeBuyerAddress = address
    session.derivedBuyerAddress = address
    trackKnown(address)
    if (typeof raw.buyerPrvKey === 'string' && raw.buyerPrvKey) {
      session.buyerKeys[address] = { privateKey: raw.buyerPrvKey }
    }
  }

  if (Array.isArray(raw.buyers)) {
    for (const item of raw.buyers) {
      if (typeof item === 'string' && item) {
        trackKnown(item)
        continue
      }
      if (!item || typeof item !== 'object') continue
      const buyer = item as Record<string, unknown>
      if (typeof buyer.address !== 'string' || !buyer.address) continue
      const address = normalizeBuyerAddress(buyer.address)
      trackKnown(address)
      const entry: BuyerKeyEntry = {}
      if (typeof buyer.privateKey === 'string' && buyer.privateKey) {
        entry.privateKey = buyer.privateKey
      }
      if (typeof buyer.operatorSignature === 'string' && buyer.operatorSignature) {
        entry.operatorSignature = buyer.operatorSignature
      }
      if (typeof buyer.operatorConsented === 'boolean') {
        entry.operatorConsented = buyer.operatorConsented
      }
      if (entry.privateKey || entry.operatorSignature || entry.operatorConsented !== undefined) {
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

  if (Array.isArray(raw.knownBuyers)) {
    for (const item of raw.knownBuyers) {
      if (typeof item === 'string' && item) trackKnown(item)
    }
  }

  if (typeof raw.activeBuyerAddress === 'string' && raw.activeBuyerAddress) {
    session.activeBuyerAddress = normalizeBuyerAddress(raw.activeBuyerAddress)
    trackKnown(session.activeBuyerAddress)
  }
  if (typeof raw.derivedBuyerAddress === 'string' && raw.derivedBuyerAddress) {
    session.derivedBuyerAddress = normalizeBuyerAddress(raw.derivedBuyerAddress)
    trackKnown(session.derivedBuyerAddress)
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
      trackKnown(key)
      session.buyerKeys[key] = {
        ...session.buyerKeys[key],
        ...entry,
      }
    }
  }

  if (typeof raw.operatorConsented === 'boolean' && raw.operatorConsented && session.activeBuyerAddress) {
    const active = session.activeBuyerAddress
    session.buyerKeys[active] = {
      ...session.buyerKeys[active],
      operatorConsented: true,
    }
  }

  session.knownBuyers = [...known].map((key) => formatBuyerAddress(key))
  return session
}

function parseStoredSession(raw: string): PayerWalletSession | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
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
    knownBuyers: patch.knownBuyers ?? existing.knownBuyers,
  })
}

export function getBuyerKeyEntry(payer: string, buyerAddress: string): BuyerKeyEntry | null {
  const session = readPayerSession(payer)
  if (!session) return null
  return session.buyerKeys[normalizeBuyerAddress(buyerAddress)] ?? null
}

export function setBuyerOperatorConsented(
  payer: string,
  buyerAddress: string,
  operatorConsented: boolean,
): void {
  upsertBuyerKey(payer, buyerAddress, { operatorConsented }, { setActive: false })
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
  const knownBuyers = mergeBuyerAddressList(existing.knownBuyers, key)
  const next: PayerWalletSession = {
    ...existing,
    knownBuyers,
    buyerKeys: {
      ...existing.buyerKeys,
      [key]: {
        privateKey: entry.privateKey ?? previous.privateKey,
        operatorSignature: entry.operatorSignature ?? previous.operatorSignature,
        operatorConsented:
          entry.operatorConsented !== undefined
            ? entry.operatorConsented
            : previous.operatorConsented,
      },
    },
    activeBuyerAddress: options?.setActive === false ? existing.activeBuyerAddress : key,
    derivedBuyerAddress: options?.setDerived ? key : existing.derivedBuyerAddress,
  }
  persistSession(payer, next)
  return next
}

export function setActiveBuyerAddress(payer: string, buyerAddress: string | null): PayerWalletSession {
  const existing = readPayerSession(payer) ?? emptySession()
  const normalized = buyerAddress ? normalizeBuyerAddress(buyerAddress) : null
  const next: PayerWalletSession = {
    ...existing,
    knownBuyers: normalized
      ? mergeBuyerAddressList(existing.knownBuyers, normalized)
      : existing.knownBuyers,
    activeBuyerAddress: normalized,
  }
  persistSession(payer, next)
  return next
}

export function mergeBuyerAddressList(
  existingBuyers: string[],
  ...extras: Array<string | null | undefined>
): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const address of [...existingBuyers, ...extras]) {
    if (!address) continue
    const key = normalizeBuyerAddress(address)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(formatBuyerAddress(key))
  }

  return result
}

export function normalizeBuyerAddressList(
  buyers: Array<string | { address: string }> | undefined | null,
): string[] {
  if (!buyers || buyers.length === 0) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of buyers) {
    const address = typeof item === 'string' ? item : item.address
    if (!address) continue
    const key = normalizeBuyerAddress(address)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(formatBuyerAddress(key))
  }
  return result
}

export function listKnownBuyerAddresses(payer: string): string[] {
  const session = readPayerSession(payer)
  if (!session) return []
  return mergeBuyerAddressList(
    session.knownBuyers,
    ...Object.keys(session.buyerKeys),
    session.activeBuyerAddress,
    session.derivedBuyerAddress,
  )
}

export function rememberBuyerAddresses(
  payer: string,
  addresses: Array<string | null | undefined>,
): string[] {
  const existing = readPayerSession(payer) ?? emptySession()
  const knownBuyers = mergeBuyerAddressList(existing.knownBuyers, ...addresses)
  if (
    knownBuyers.length === existing.knownBuyers.length &&
    knownBuyers.every(
      (address, index) => address.toLowerCase() === existing.knownBuyers[index]?.toLowerCase(),
    )
  ) {
    return listKnownBuyerAddresses(payer)
  }
  persistSession(payer, { ...existing, knownBuyers })
  return listKnownBuyerAddresses(payer)
}

export function buildBuyerStateFields(
  payer: string,
  buyers: string[],
  selectedAddress: string | null,
): BuyerStateFields {
  const session = readPayerSession(payer)
  const entry = selectedAddress ? getBuyerKeyEntry(payer, selectedAddress) : null
  return {
    buyers,
    buyerPubKey: selectedAddress,
    buyerPrvKey: entry?.privateKey ?? null,
    operatorSignature: entry?.operatorSignature ?? null,
    operatorConsented: Boolean(entry?.operatorConsented),
    derivedBuyerAddress: session?.derivedBuyerAddress ?? null,
  }
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
    operatorConsented: Boolean(entry?.operatorConsented),
    activeBuyerAddress: active,
    derivedBuyerAddress: session.derivedBuyerAddress,
  }
}

export function addressesMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  return payerSessionKey(a) === payerSessionKey(b)
}
