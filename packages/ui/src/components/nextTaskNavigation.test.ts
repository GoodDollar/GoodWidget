import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isAllowedExternalCtaUrl,
  resolveCtaNavigationOutcome,
} from './nextTaskNavigation.ts'

test('accepts http and https CTA targets', () => {
  assert.equal(isAllowedExternalCtaUrl('https://gooddollar.org/claim'), true)
  assert.equal(isAllowedExternalCtaUrl('http://example.com'), true)
})

test('rejects javascript:, data:, and malformed CTA targets', () => {
  assert.equal(isAllowedExternalCtaUrl('javascript:alert(1)'), false)
  assert.equal(isAllowedExternalCtaUrl('data:text/html,<script>alert(1)</script>'), false)
  assert.equal(isAllowedExternalCtaUrl('not a url'), false)
})

test('no resolveNavigation passed -> fallback always runs (returns false)', () => {
  const outcome = resolveCtaNavigationOutcome('https://example.com', undefined, () => {})
  assert.equal(outcome, false)
})

test('resolveNavigation returning true -> host handled it, no fallback', () => {
  const outcome = resolveCtaNavigationOutcome('https://example.com', () => true, () => {})
  assert.equal(outcome, true)
})

test('resolveNavigation returning false/void -> fallback runs', () => {
  assert.equal(resolveCtaNavigationOutcome('https://example.com', () => false, () => {}), false)
  assert.equal(resolveCtaNavigationOutcome('https://example.com', () => undefined, () => {}), false)
})

test('resolveNavigation throwing -> treated as false, error reported via onError', () => {
  const errors: unknown[] = []
  const outcome = resolveCtaNavigationOutcome(
    'https://example.com',
    () => {
      throw new Error('host navigation failed')
    },
    (error) => errors.push(error),
  )
  assert.equal(outcome, false)
  assert.equal(errors.length, 1)
})
