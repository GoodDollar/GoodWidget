import {
  createPublicClient as createViemPublicClient,
  createWalletClient as createViemWalletClient,
  fallback,
  http,
  type Account,
  type Address,
  type Chain,
  type PublicClient,
  type PublicClientConfig,
  type RpcSchema,
  type Transport,
  type WalletClient,
  type WalletClientConfig,
} from 'viem'

const DEFAULT_CHAINLIST_RPCS_URL = 'https://chainlist.org/rpcs.json'
const DEFAULT_CACHE_KEY = 'goodwidget:viem-rpcs'
const DEFAULT_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000
const DEFAULT_FETCH_TIMEOUT_MS = 10_000

type MaybePromise<T> = T | Promise<T>

export interface ViemFallbackStorage {
  get?: (key: string) => MaybePromise<unknown>
  put?: (key: string, value: string) => MaybePromise<void>
  getItem?: (key: string) => MaybePromise<string | null | undefined>
  setItem?: (key: string, value: string) => MaybePromise<void>
}

export interface ViemFallbackClientOptions {
  cacheKey?: string
  chainlistRpcsUrl?: string
  refreshIntervalMs?: number
  fetchTimeoutMs?: number
  fetch?: typeof fetch
  onError?: (error: unknown) => void
}

export interface CachedChainRpcs {
  chainId: number
  rpcs: string[]
}

export interface ViemRpcCacheEntry {
  rpcs: CachedChainRpcs[]
  fetchedAt: string
}

export type ViemFallbackPublicClientParameters = Omit<
  PublicClientConfig<Transport, Chain, Account | Address | undefined, RpcSchema | undefined>,
  'chain' | 'transport'
> & {
  chain: Chain
  transport?: Transport
  fallbackRpcs?: string[]
}

export type ViemFallbackWalletClientParameters = Omit<
  WalletClientConfig<Transport, Chain, Account | Address | undefined, RpcSchema | undefined>,
  'chain' | 'transport'
> & {
  chain: Chain
  transport?: Transport
  fallbackRpcs?: string[]
}

export interface ViemFallbackClient {
  ready: Promise<void>
  refreshRpcs: () => Promise<void>
  getRpcUrls: (chain: Chain, fallbackRpcs?: string[]) => Promise<string[]>
  createPublicClient: (parameters: ViemFallbackPublicClientParameters) => Promise<PublicClient>
  createWalletClient: (parameters: ViemFallbackWalletClientParameters) => Promise<WalletClient>
}

/**
 * Creates viem client wrappers backed by a cached Chainlist RPC list.
 */
export function createViemFallbackClient(
  storage: ViemFallbackStorage,
  options: ViemFallbackClientOptions = {},
): ViemFallbackClient {
  const cacheKey = options.cacheKey ?? DEFAULT_CACHE_KEY
  const chainlistRpcsUrl = options.chainlistRpcsUrl ?? DEFAULT_CHAINLIST_RPCS_URL
  const refreshIntervalMs = options.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS
  const fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS
  const fetchImpl = options.fetch ?? globalThis.fetch

  let cache: ViemRpcCacheEntry | null = null
  let refreshPromise: Promise<void> | null = null

  const refreshRpcs = async (): Promise<void> => {
    if (!fetchImpl) throw new Error('fetch is not available')

    const chainlistUrl = new URL(chainlistRpcsUrl)

    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), fetchTimeoutMs)

    try {
      const response = await fetchImpl(chainlistUrl.href, {
        redirect: 'error',
        signal: abortController.signal,
      })
      if (!response.ok) {
        throw new Error(`Chainlist HTTP ${response.status}`)
      }

      const payload = await response.json()
      const nextCache: ViemRpcCacheEntry = {
        rpcs: normalizeChainlistPayload(payload),
        fetchedAt: new Date().toISOString(),
      }

      if (nextCache.rpcs.length === 0) return

      cache = nextCache
      await writeCache(storage, cacheKey, nextCache)
    } finally {
      clearTimeout(timeout)
    }
  }

  const startRefresh = (): Promise<void> => {
    if (!refreshPromise) {
      refreshPromise = refreshRpcs()
        .catch((error) => {
          options.onError?.(error)
        })
        .finally(() => {
          refreshPromise = null
        })
    }

    return refreshPromise
  }

  const ready = readCache(storage, cacheKey)
    .then((cached) => {
      cache = cached
      if (!cached || isStale(cached, refreshIntervalMs)) {
        void startRefresh()
      }
    })
    .catch((error) => {
      options.onError?.(error)
      void startRefresh()
    })

  const getRpcUrls = async (chain: Chain, fallbackRpcs: string[] = []): Promise<string[]> => {
    await ready

    const cachedUrls = getCachedRpcUrls(cache, chain.id)
    if (cachedUrls.length === 0 && refreshPromise) {
      await refreshPromise
    }

    // Prefer integrator-supplied RPCs and chain defaults before discovered Chainlist
    // endpoints so callers control the primary transport order.
    return sanitizeRpcUrls([
      ...fallbackRpcs,
      ...(chain.rpcUrls.default.http ?? []),
      ...getCachedRpcUrls(cache, chain.id),
    ])
  }

  const createFallbackTransport = async (
    chain: Chain,
    fallbackRpcs?: string[],
  ): Promise<Transport> => {
    const rpcUrls = await getRpcUrls(chain, fallbackRpcs)
    const transports = rpcUrls.length > 0 ? rpcUrls.map((rpcUrl) => http(rpcUrl)) : [http()]
    // Let viem re-rank transports during use so stale cached endpoints do not remain
    // the preferred RPCs after they start failing or slowing down.
    return fallback(transports, {
      rank: true,
      retryCount: 1,
    })
  }

  return {
    ready,
    refreshRpcs,
    getRpcUrls,
    async createPublicClient(parameters) {
      const { fallbackRpcs, ...clientParameters } = parameters
      const transport =
        clientParameters.transport ??
        (await createFallbackTransport(clientParameters.chain, fallbackRpcs))

      return createViemPublicClient({
        ...clientParameters,
        transport,
      } as PublicClientConfig<
        Transport,
        Chain,
        Account | Address | undefined,
        RpcSchema | undefined
      >)
    },
    async createWalletClient(parameters) {
      const { fallbackRpcs, ...clientParameters } = parameters
      const transport =
        clientParameters.transport ??
        (await createFallbackTransport(clientParameters.chain, fallbackRpcs))

      return createViemWalletClient({
        ...clientParameters,
        transport,
      } as WalletClientConfig<
        Transport,
        Chain,
        Account | Address | undefined,
        RpcSchema | undefined
      >)
    },
  }
}

