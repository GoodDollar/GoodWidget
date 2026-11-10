import assert from 'node:assert/strict'
import { test } from 'node:test'
import { requireSuccessfulReceipt } from '../src/adapter/receipts.ts'

test('successful receipts pass through unchanged', () => {
  const receipt = { status: 'success', transactionHash: '0x123' }
  assert.equal(requireSuccessfulReceipt(receipt, 'approval'), receipt)
})

test('reverted approval and bridge receipts fail at their own step', () => {
  const receipt = { status: 'reverted', transactionHash: '0x123' }
  assert.throws(() => requireSuccessfulReceipt(receipt, 'approval'), /approval transaction reverted/)
  assert.throws(() => requireSuccessfulReceipt(receipt, 'bridge'), /bridge transaction reverted/)
})
