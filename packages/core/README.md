# @goodwidget/core

Runtime helpers for GoodWidget providers, host detection, wallet context, and viem client setup.

## viem fallback clients

`createViemFallbackClient` wraps viem `createPublicClient` and `createWalletClient` so callers get a fallback HTTP transport built from cached Chainlist RPC URLs for the requested chain.

The helper accepts a small key-value storage adapter. On initialization it reads cached RPC metadata from storage. If the cache is missing or older than 1 day, it starts a background refresh from Chainlist. Client creation waits for that first refresh only when no cached RPCs are available for the requested chain; a stale cache is served immediately while the refresh runs behind it, and a refresh that fails is retried on a later call rather than disabling discovery for the session.

Chainlist returns every known chain, which is far too large to put in `localStorage`. Only the chains you list in `chainIds`, the chains the client is actually asked about, and the chains already in the cache are written back to storage.

Caller-provided `fallbackRpcs` are always tried first, then the chain's own default RPC URLs, and finally any cached Chainlist URLs. The generated viem fallback transport retries once and moves on to the next endpoint whenever one fails, and ranks endpoints by measured health so a cached RPC that starts rate-limiting or erroring is deprioritized instead of being trusted for the rest of the cache cycle.

```ts
import { createViemFallbackClient } from '@goodwidget/core/viemFallbackClient'
import { celo } from 'viem/chains'

const viemClient = createViemFallbackClient(localStorage, {
  onError(error) {
    console.warn('RPC refresh failed', error)
  },
})

const publicClient = await viemClient.createPublicClient({
  chain: celo,
  fallbackRpcs: ['https://forno.celo.org'],
})
```

The same helper can create wallet clients. Any viem wallet client option, such as `account`, can be passed through.

```ts
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'

const account = privateKeyToAccount('0x...')

const walletClient = await viemClient.createWalletClient({
  account,
  chain: celo,
  fallbackRpcs: ['https://forno.celo.org'],
})
```

If you pass `transport`, the wrapper leaves it unchanged and does not create a fallback transport for that client.

```ts
import { http } from 'viem'
import { celo } from 'viem/chains'

const client = await viemClient.createPublicClient({
  chain: celo,
  transport: http('https://forno.celo.org'),
})
```

## Storage adapters

The adapter supports browser-style storage and Worker-style KV storage.

```ts
createViemFallbackClient(localStorage)
```

```ts
createViemFallbackClient({
  get: (key) => env.KV.get(key, 'json'),
  put: (key, value) => env.KV.put(key, value),
})
```

Cached values use this shape:

```ts
type ViemRpcCacheEntry = {
  fetchedAt: string
  rpcs: Array<{
    chainId: number
    rpcs: string[]
  }>
}
```

Only HTTPS RPC URLs are used. URLs containing Chainlist template placeholders are ignored.

## Options

```ts
createViemFallbackClient(storage, {
  cacheKey: 'goodwidget:viem-rpcs',
  chainlistRpcsUrl: 'https://chainlist.org/rpcs.json',
  refreshIntervalMs: 24 * 60 * 60 * 1000,
  refreshRetryMs: 60_000,
  chainIds: [42220],
  fetchTimeoutMs: 10_000,
  fetch: globalThis.fetch,
  onError: console.warn,
  rank: true,
})
```

`chainlistRpcsUrl` defaults to Chainlist's RPC JSON endpoint, but can be overridden. Refresh requests still use a timeout and `redirect: 'error'`.

`chainIds` seeds the set of chains persisted to storage; it is optional, since any chain passed to `getRpcUrls`, `createPublicClient`, or `createWalletClient` is added automatically. `refreshRetryMs` bounds how often a failed Chainlist fetch is retried.

`rank` is on by default and reorders transports by measured health, pinging with `eth_chainId` (rather than viem's default `net_listening`, which many managed providers reject) every 30 seconds. Pass `{ intervalMs }` to change the interval. Be aware that ranking starts a background ping against every discovered RPC that runs for the lifetime of the client and cannot be stopped, and that once it has samples it supersedes the caller-first ordering described above. Pass `rank: false` to disable it.