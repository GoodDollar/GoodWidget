import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getBridgingRpcUrls } from '../src/adapter/rpcUrls.ts'

test('RPC settings override defaults, and empty overrides retain them', () => {
  assert.deepEqual(getBridgingRpcUrls(50, { 50: ['https://example.test/rpc', ''] }), ['https://example.test/rpc'])
  assert.ok(getBridgingRpcUrls(50, { 50: [] }).length > 1)
})
