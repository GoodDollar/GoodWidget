import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadBridgeHistory } from '../src/adapter/historyQueries.ts'
import { getAxelarStatus } from '../src/adapter/submissionSafety.ts'

const address = '0x18883c2ff5a84b7f686ff0cfd400c6f3d6068b07'
const source = '0xcd5d79e4acf75bb1deec9d8fb55f7e5530fa11e8dd9ffa7f814732f0c2f76b3b'
const destination = '0x18b5d2239e586c4286285eb4ac43c23ee670f15a98ea867a7593520816e320c0'
const scanSdk = {
  async getCombinedHistory(account, clients) {
    const results = await Promise.all(Object.values(clients).map(async client => {
      try {
        await client.getBlockNumber()
        return await client.getContractEvents({ fromBlock: 0n })
      } catch { return [] }
    }))
    return results.flat()
  },
}

test('history pages newest-first within provider limits without gaps', async () => {
  const ranges = []
  const result = await loadBridgeHistory(scanSdk, address, { 42220: {
    getBlockNumber: async () => 12000n,
    getContractEvents: async ({ fromBlock, toBlock }) => {
      assert.ok(toBlock - fromBlock < 5000n)
      ranges.push([fromBlock, toBlock])
      return [{ transactionHash: source }]
    },
  } })
  assert.deepEqual(ranges, [[7001n, 12000n], [2001n, 7000n], [0n, 2000n]])
  assert.equal(result.isPartial, false)
  assert.deepEqual(result.incompleteChainIds, [])
  assert.equal(result.events.length, 3)
})

test('history reduces range and retains readable chains when another RPC fails', async () => {
  const result = await loadBridgeHistory(scanSdk, address, {
    42220: {
      getBlockNumber: async () => 300n,
      getContractEvents: async ({ fromBlock, toBlock }) => {
        if (toBlock - fromBlock >= 100n) throw new Error('max block range 100')
        return [{ transactionHash: source }]
      },
    },
    1: { getBlockNumber: async () => { throw new Error('RPC unavailable') } },
  })
  assert.equal(result.isPartial, true)
  assert.deepEqual(result.incompleteChainIds, [1])
  assert.equal(result.events.length, 4)
})

test('failed scans are not reported as a successful empty result', async () => {
  const result = await loadBridgeHistory(scanSdk, address, { 42220: {
    getBlockNumber: async () => 100n,
    getContractEvents: async () => { throw new Error('failed to fetch') },
  } })
  assert.equal(result.isPartial, true)
  assert.deepEqual(result.events, [])
})

test('a recovered scan clears the previously incomplete network list', async () => {
  let failing = true
  const clients = { 50: {
    getBlockNumber: async () => {
      if (failing) throw new Error('RPC unavailable')
      return 100n
    },
    getContractEvents: async () => [],
  } }
  assert.deepEqual((await loadBridgeHistory(scanSdk, address, clients)).incompleteChainIds, [50])
  failing = false
  const recovered = await loadBridgeHistory(scanSdk, address, clients)
  assert.equal(recovered.isPartial, false)
  assert.deepEqual(recovered.incompleteChainIds, [])
})

test('scan budget returns recent results and marks an unfinished range partial', async () => {
  let calls = 0
  const result = await loadBridgeHistory(scanSdk, address, { 1: {
    getBlockNumber: async () => 50000n,
    getContractEvents: async ({ fromBlock, toBlock }) => {
      calls++
      if (toBlock - fromBlock >= 100n) throw new Error('max block range 100')
      return [{ transactionHash: source }]
    },
  } })
  assert.equal(calls, 80)
  assert.ok(result.events.length > 0)
  assert.equal(result.isPartial, true)
})

test('a later failed page retains earlier pages instead of losing the whole chain', async () => {
  let calls = 0
  const result = await loadBridgeHistory(scanSdk, address, { 42220: {
    getBlockNumber: async () => 6000n,
    getContractEvents: async () => {
      if (++calls === 2) throw new Error('connection reset')
      return [{ transactionHash: source }]
    },
  } })
  assert.equal(result.events.length, 1)
  assert.equal(result.isPartial, true)
})

test('Axelar current API resolves matching execution and distinguishes unavailable data', async t => {
  let body = { data: [{ call: { transactionHash: source }, status: 'executed', executed: { transactionHash: destination } }] }
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.gmp.axelarscan.io')
    assert.equal(options.method, 'POST')
    assert.deepEqual(JSON.parse(options.body), { method: 'searchGMP', txHash: source })
    return { ok: true, json: async () => body }
  })
  assert.deepEqual(await getAxelarStatus(source), { status: 'completed', srcTxHash: source, dstTxHash: destination })
  body.data[0].status = 'called'
  assert.equal((await getAxelarStatus(source)).status, 'pending')
  body.data[0].status = 'executed'
  delete body.data[0].executed
  await assert.rejects(getAxelarStatus(source), /execution hash unavailable/)
  body = { data: [] }
  await assert.rejects(getAxelarStatus(source), /not indexed/)
  body = { methods: [] }
  await assert.rejects(getAxelarStatus(source), /Invalid Axelar/)
  body = { data: [{ call: { transactionHash: source }, status: 'unrecognized' }] }
  await assert.rejects(getAxelarStatus(source), /Unknown Axelar/)
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false }))
  await assert.rejects(getAxelarStatus(source), /unavailable/)
})
