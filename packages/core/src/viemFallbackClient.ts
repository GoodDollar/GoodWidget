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
const DEFAULT_RANK_INTERVAL_MS = 30_000

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
   * viem's latency ranking for the generated fallback transport, which reorders endpoints by
   * measured health so a chronically rate-limited RPC stops being preferred. Enabled by
   * default. Note that ranking starts a repeating background ping against every discovered
   * RPC that runs for the lifetime of the client and cannot be stopped — pass `false` to keep
   * the caller-controlled order and only skip endpoints that fail an actual request.
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
  // them as permanently unhealthy and demote the integrator's own endpoints, so rank against a
  // method every provider implements. viem's default 4s interval is also far too aggressive for
  // a list this size.
  const rank = options.rank ?? true
  const rankOptions = rank
    ? {
        interval: typeof rank === 'object' ? (rank.intervalMs ?? DEFAULT_RANK_INTERVAL_MS) : DEFAULT_RANK_INTERVAL_MS,
        ping: ({
          transport,
        }: {
          transport: { request: (args: { method: string }) => Promise<unknown> }
        }) => transport.request({ method: 'eth_chainId' }),
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
    // Ranking reorders these by measured health during use; with `rank: false` viem instead
    // walks them in the caller-controlled order built by `getRpcUrls`, skipping failures.
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPresent<T>(value: T | null): value is T {
  return value !== null
}

/** Chainlist lists an RPC as either a bare URL or a `{ url }` object; the cache only ever
 * holds bare URLs. Anything else collapses to '', which `sanitizeRpcUrls` drops. */
function toRpcUrl(entry: unknown): string {
  if (typeof entry === 'string') return entry
  if (isRecord(entry) && typeof entry.url === 'string') return entry.url
  return ''
}

/** Builds one cache row, or null when the chain id or its RPC list is unusable. */
function toChainRpcs(chainId: unknown, urls: unknown): CachedChainRpcs | null {
  if (typeof chainId !== 'number' || !Number.isInteger(chainId)) return null

  const rpcs = sanitizeRpcUrls(Array.isArray(urls) ? urls.map(toRpcUrl) : [])
  return rpcs.length > 0 ? { chainId, rpcs } : null
}

function parseCacheEntry(value: unknown): ViemRpcCacheEntry | null {
  if (typeof value === 'string') {
    try {
      return parseCacheEntry(JSON.parse(value))
    } catch {
      return null
    }
  }

  if (!isRecord(value)) return null

  const { fetchedAt, rpcs } = value
  if (typeof fetchedAt !== 'string' || !Array.isArray(rpcs)) return null

  return {
    fetchedAt,
    rpcs: rpcs
      .filter(isRecord)
      .map((entry) => toChainRpcs(entry.chainId, entry.rpcs))
      .filter(isPresent),
  }
}

function normalizeChainlistPayload(payload: unknown): CachedChainRpcs[] {
  if (!Array.isArray(payload)) return []

  return payload
    .filter(isRecord)
    .map((entry) => toChainRpcs(entry.chainId, entry.rpc))
    .filter(isPresent)
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
