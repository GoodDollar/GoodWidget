import type { EIP1193Provider } from '@goodwidget/core'

declare global {
  interface Window {
    ethereum?: EIP1193Provider
  }
}

/**
 * Returns the browser-injected EIP-1193 provider (MetaMask, Rabby, etc).
 * This intentionally uses the provider directly (no wrapper) to match
 * standard dapp behavior for chain/account event handling.
 */
export function getInjectedEip1193Provider(): EIP1193Provider | undefined {
  if (typeof window === 'undefined') return undefined
  return window.ethereum
}

export function isInjectedProviderUsable(
  provider: EIP1193Provider | undefined,
): provider is EIP1193Provider {
  if (!provider) return false
  return typeof provider.request === 'function'
}

