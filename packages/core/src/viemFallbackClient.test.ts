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

test('refreshRpcs rejects non-HTTPS and non-Chainlist refresh URLs', { concurrency: false }, async () => {
  const mockFetch = async () => createChainlistResponse([])

  const insecureClient = createViemFallbackClient(createStorage(), {
    chainlistRpcsUrl: 'http://chainlist.org/rpcs.json',
    fetch: mockFetch,
  })

  await assert.rejects(
    () => insecureClient.refreshRpcs(),
    /chainlistRpcsUrl must use HTTPS/,
  )

  const unexpectedHostClient = createViemFallbackClient(createStorage(), {
    chainlistRpcsUrl: 'https://example.com/rpcs.json',
    fetch: mockFetch,
  })

  await assert.rejects(
    () => unexpectedHostClient.refreshRpcs(),
    /chainlistRpcsUrl must use chainlist\.org/,
  )
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
