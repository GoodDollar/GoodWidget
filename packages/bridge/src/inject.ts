/**
 * Provider injection utilities.
 *
 * Injects the bridge provider as `window.ethereum`, `window.goodWidget.provider`,
 * and announces it via EIP-6963 so modern dapps can discover it.
 */

import type { EIP1193Provider } from '@goodwidget/core'

// ── EIP-6963 types ─────────────────────────────────────────────────

export interface EIP6963ProviderInfo {
  uuid: string
  name: string
  icon: string
  rdns: string
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo
  provider: EIP1193Provider
}

export interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: 'eip6963:announceProvider'
  detail: EIP6963ProviderDetail
}

// ── Default metadata ───────────────────────────────────────────────

const DEFAULT_PROVIDER_INFO: EIP6963ProviderInfo = {
  uuid: crypto?.randomUUID?.() ?? `gw-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: 'GoodWidget Bridge',
  icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%2300AEFF"/><text x="16" y="22" text-anchor="middle" font-size="18" fill="white">G</text></svg>',
  rdns: 'org.gooddollar.goodwidget.bridge',
}

// ── Injection ──────────────────────────────────────────────────────

export interface InjectOptions {
  /** Set to false to skip injecting window.ethereum (default true) */
  injectEthereum?: boolean
  /** Set to true to also expose window.goodWidget.provider (default true) */
  injectGoodWidgetAlias?: boolean
  /** EIP-6963 behavior: 'announce' dispatches the provider announcement event (default 'announce') */
  eip6963?: 'announce' | 'none'
  /** Custom EIP-6963 metadata to override defaults */
  providerInfo?: Partial<EIP6963ProviderInfo>
}

/**
 * Inject a bridge provider into the current window context.
 *
 * This makes it available to any dapp running in this context via:
 * - window.ethereum (legacy)
 * - window.goodWidget.provider (GoodWidget alias)
 * - EIP-6963 announceProvider event (modern discovery)
 */
export function injectBridgeProvider(
  provider: EIP1193Provider,
  options: InjectOptions = {},
): void {
  const {
    injectEthereum = true,
    injectGoodWidgetAlias = true,
    eip6963 = 'announce',
    providerInfo,
  } = options

  if (typeof window === 'undefined') return

  const win = window as unknown as Record<string, unknown>

  if (injectEthereum) {
    win.ethereum = provider
  }

  if (injectGoodWidgetAlias) {
    const gw = (win.goodWidget as Record<string, unknown> | undefined) ?? {}
    gw.provider = provider
    win.goodWidget = gw
  }

  if (eip6963 === 'announce') {
    announceEIP6963(provider, providerInfo)
  }
}

// ── EIP-6963 announce/request ──────────────────────────────────────

function announceEIP6963(
  provider: EIP1193Provider,
  infoOverride?: Partial<EIP6963ProviderInfo>,
): void {
  if (typeof window === 'undefined') return

  const info: EIP6963ProviderInfo = { ...DEFAULT_PROVIDER_INFO, ...infoOverride }
  const detail: EIP6963ProviderDetail = { info, provider }

  const announce = () => {
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: Object.freeze(detail),
      }),
    )
  }

  announce()

  window.addEventListener('eip6963:requestProvider', announce)
}

/**
 * Listen for EIP-6963 provider announcements and return the first matching provider.
 * Useful on the child side to discover a bridge-injected provider.
 */
export function discoverEIP6963Provider(
  filter?: { rdns?: string },
  timeoutMs = 2000,
): Promise<EIP6963ProviderDetail | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null)
      return
    }

    const timer = setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', handler as EventListener)
      resolve(null)
    }, timeoutMs)

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<EIP6963ProviderDetail>).detail
      if (!detail?.provider) return

      if (filter?.rdns && detail.info.rdns !== filter.rdns) return

      clearTimeout(timer)
      window.removeEventListener('eip6963:announceProvider', handler as EventListener)
      resolve(detail)
    }

    window.addEventListener('eip6963:announceProvider', handler as EventListener)
    window.dispatchEvent(new Event('eip6963:requestProvider'))
  })
}
