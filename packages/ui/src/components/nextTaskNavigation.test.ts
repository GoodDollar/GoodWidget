import assert from 'node:assert/strict'
import test from 'node:test'

import { isAllowedExternalCtaUrl } from './nextTaskNavigation.ts'
import { invokeHostCallbackSafely } from './invokeHostCallbackSafely.ts'

test('accepts http and https CTA targets', () => {
  assert.equal(isAllowedExternalCtaUrl('https://gooddollar.org/claim'), true)
  assert.equal(isAllowedExternalCtaUrl('http://example.com'), true)
})

test('rejects javascript:, data:, and malformed CTA targets', () => {
  assert.equal(isAllowedExternalCtaUrl('javascript:alert(1)'), false)
  assert.equal(isAllowedExternalCtaUrl('data:text/html,<script>alert(1)</script>'), false)
  assert.equal(isAllowedExternalCtaUrl('not a url'), false)
})

test('invokeHostCallbackSafely forwards the payload to the callback', () => {
  const receivedPayloads: unknown[] = []
  invokeHostCallbackSafely('onShown', (payload: { contentId: string }) => receivedPayloads.push(payload), {
    contentId: 'a',
  })
  assert.deepEqual(receivedPayloads, [{ contentId: 'a' }])
})

test('invokeHostCallbackSafely contains a throwing callback instead of rethrowing', () => {
  assert.doesNotThrow(() =>
    invokeHostCallbackSafely(
      'onClicked',
      () => {
        throw new Error('integrator bug')
      },
      { ctaTarget: 'https://example.com' },
    ),
  )
})

test('invokeHostCallbackSafely is a no-op when no callback is passed', () => {
  assert.doesNotThrow(() => invokeHostCallbackSafely('onDismissed', undefined, { reason: 'skip-link' }))
})
