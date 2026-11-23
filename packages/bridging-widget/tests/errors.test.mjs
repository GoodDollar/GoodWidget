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
    assert.equal(
      mapBridgeError(error, 'Unable to prepare bridge. Please try again.'),
      'Unable to prepare bridge. Please try again.',
    )
  } finally {
    console.error = originalError
  }
})

test('transaction reverts retain the bridge hint without leaking raw errors', () => {
  const originalError = console.error
  console.error = () => {}

  try {
    const error = new Error('Execution reverted: sensitive RPC details')
    assert.equal(
      mapBridgeError(error, 'Bridge transaction failed.', 'transaction', 'bridging'),
      'Bridge transaction reverted on-chain. Try a smaller amount.',
    )
  } finally {
    console.error = originalError
  }
})

test('approval errors are attributed to approval, while wallet rejection stays distinct', () => {
  const originalError = console.error
  console.error = () => {}
  try {
    assert.equal(
      mapBridgeError(new Error('approval transaction reverted on-chain'), 'Token approval failed.', 'transaction', 'approving'),
      'Token approval failed on-chain. Please approve and try again.',
    )
    assert.equal(
      mapBridgeError(new Error('bridge transaction reverted on-chain'), 'Bridge transaction failed.', 'transaction', 'bridging'),
      'Bridge transaction reverted on-chain. Try a smaller amount.',
    )
    assert.equal(
      mapBridgeError(new Error('User rejected the request'), 'Token approval failed.', 'transaction', 'approving'),
      'Transaction canceled in wallet.',
    )
    assert.equal(
      mapBridgeError(new Error('bridgeLimits reverted'), 'Unable to prepare bridge.', 'transaction'),
      'Unable to prepare bridge.',
    )
  } finally {
    console.error = originalError
  }
})

test('nested RPC funding errors take precedence over generic transport wording', () => {
  const originalError = console.error
  console.error = () => {}
  try {
    const rpcError = new Error('HTTP request failed.', {
      cause: new Error('insufficient funds for gas * price + value: sensitive RPC details'),
    })
    assert.equal(
      mapBridgeError(rpcError, 'Bridge transaction failed.', 'transaction', 'bridging'),
      'Insufficient native balance for the bridge fee and transaction gas.',
    )
    assert.equal(
      mapBridgeError(new Error('Failed to fetch'), 'Bridge transaction failed.'),
      'Unable to reach the network. Check your connection and try again.',
    )
    assert.equal(
      mapBridgeError(new Error('User rejected request: insufficient funds'), 'Bridge transaction failed.'),
      'Transaction canceled in wallet.',
    )
    const cyclic = new Error('Failed to fetch')
    cyclic.cause = cyclic
    assert.equal(
      mapBridgeError(cyclic, 'Bridge transaction failed.'),
      'Unable to reach the network. Check your connection and try again.',
    )
    assert.equal(
      mapBridgeError({ code: 'BRIDGE_QUOTE_CHANGED' }, 'Bridge transaction failed.'),
      'Bridge fees changed. Review the updated quote before confirming again.',
    )
  } finally {
    console.error = originalError
  }
})
