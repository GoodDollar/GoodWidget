export type SignerKeyEntry = {
  privateKey?: string
  operatorSignature?: string
  operatorConsented?: boolean
}

export type PayerWalletSession = {
  signerKeys: Record<string, SignerKeyEntry>
  knownSigners: string[]
  activeSignerAddress: string | null
  derivedSignerAddress: string | null
}

export type SignerStateFields = {
  signers: string[]
  signerPubKey: string | null
  signerPrvKey: string | null
  operatorSignature: string | null
  operatorConsented: boolean
  derivedSignerAddress: string | null
}

const STORAGE_KEY_PREFIX = 'goodwidget.ai-credits.payerSession.'

function payerSessionKey(address: string): string {
  return address.toLowerCase()
}

function normalizeSignerAddress(address: string): string {
  return address.toLowerCase()
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function formatSignerAddress(address: string): string {
  const key = normalizeSignerAddress(address)
  return key.startsWith('0x') ? `0x${key.slice(2)}` : key
}

function emptySession(): PayerWalletSession {
  return {
    signerKeys: {},
    knownSigners: [],
    activeSignerAddress: null,
    derivedSignerAddress: null,
  }
}

function isSignerKeyEntry(value: unknown): value is SignerKeyEntry {
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
    known.add(normalizeSignerAddress(address))
  }

  if (typeof raw.signerPubKey === 'string' && raw.signerPubKey) {
    const address = normalizeSignerAddress(raw.signerPubKey)
    session.activeSignerAddress = address
    session.derivedSignerAddress = address
    trackKnown(address)
    if (typeof raw.signerPrvKey === 'string' && raw.signerPrvKey) {
      session.signerKeys[address] = { privateKey: raw.signerPrvKey }
    }
  }

  if (Array.isArray(raw.signers)) {
    for (const item of raw.signers) {
      if (typeof item === 'string' && item) {
        trackKnown(item)
        continue
      }
      if (!item || typeof item !== 'object') continue
      const signer = item as Record<string, unknown>
      if (typeof signer.address !== 'string' || !signer.address) continue
      const address = normalizeSignerAddress(signer.address)
      trackKnown(address)
      const entry: SignerKeyEntry = {}
      if (typeof signer.privateKey === 'string' && signer.privateKey) {
        entry.privateKey = signer.privateKey
      }
      if (typeof signer.operatorSignature === 'string' && signer.operatorSignature) {
        entry.operatorSignature = signer.operatorSignature
      }
      if (typeof signer.operatorConsented === 'boolean') {
        entry.operatorConsented = signer.operatorConsented
      }
      if (entry.privateKey || entry.operatorSignature || entry.operatorConsented !== undefined) {
        session.signerKeys[address] = {
          ...session.signerKeys[address],
          ...entry,
        }
      }
      if (signer.type === 'derived' && entry.privateKey) {
        session.derivedSignerAddress = address
      }
    }
  }

  if (Array.isArray(raw.knownSigners)) {
    for (const item of raw.knownSigners) {
      if (typeof item === 'string' && item) trackKnown(item)
    }
  }

  if (typeof raw.activeSignerAddress === 'string' && raw.activeSignerAddress) {
    session.activeSignerAddress = normalizeSignerAddress(raw.activeSignerAddress)
    trackKnown(session.activeSignerAddress)
  }
  if (typeof raw.derivedSignerAddress === 'string' && raw.derivedSignerAddress) {
    session.derivedSignerAddress = normalizeSignerAddress(raw.derivedSignerAddress)
    trackKnown(session.derivedSignerAddress)
  }
  if (typeof raw.operatorSignature === 'string' && raw.operatorSignature && session.activeSignerAddress) {
    const active = session.activeSignerAddress
    session.signerKeys[active] = {
      ...session.signerKeys[active],
      operatorSignature: raw.operatorSignature,
    }
  }

  if (raw.signerKeys && typeof raw.signerKeys === 'object') {
    for (const [address, entry] of Object.entries(raw.signerKeys as Record<string, unknown>)) {
      if (!isSignerKeyEntry(entry)) continue
      const key = normalizeSignerAddress(address)
      trackKnown(key)
      session.signerKeys[key] = {
        ...session.signerKeys[key],
        ...entry,
      }
    }
  }

  if (typeof raw.operatorConsented === 'boolean' && raw.operatorConsented && session.activeSignerAddress) {
    const active = session.activeSignerAddress
    session.signerKeys[active] = {
      ...session.signerKeys[active],
      operatorConsented: true,
    }
  }

  session.knownSigners = [...known].map((key) => formatSignerAddress(key))
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
  if (!address || !canUseLocalStorage()) return null
  try {
    const raw = window.localStorage.getItem(
      `${STORAGE_KEY_PREFIX}${payerSessionKey(address)}`,
    )
    if (!raw) return null
    return parseStoredSession(raw)
  } catch {
    return null
  }
}

export function patchPayerSession(address: string, patch: Partial<PayerWalletSession>): void {
  const existing = readPayerSession(address) ?? emptySession()
  persistSession(address, {
    ...existing,
    ...patch,
    signerKeys: patch.signerKeys ?? existing.signerKeys,
    knownSigners: patch.knownSigners ?? existing.knownSigners,
  })
}

