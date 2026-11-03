import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatHistoryAmount } from '../src/amount.ts'

test('history amounts use the SDK normalized 18-decimal value for Fuse and other sources', () => {
  assert.equal(formatHistoryAmount(120n * 10n ** 18n), '120.00')
  assert.equal(formatHistoryAmount(8n * 10n ** 18n), '8.00')
  assert.equal(formatHistoryAmount(35n * 10n ** 18n), '35.00')
})
