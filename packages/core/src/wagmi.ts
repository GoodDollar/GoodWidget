import type { EIP1193Provider } from './eip1193'
import { detectHost } from './detect'

export interface GoodWidgetConnectorOptions {
  provider?: EIP1193Provider
}

/**
 * Creates a wagmi-compatible connector descriptor for GoodWidget.
 * The connector auto-detects the host wallet environment and provides the resolved
 * EIP-1193 provider to wagmi. Use this as a drop-in connector:
 *
 * ```ts
 * import { goodWidgetConnector } from '@goodwidget/core/wagmi'
 * const config = createConfig({ connectors: [goodWidgetConnector()] })
 * ```
 *
 * This returns a plain object that can be adapted into a wagmi connector.
 * For full wagmi integration, consumers wrap this with createConnector().
 */
export function goodWidgetConnector(options?: GoodWidgetConnectorOptions) {
  let resolvedProvider: EIP1193Provider | null = options?.provider ?? null

  return {
    id: 'goodwidget',
    name: 'GoodWidget',
    type: 'goodwidget' as const,

    async getProvider(): Promise<EIP1193Provider> {
      if (resolvedProvider) return resolvedProvider

      const result = await detectHost()
      if (!result) throw new Error('No wallet provider found')
      resolvedProvider = result.provider
      return resolvedProvider
    },

    async getAccounts(): Promise<string[]> {
      const provider = await this.getProvider()
      const accounts = (await provider.request({ method: 'eth_accounts' })) as string[]
      return accounts
    },

    async getChainId(): Promise<number> {
      const provider = await this.getProvider()
      const chainId = (await provider.request({ method: 'eth_chainId' })) as string
      return parseInt(chainId, 16)
    },

    async connect(): Promise<{ accounts: string[]; chainId: number }> {
      const provider = await this.getProvider()
      const accounts = (await provider.request({
        method: 'eth_requestAccounts',
      })) as string[]
      const chainId = (await provider.request({ method: 'eth_chainId' })) as string
      return { accounts, chainId: parseInt(chainId, 16) }
    },

    async disconnect(): Promise<void> {
      resolvedProvider = null
    },
  }
}
