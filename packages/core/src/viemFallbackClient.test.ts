import assert from 'node:assert/strict'
import test from 'node:test'

import { celo } from 'viem/chains'

import { createViemFallbackClient, type ViemFallbackStorage } from './viemFallbackClient.ts'

const chainlistUrl = 'https://chainlist.org/rpcs.json'

function createStorage(initialValue?: string): ViemFallbackStorage {
  let value = initialValue ?? null

  return {
    async getItem() {
      return value
    },
    async setItem(_key, nextValue) {
      value = nextValue
    },
  }
}

function createChainlistResponse(rpcs: string[]) {
  return new Response(
    JSON.stringify([
      {
        chainId: celo.id,
        rpc: rpcs,
      },
    ]),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    },
  )
}

function createChain(defaultRpcs: string[]) {
  return {
    ...celo,
    rpcUrls: {
      ...celo.rpcUrls,
      default: {
        ...celo.rpcUrls.default,
        http: defaultRpcs,
      },
    },
  }
}

test(
  'getRpcUrls prefers caller and chain defaults before cached Chainlist URLs',
  { concurrency: false },
  async () => {
    const client = createViemFallbackClient(createStorage(), {
      fetch: async () =>
        createChainlistResponse(['https://cached.example', 'https://default.example']),
    })

    await client.ready

    const urls = await client.getRpcUrls(
      createChain(['https://default.example']),
      ['https://caller.example'],
    )

    assert.deepEqual(urls, [
      'https://caller.example',
      'https://default.example',
      'https://cached.example',
    ])
  },
)

test('refreshRpcs accepts a custom RPC list URL', { concurrency: false }, async () => {
  const customUrl = 'http://example.com/rpcs.json'
  const fetchCalls: string[] = []
  const client = createViemFallbackClient(createStorage(), {
    chainlistRpcsUrl: customUrl,
    fetch: async (input) => {
      fetchCalls.push(input instanceof Request ? input.url : String(input))
      return createChainlistResponse(['https://cached.example'])
    },
  })

  await client.ready

  assert.ok(fetchCalls.length >= 1)
  assert.ok(fetchCalls.every((url) => url === customUrl))
  assert.deepEqual(await client.getRpcUrls(createChain([])), ['https://cached.example'])
})

test(
  'createPublicClient falls back to a working discovered RPC when the first one fails',
  { concurrency: false },
  async () => {
    const originalFetch = globalThis.fetch
    const badRpcCalls: string[] = []
    const goodRpcCalls: string[] = []

    const mockFetch: typeof fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input)

      if (url === chainlistUrl) {
        return createChainlistResponse(['https://bad.example', 'https://good.example'])
      }

      if (url === 'https://bad.example/' || url === 'https://bad.example') {
        badRpcCalls.push(url)
        return new Response('rate limited', { status: 429 })
      }

      if (url === 'https://good.example/' || url === 'https://good.example') {
        goodRpcCalls.push(url)
        const payload = JSON.parse(String(init?.body))

        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: payload.id,
            result: '0xa4ec',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        )
      }

      throw new Error(`Unexpected fetch URL: ${url}`)
    }

    globalThis.fetch = mockFetch

    try {
      const client = createViemFallbackClient(createStorage(), {
        chainlistRpcsUrl: chainlistUrl,
        fetch: mockFetch,
        // Ranking is on by default and its background ping loop cannot be stopped, which would
        // keep the test process alive. This test only cares about failover ordering.
        rank: false,
      })
      const publicClient = await client.createPublicClient({
        chain: createChain([]),
      })

      const chainId = await publicClient.request({ method: 'eth_chainId' })

      assert.equal(chainId, '0xa4ec')
      assert.ok(badRpcCalls.length >= 1)
      assert.ok(goodRpcCalls.length >= 1)
    } finally {
      globalThis.fetch = originalFetch
    }
  },
)

test('persists only tracked chains instead of the whole Chainlist payload', async () => {
  let stored: string | null = null
  const storage: ViemFallbackStorage = {
    async getItem() {
      return stored
    },
    async setItem(_key, value) {
      stored = value
    },
  }

  const client = createViemFallbackClient(storage, {
    fetch: async () =>
      new Response(
        JSON.stringify([
          { chainId: celo.id, rpc: ['https://celo.example'] },
          { chainId: 999_001, rpc: ['https://other.example'] },
          { chainId: 999_002, rpc: ['https://other2.example'] },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
  })

  await client.getRpcUrls(createChain([]))

  assert.ok(stored, 'expected the cache to be written')
  const parsed = JSON.parse(stored) as { rpcs: { chainId: number }[] }
  assert.deepEqual(
    parsed.rpcs.map((entry) => entry.chainId),
    [celo.id],
  )
})

test('retries a failed refresh instead of giving up for the session', async () => {
  let attempts = 0
  const errors: unknown[] = []

  const client = createViemFallbackClient(createStorage(), {
    refreshRetryMs: 0,
    onError: (error) => errors.push(error),
    fetch: async () => {
      attempts += 1
      if (attempts === 1) throw new Error('offline')
      return createChainlistResponse(['https://recovered.example'])
    },
  })

  await client.ready

  assert.deepEqual(await client.getRpcUrls(createChain([])), ['https://recovered.example'])
  assert.equal(attempts, 2)
  assert.equal(errors.length, 1)
})

test('does not refetch for a chain Chainlist does not know about', async () => {
  let attempts = 0
  const client = createViemFallbackClient(createStorage(), {
    fetch: async () => {
      attempts += 1
      return createChainlistResponse(['https://celo.example'])
    },
  })

  const unknownChain = { ...createChain([]), id: 999_999 }

  assert.deepEqual(await client.getRpcUrls(unknownChain), [])
  assert.deepEqual(await client.getRpcUrls(unknownChain), [])
  assert.equal(attempts, 1)
})

test('skips malformed Chainlist rows instead of discarding the payload', async () => {
  const client = createViemFallbackClient(createStorage(), {
    rank: false,
    fetch: async () =>
      new Response(
        JSON.stringify([
          null,
          'not-a-chain',
          { chainId: 'nope', rpc: ['https://bad-id.example'] },
          { chainId: celo.id, rpc: null },
          {
            chainId: celo.id,
            rpc: [
              null,
              42,
              'http://insecure.example',
              'https://templated.example/${KEY}',
              { url: 'https://object-form.example' },
              'https://string-form.example',
            ],
          },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
  })

  assert.deepEqual(await client.getRpcUrls(createChain([])), [
    'https://object-form.example',
    'https://string-form.example',
  ])
})
