export type DeepLinkParams = {
  buyerAddress: string
  operatorSignature: string
}

export type DeepLinkParseResult =
  | { status: 'absent' }
  | { status: 'partial'; present: 'buyerAddress' | 'operatorSignature' }
  | { status: 'invalid'; reason: string }
  | { status: 'complete'; value: DeepLinkParams }

const BUYER_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/
const OPERATOR_SIGNATURE_RE = /^0x[0-9a-fA-F]{128}([0-9a-fA-F]{2})?$/

export function isValidBuyerAddress(value: string): boolean {
  return BUYER_ADDRESS_RE.test(value.trim())
}

export function isValidOperatorSignature(value: string): boolean {
  return OPERATOR_SIGNATURE_RE.test(value.trim())
}

export function parseDeepLinkParams(
  search: string | URLSearchParams = typeof window !== 'undefined' ? window.location.search : '',
): DeepLinkParseResult {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const buyerAddress = params.get('buyerAddress')?.trim() ?? ''
  const operatorSignature = params.get('operatorSignature')?.trim() ?? ''

  const hasBuyer = buyerAddress.length > 0
  const hasSignature = operatorSignature.length > 0

  if (!hasBuyer && !hasSignature) return { status: 'absent' }
  if (hasBuyer && !hasSignature) return { status: 'partial', present: 'buyerAddress' }
  if (!hasBuyer && hasSignature) return { status: 'partial', present: 'operatorSignature' }

  if (!isValidBuyerAddress(buyerAddress)) {
    return { status: 'invalid', reason: 'Deep-link buyerAddress is invalid' }
  }
  if (!isValidOperatorSignature(operatorSignature)) {
    return {
      status: 'invalid',
      reason: 'Deep-link operatorSignature is invalid',
    }
  }

  return {
    status: 'complete',
    value: {
      buyerAddress,
      operatorSignature,
    },
  }
}

export function stripDeepLinkParamsFromUrl(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (!url.searchParams.has('buyerAddress') && !url.searchParams.has('operatorSignature')) {
    return
  }
  url.searchParams.delete('buyerAddress')
  url.searchParams.delete('operatorSignature')
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(window.history.state, '', next)
}