export function getSignerKeyEntry(payer: string, signerAddress: string): SignerKeyEntry | null {
  const session = readPayerSession(payer)
  if (!session) return null
  return session.signerKeys[normalizeSignerAddress(signerAddress)] ?? null
}

export function setSignerOperatorConsented(
  payer: string,
  signerAddress: string,
  operatorConsented: boolean,
): void {
  upsertSignerKey(payer, signerAddress, { operatorConsented }, { setActive: false })
}

export function upsertSignerKey(
  payer: string,
  signerAddress: string,
  entry: SignerKeyEntry,
  options?: { setActive?: boolean; setDerived?: boolean },
): PayerWalletSession {
  const existing = readPayerSession(payer) ?? emptySession()
  const key = normalizeSignerAddress(signerAddress)
  const previous = existing.signerKeys[key] ?? {}
  const knownSigners = mergeSignerAddressList(existing.knownSigners, key)
  const next: PayerWalletSession = {
    ...existing,
    knownSigners,
    signerKeys: {
      ...existing.signerKeys,
      [key]: {
        privateKey: entry.privateKey ?? previous.privateKey,
        operatorSignature: entry.operatorSignature ?? previous.operatorSignature,
        operatorConsented:
          entry.operatorConsented !== undefined
            ? entry.operatorConsented
            : previous.operatorConsented,
      },
    },
    activeSignerAddress: options?.setActive === false ? existing.activeSignerAddress : key,
    derivedSignerAddress: options?.setDerived ? key : existing.derivedSignerAddress,
  }
  persistSession(payer, next)
  return next
}

export function setActiveSignerAddress(payer: string, signerAddress: string | null): PayerWalletSession {
  const existing = readPayerSession(payer) ?? emptySession()
  const normalized = signerAddress ? normalizeSignerAddress(signerAddress) : null
  const next: PayerWalletSession = {
    ...existing,
    knownSigners: normalized
      ? mergeSignerAddressList(existing.knownSigners, normalized)
      : existing.knownSigners,
    activeSignerAddress: normalized,
  }
  persistSession(payer, next)
  return next
}

export function mergeSignerAddressList(
  existingSigners: string[],
  ...extras: Array<string | null | undefined>
): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const address of [...existingSigners, ...extras]) {
    if (!address) continue
    const key = normalizeSignerAddress(address)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(formatSignerAddress(key))
  }

  return result
}

export function normalizeSignerAddressList(
  signers: Array<string | { address: string }> | undefined | null,
): string[] {
  if (!signers || signers.length === 0) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of signers) {
    const address = typeof item === 'string' ? item : item.address
    if (!address) continue
    const key = normalizeSignerAddress(address)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(formatSignerAddress(key))
  }
  return result
}

export function listKnownSignerAddresses(payer: string): string[] {
  const session = readPayerSession(payer)
  if (!session) return []
  return mergeSignerAddressList(
    session.knownSigners,
    ...Object.keys(session.signerKeys),
    session.activeSignerAddress,
    session.derivedSignerAddress,
  )
}

export function rememberSignerAddresses(
  payer: string,
  addresses: Array<string | null | undefined>,
): string[] {
  const existing = readPayerSession(payer) ?? emptySession()
  const knownSigners = mergeSignerAddressList(existing.knownSigners, ...addresses)
  if (
    knownSigners.length === existing.knownSigners.length &&
    knownSigners.every(
      (address, index) => address.toLowerCase() === existing.knownSigners[index]?.toLowerCase(),
    )
  ) {
    return listKnownSignerAddresses(payer)
  }
  persistSession(payer, { ...existing, knownSigners })
  return listKnownSignerAddresses(payer)
}

export function buildSignerStateFields(
  payer: string,
  signers: string[],
  selectedAddress: string | null,
): SignerStateFields {
  const session = readPayerSession(payer)
  const entry = selectedAddress ? getSignerKeyEntry(payer, selectedAddress) : null
  return {
    signers,
    signerPubKey: selectedAddress,
    signerPrvKey: entry?.privateKey ?? null,
    operatorSignature: entry?.operatorSignature ?? null,
    operatorConsented: Boolean(entry?.operatorConsented),
    derivedSignerAddress: session?.derivedSignerAddress ?? null,
  }
}

export function patchPayerSessionFields(address: string | null): {
  signerPubKey: string | null
  signerPrvKey: string | null
  operatorSignature: string | null
  operatorConsented: boolean
  activeSignerAddress: string | null
  derivedSignerAddress: string | null
} {
  const session = readPayerSession(address)
  if (!session) {
    return {
      signerPubKey: null,
      signerPrvKey: null,
      operatorSignature: null,
      operatorConsented: false,
      activeSignerAddress: null,
      derivedSignerAddress: null,
    }
  }

  const active = session.activeSignerAddress
  const entry = active ? session.signerKeys[normalizeSignerAddress(active)] : undefined

  return {
    signerPubKey: active,
    signerPrvKey: entry?.privateKey ?? null,
    operatorSignature: entry?.operatorSignature ?? null,
    operatorConsented: Boolean(entry?.operatorConsented),
    activeSignerAddress: active,
    derivedSignerAddress: session.derivedSignerAddress,
  }
}

export function addressesMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  return payerSessionKey(a) === payerSessionKey(b)
}
