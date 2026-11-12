import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getBridgingRpcUrls, getBridgingRpcUrlsKey } from '../src/adapter/rpcUrls.ts'

test('RPC settings override defaults, and empty overrides retain them', () => {
  assert.deepEqual(getBridgingRpcUrls(50, { 50: ['https://example.test/rpc', ''] }), ['https://example.test/rpc'])
  assert.ok(getBridgingRpcUrls(50, { 50: [] }).length > 1)
})

test('equivalent inline RPC settings produce the same memoization key', () => {
  assert.equal(
    getBridgingRpcUrlsKey({ 50: ['https://primary.test', 'https://fallback.test'] }),
    getBridgingRpcUrlsKey({ 50: ['https://primary.test', 'https://fallback.test'] }),
  )
  assert.notEqual(
    getBridgingRpcUrlsKey({ 50: ['https://primary.test', 'https://fallback.test'] }),
    getBridgingRpcUrlsKey({ 50: ['https://fallback.test', 'https://primary.test'] }),
  )
})
