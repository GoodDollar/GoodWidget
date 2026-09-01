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
const DEFAULT_REFRESH_RETRY_MS = 60_000

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
  /**
   * How long to wait before retrying after a failed Chainlist refresh. Defaults to 1 minute.
   */
  refreshRetryMs?: number
  /**
   * Chain IDs to persist RPC URLs for. Chainlist returns every known chain, which is far too
   * large for storage backends like `localStorage`, so only the chains listed here — plus any
   * chain the client is actually asked about, and any chain already present in the cache — are
   * written back to storage.
   */
  chainIds?: number[]
  fetchTimeoutMs?: number
  fetch?: typeof fetch
  onError?: (error: unknown) => void
  /**
   * Enables viem's latency ranking for the generated fallback transport. Ranking runs a
   * repeating background ping against every discovered RPC for the lifetime of the client
   * and cannot be stopped, so it is opt-in. Defaults to `false`, which keeps the transports
   * in the caller-controlled order and simply skips endpoints that fail a request.
   */
  rank?: boolean | { intervalMs?: number }
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
  const refreshRetryMs = options.refreshRetryMs ?? DEFAULT_REFRESH_RETRY_MS
  const fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS
  const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis)

  // Many managed RPC providers reject viem's default `net_listening` ping, which would score
  // them as permanently unhealthy, so rank against a method every provider implements.
  const rankOptions = options.rank
    ? {
        interval: typeof options.rank === 'object' ? (options.rank.intervalMs ?? 30_000) : 30_000,
        ping: ({ transport }: { transport: { request: (args: { method: string }) => Promise<unknown> } }) =>
          transport.request({ method: 'eth_chainId' }),
      }
    : false

  // Chains whose RPC URLs are worth persisting. Seeded from `options.chainIds`, then grown by
  // whatever the caller asks for and by whatever the existing cache already holds.
  const trackedChainIds = new Set<number>(options.chainIds ?? [])

  let cache: ViemRpcCacheEntry | null = null
  let refreshPromise: Promise<void> | null = null
  let lastFailureAt = 0
  // The payload covers every chain, so one successful refresh answers for all of them: a chain
  // still missing afterwards is a chain Chainlist does not know about, not a stale cache.
  let hasRefreshed = false

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

      if (nextCache.rpcs.length === 0) {
        throw new Error('Chainlist returned no usable RPC URLs')
      }

      cache = nextCache
      hasRefreshed = true
      await persistCache()
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Writes the tracked subset of the in-memory cache. Storage failures (quota, private mode)
   * are reported but never reject, so a full disk cannot break RPC resolution.
   */
  const persistCache = async (): Promise<void> => {
    if (!cache || trackedChainIds.size === 0) return

    const rpcs = cache.rpcs.filter((entry) => trackedChainIds.has(entry.chainId))
    if (rpcs.length === 0) return

    try {
      await writeCache(storage, cacheKey, { fetchedAt: cache.fetchedAt, rpcs })
    } catch (error) {
      options.onError?.(error)
    }
  }

  const trackChain = (chainId: number): void => {
    if (trackedChainIds.has(chainId)) return

    trackedChainIds.add(chainId)
    void persistCache()
  }

  const canRetryRefresh = (): boolean =>
    lastFailureAt === 0 || Date.now() - lastFailureAt >= refreshRetryMs

  const startRefresh = (): Promise<void> => {
    if (refreshPromise) return refreshPromise
    // A failed refresh must stay retryable, but not on every single call.
    if (!canRetryRefresh()) return Promise.resolve()

    refreshPromise = refreshRpcs()
      .then(() => {
        lastFailureAt = 0
      })
      .catch((error) => {
        lastFailureAt = Date.now()
        options.onError?.(error)
      })
      .finally(() => {
        refreshPromise = null
      })

    return refreshPromise
  }

  const ready = readCache(storage, cacheKey)
    .then((cached) => {
      cache = cached
      // Keep persisting the chains an earlier session cared about, not just this session's.
      for (const entry of cached?.rpcs ?? []) trackedChainIds.add(entry.chainId)

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

    trackChain(chain.id)

    if (getCachedRpcUrls(cache, chain.id).length === 0) {
      // Nothing cached for this chain: wait on any in-flight refresh, and start one if no
      // refresh has ever succeeded — which covers a first run as well as a boot-time failure
      // that would otherwise leave the client with no Chainlist URLs for the whole session.
      if (refreshPromise) await refreshPromise
      if (!hasRefreshed && getCachedRpcUrls(cache, chain.id).length === 0) {
        await startRefresh()
      }
    } else if (!cache || isStale(cache, refreshIntervalMs)) {
      // Serve the cached URLs immediately and refresh behind them, so a long-lived client does
      // not keep using a cache that went stale after construction.
      void startRefresh()
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
    // Without ranking viem walks the transports in order and skips the ones that fail, which
    // preserves the caller-controlled ordering built in `getRpcUrls`.
    return fallback(transports, {
      rank: rankOptions,
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
    .filter((entry): entry is CachedChainRpcs => Boolean(entry) && typeof entry === 'object')
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
    .filter((entry) => Boolean(entry) && typeof entry === 'object')
    .map((entry) => {
      const candidate = entry as { chainId?: unknown; rpc?: unknown }
      const rpcEntries = Array.isArray(candidate.rpc) ? candidate.rpc : []
      const urls = rpcEntries
        .map((rpcEntry) => {
          if (typeof rpcEntry === 'string') return rpcEntry
          if (rpcEntry && typeof rpcEntry === 'object' && 'url' in rpcEntry) {
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
