import { createPublicClient, createWalletClient, http, type Chain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { EIP1193Provider } from '@goodwidget/core'

type EventCallback = (...args: unknown[]) => void

// ---------------------------------------------------------------------------
// Local manual-testing config:
// Replace this key with a funded test wallet private key for local use only.
// Never commit real production wallet keys.
// below key is randomely generated and is compromised, do not use for any real value
// ---------------------------------------------------------------------------
const CUSTODIAL_PRIVATE_KEY = '0x44b47a40806f6035747c3f8300fcb814d80dc491db8d8aabdb0922ba0368d834'

const CHAIN_CONFIGS: Record<number, { chain: Chain; rpcUrl: string }> = {
  [122]: {
    chain: {
      id: 122,
      name: 'Fuse',
      nativeCurrency: { name: 'Fuse', symbol: 'FUSE', decimals: 18 },
      rpcUrls: { default: { http: ['https://rpc.fuse.io'] } },
    } as Chain,
    rpcUrl: 'https://rpc.fuse.io',
  },
  [42220]: {
    chain: {
      id: 42220,
      name: 'Celo',
      nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
      rpcUrls: { default: { http: ['https://forno.celo.org'] } },
    } as Chain,
    rpcUrl: 'https://forno.celo.org',
  },
  [50]: {
    chain: {
      id: 50,
      name: 'XDC Network',
      nativeCurrency: { name: 'XDC', symbol: 'XDC', decimals: 18 },
      rpcUrls: { default: { http: ['https://rpc.ankr.com/xdc'] } },
    } as Chain,
    rpcUrl: 'https://rpc.ankr.com/xdc',
  },
}

/**
 * Creates an EIP-1193 provider backed by a local private key.
 * This is for local Storybook testing to mimic "wallet-in-host" behavior.
 */
export function createCustodialEip1193Provider(): EIP1193Provider {
  if (!CUSTODIAL_PRIVATE_KEY.startsWith('0x') || CUSTODIAL_PRIVATE_KEY.length !== 66) {
    throw new Error(
      'Invalid CUSTODIAL_PRIVATE_KEY. Set a 0x-prefixed 32-byte hex private key in custodialEip1193.ts',
    )
  }

  const account = privateKeyToAccount(CUSTODIAL_PRIVATE_KEY as `0x${string}`)
  let activeChainId = 42220 // Default to Celo, can be switched via wallet_switchEthereumChain
  const listeners: Record<string, EventCallback[]> = {}

  const clientsByChain = Object.fromEntries(
    Object.entries(CHAIN_CONFIGS).map(([chainId, config]) => {
      const transport = http(config.rpcUrl)
      return [
        Number(chainId),
        {
          publicClient: createPublicClient({ chain: config.chain, transport }),
          walletClient: createWalletClient({ account, chain: config.chain, transport }),
        },
      ]
    }),
  ) as Record<
    number,
    {
      publicClient: ReturnType<typeof createPublicClient>
      walletClient: ReturnType<typeof createWalletClient>
    }
  >

  const emit = (event: string, payload: unknown) => {
    for (const listener of listeners[event] ?? []) listener(payload)
  }

  const getActiveClients = () => {
    const clients = clientsByChain[activeChainId]
    if (!clients) throw new Error(`Unsupported active chain: ${activeChainId}`)
    return clients
  }

  const parseRequestedChainId = (rawChainId: string): number => {
    if (rawChainId.startsWith('0x')) return Number.parseInt(rawChainId, 16)
    return Number.parseInt(rawChainId, 10)
  }

  const provider: EIP1193Provider & { __gwWalletMode: 'custodial' } = {
    __gwWalletMode: 'custodial',
    on(event: string, fn: EventCallback) {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(fn)
    },
    removeListener(event: string, fn: EventCallback) {
      listeners[event] = (listeners[event] ?? []).filter((cb) => cb !== fn)
    },
    async request({ method, params }: { method: string; params?: unknown[] }): Promise<unknown> {
      switch (method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return [account.address]
        case 'eth_chainId':
          return `0x${activeChainId.toString(16)}`
        case 'net_version':
          return String(activeChainId)
        case 'wallet_switchEthereumChain': {
          const requested = (params?.[0] as { chainId?: string } | undefined)?.chainId
          if (!requested) throw new Error('wallet_switchEthereumChain missing chainId')
          const requestedId = parseRequestedChainId(requested)
          if (!clientsByChain[requestedId]) {
            throw new Error(`Custodial fixture does not support chain ${requestedId}`)
          }
          activeChainId = requestedId
          emit('chainChanged', requested)
          return null
        }
        case 'eth_sendTransaction': {
          const tx = (params?.[0] as Record<string, unknown> | undefined) ?? {}
          const { walletClient } = getActiveClients()
          const hash = await walletClient.sendTransaction({
            account,
            to: tx.to as `0x${string}`,
            data: (tx.data as `0x${string}` | undefined) ?? '0x',
            value: tx.value ? BigInt(tx.value as string) : 0n,
            gas: tx.gas ? BigInt(tx.gas as string) : undefined,
            maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas as string) : undefined,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas
              ? BigInt(tx.maxPriorityFeePerGas as string)
              : undefined,
            nonce: typeof tx.nonce === 'string' ? Number(tx.nonce) : undefined,
            chain: CHAIN_CONFIGS[activeChainId]?.chain,
          })
          return hash
        }
        case 'eth_call': {
          const callRequest = (params?.[0] as Record<string, unknown> | undefined) ?? {}
          const blockTag = (params?.[1] as string | undefined) ?? 'latest'
          const { publicClient } = getActiveClients()
          const result = await publicClient.call({
            account: (callRequest.from as `0x${string}` | undefined) ?? account.address,
            to: callRequest.to as `0x${string}`,
            data: (callRequest.data as `0x${string}` | undefined) ?? '0x',
            blockTag:
              blockTag === 'latest' || blockTag === 'earliest' || blockTag === 'pending'
                ? blockTag
                : undefined,
          })
          return result.data ?? '0x'
        }
        case 'eth_getBalance': {
          const target = (params?.[0] as `0x${string}` | undefined) ?? account.address
          const { publicClient } = getActiveClients()
          const balance = await publicClient.getBalance({ address: target })
          return `0x${balance.toString(16)}`
        }
        // Useful no-op for some tools that probe provider capabilities.
        case 'eth_estimateGas':
          return '0x5208'
        default:
          throw new Error(`Custodial fixture: unsupported method "${method}"`)
      }
    },
  }
  return provider
}
