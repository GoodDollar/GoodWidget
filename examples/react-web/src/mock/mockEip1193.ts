/**
 * Mock EIP-1193 provider for demo and Playwright testing purposes.
 *
 * This provider simulates a connected wallet with a stable, deterministic
 * address and chain ID so demo pages render wallet-aware components in a
 * "connected" state without requiring a real browser wallet.
 *
 * It is ONLY used in the demo app (`examples/react-web`).
 * It does NOT simulate real transaction signing or RPC calls.
 *
 * Stable demo values:
 *   address : 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045  (well-known demo address)
 *   chainId : 42220  (Celo mainnet — GoodDollar's primary chain)
 */

/** The deterministic demo wallet address. */
export const MOCK_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

/** The deterministic demo chain ID (Celo mainnet). */
export const MOCK_CHAIN_ID = 42220

// Converts a number to a 0x-prefixed hex string as required by the EIP-1193 spec.
function toHex(n: number): string {
  return '0x' + n.toString(16)
}

type EventCallback = (...args: unknown[]) => void

/**
 * Creates a minimal EIP-1193-compatible provider that always reports the
 * demo address and chain.  Used to pass as the `provider` prop to
 * `GoodWidgetProvider` so wallet-aware components render in a connected state.
 *
 * @example
 * ```tsx
 * import { createMockEip1193Provider } from '../mock/mockEip1193'
 *
 * <GoodWidgetProvider provider={createMockEip1193Provider()} defaultTheme="light">
 *   <WalletInfo />
 * </GoodWidgetProvider>
 * ```
 */
export function createMockEip1193Provider() {
  // Internal event-listener registry (mimics EventEmitter interface on providers)
  const listeners: Record<string, EventCallback[]> = {}

  return {
    // ------------------------------------------------------------------ events
    on(event: string, fn: EventCallback) {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(fn)
    },

    removeListener(event: string, fn: EventCallback) {
      if (!listeners[event]) return
      listeners[event] = listeners[event].filter((cb) => cb !== fn)
    },

    // ----------------------------------------------------------------- request
    /**
     * Handles a subset of EIP-1193 JSON-RPC methods needed to put the app
     * in a "wallet connected" state.  Unsupported methods reject so the
     * provider behaves honestly rather than silently swallowing errors.
     */
    async request({ method }: { method: string }): Promise<unknown> {
      switch (method) {
        // Return the single mock account
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return [MOCK_ADDRESS]

        // Return the chain ID in 0x-hex format (EIP-1193 spec)
        case 'eth_chainId':
          return toHex(MOCK_CHAIN_ID)

        // net_version returns chain ID as a decimal string
        case 'net_version':
          return String(MOCK_CHAIN_ID)

        default:
          throw new Error(`Mock provider: unsupported method "${method}"`)
      }
    },
  }
}