async function readCache(
  storage: ViemFallbackStorage,
  key: string,
): Promise<ViemRpcCacheEntry | null> {
  const value = storage.get ? await storage.get(key) : await storage.getItem?.(key)
  return parseCacheEntry(value)
}

async function writeCache(
  storage: ViemFallbackStorage,
  key: string,
  value: ViemRpcCacheEntry,
): Promise<void> {
  const serialized = JSON.stringify(value)
  if (storage.put) {
    await storage.put(key, serialized)
    return
  }

  await storage.setItem?.(key, serialized)
}

function parseCacheEntry(value: unknown): ViemRpcCacheEntry | null {
  if (!value) return null

  if (typeof value === 'string') {
    try {
      return parseCacheEntry(JSON.parse(value))
    } catch {
      return null
    }
  }

  if (typeof value !== 'object') return null

  const candidate = value as Partial<ViemRpcCacheEntry>
  if (typeof candidate.fetchedAt !== 'string' || !Array.isArray(candidate.rpcs)) return null

  const rpcs = candidate.rpcs
    .map((entry) => ({
      chainId: typeof entry.chainId === 'number' ? entry.chainId : Number.NaN,
      rpcs: Array.isArray(entry.rpcs)
        ? sanitizeRpcUrls(
            entry.rpcs.filter((rpcUrl): rpcUrl is string => typeof rpcUrl === 'string'),
          )
        : [],
    }))
    .filter((entry) => Number.isInteger(entry.chainId) && entry.rpcs.length > 0)

  return {
    fetchedAt: candidate.fetchedAt,
    rpcs,
  }
}

function normalizeChainlistPayload(payload: unknown): CachedChainRpcs[] {
  if (!Array.isArray(payload)) return []

  return payload
    .map((entry) => {
      const candidate = entry as { chainId?: unknown; rpc?: unknown }
      const rpcEntries = Array.isArray(candidate.rpc) ? candidate.rpc : []
      const urls = rpcEntries
        .map((rpcEntry) => {
          if (typeof rpcEntry === 'string') return rpcEntry
          if (typeof rpcEntry === 'object' && rpcEntry && 'url' in rpcEntry) {
            const url = (rpcEntry as { url?: unknown }).url
            return typeof url === 'string' ? url : ''
          }
          return ''
        })
        .filter((url) => url.length > 0)

      return {
        chainId: typeof candidate.chainId === 'number' ? candidate.chainId : Number.NaN,
        rpcs: sanitizeRpcUrls(urls),
      }
    })
    .filter((entry) => Number.isInteger(entry.chainId) && entry.rpcs.length > 0)
}

function getCachedRpcUrls(cache: ViemRpcCacheEntry | null, chainId: number): string[] {
  return cache?.rpcs.find((entry) => entry.chainId === chainId)?.rpcs ?? []
}

function isStale(cache: ViemRpcCacheEntry, refreshIntervalMs: number): boolean {
  const fetchedAtMs = Date.parse(cache.fetchedAt)
  return Number.isNaN(fetchedAtMs) || Date.now() - fetchedAtMs >= refreshIntervalMs
}

function sanitizeRpcUrls(urls: string[]): string[] {
  const deduped = new Set<string>()
  for (const url of urls) {
    if (!url.startsWith('https://')) continue
    if (url.includes('${')) continue
    deduped.add(url)
  }
  return [...deduped]
}
