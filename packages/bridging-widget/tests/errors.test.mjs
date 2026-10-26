import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mapBridgeError } from '../src/adapter/errors.ts'

test('read-only contract reverts use the operation fallback, not a transaction message', () => {
  const originalError = console.error
  console.error = () => {}

  try {
    const error = new Error('The contract function "bridgeLimits" reverted: Internal error')
    assert.equal(mapBridgeError(error, 'Unable to load balance and limits.'), 'Unable to load balance and limits.')
    assert.equal(mapBridgeError(error, 'Failed to fetch bridge quote.'), 'Failed to fetch bridge quote.')
  } finally {
    console.error = originalError
  }
})
