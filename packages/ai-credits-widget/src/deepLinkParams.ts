export type DeepLinkParams = {
  signerAddress: string
  operatorSignature: string
}

export type DeepLinkParseResult =
  | { status: 'absent' }
  | { status: 'partial'; present: 'signerAddress' | 'operatorSignature' }
  | { status: 'invalid'; reason: string }
  | { status: 'complete'; value: DeepLinkParams; source: 'url' | 'storage' }

const BUYER_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/
const OPERATOR_SIGNATURE_RE = /^0x[0-9a-fA-F]{128}([0-9a-fA-F]{2})?$/
const DEEP_LINK_STORAGE_KEY = 'goodwidget.ai-credits.deepLink'

export const DEEP_LINK_MANUAL_FALLBACK_HINT =
  'Generate or import a signer key manually to continue.'

export function isValidSignerAddress(value: string): boolean {
  return BUYER_ADDRESS_RE.test(value.trim())
}

export function isValidOperatorSignature(value: string): boolean {
  return OPERATOR_SIGNATURE_RE.test(value.trim())
}

export function deepLinkManualFallbackMessage(reason: string): string {
  return `${reason} ${DEEP_LINK_MANUAL_FALLBACK_HINT}`
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readStoredDeepLinkParams(): DeepLinkParams | null {
  if (!canUseLocalStorage()) return null
  try {
    const raw = window.localStorage.getItem(DEEP_LINK_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<DeepLinkParams>
    const signerAddress = typeof parsed.signerAddress === 'string' ? parsed.signerAddress.trim() : ''
    const operatorSignature =
      typeof parsed.operatorSignature === 'string' ? parsed.operatorSignature.trim() : ''
    if (!isValidSignerAddress(signerAddress) || !isValidOperatorSignature(operatorSignature)) {
      clearStoredDeepLinkParams()
      return null
    }
    return { signerAddress, operatorSignature }
  } catch {
    clearStoredDeepLinkParams()
    return null
  }
}

export function storeDeepLinkParams(value: DeepLinkParams): void {
  if (!canUseLocalStorage()) return
  try {
    window.localStorage.setItem(
      DEEP_LINK_STORAGE_KEY,
      JSON.stringify({
        signerAddress: value.signerAddress.trim(),
        operatorSignature: value.operatorSignature.trim(),
      }),
    )
  } catch {
    return
  }
}

export function clearStoredDeepLinkParams(): void {
  if (!canUseLocalStorage()) return
  try {
    window.localStorage.removeItem(DEEP_LINK_STORAGE_KEY)
  } catch {
    return
  }
}

export function parseDeepLinkParams(
  search: string | URLSearchParams = typeof window !== 'undefined' ? window.location.search : '',
): DeepLinkParseResult {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const signerAddress = params.get('signerAddress')?.trim() ?? ''
  const operatorSignature = params.get('operatorSignature')?.trim() ?? ''

  const hasSigner = signerAddress.length > 0
  const hasSignature = operatorSignature.length > 0

  if (!hasSigner && !hasSignature) return { status: 'absent' }
  if (hasSigner && !hasSignature) return { status: 'partial', present: 'signerAddress' }
  if (!hasSigner && hasSignature) return { status: 'partial', present: 'operatorSignature' }

  if (!isValidSignerAddress(signerAddress)) {
    return { status: 'invalid', reason: 'Deep-link signerAddress is invalid' }
  }
  if (!isValidOperatorSignature(operatorSignature)) {
    return {
      status: 'invalid',
      reason: 'Deep-link operatorSignature is invalid',
    }
  }

  return {
    status: 'complete',
    source: 'url',
    value: {
      signerAddress,
      operatorSignature,
    },
  }
}

/**
 * Prefer live URL params; persist complete pairs to localStorage for refresh.
 * If the URL has no deep-link params, fall back to a previously stored pair.
 */
export function resolveDeepLinkParams(
  search: string | URLSearchParams = typeof window !== 'undefined' ? window.location.search : '',
): DeepLinkParseResult {
  const fromUrl = parseDeepLinkParams(search)
  if (fromUrl.status === 'complete') {
    storeDeepLinkParams(fromUrl.value)
    return fromUrl
  }
  if (fromUrl.status === 'partial' || fromUrl.status === 'invalid') {
    return fromUrl
  }

  const stored = readStoredDeepLinkParams()
  if (!stored) return { status: 'absent' }
  return { status: 'complete', source: 'storage', value: stored }
}

export function stripDeepLinkParamsFromUrl(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (!url.searchParams.has('signerAddress') && !url.searchParams.has('operatorSignature')) {
    return
  }
  url.searchParams.delete('signerAddress')
  url.searchParams.delete('operatorSignature')
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(window.history.state, '', next)
}

export function clearDeepLinkArtifacts(): void {
  clearStoredDeepLinkParams()
  stripDeepLinkParamsFromUrl()
}
