import assert from 'node:assert/strict'
import test from 'node:test'

import { isAllowedExternalCtaUrl } from './nextTaskNavigation.ts'
import { invokeHostCallbackSafely } from './invokeHostCallbackSafely.ts'
import {
  NEXT_TASK_HEADLINE,
  NEXT_TASK_SUPPORTING_COPY,
  NEXT_TASK_RECOMMENDED_LABEL,
  NEXT_TASK_SKIP_LABEL,
  type NextTaskContent,
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

test('NextTaskModal configurable copy falls back to standard defaults when unset', () => {
  const minimalContent: NextTaskContent = {
    title: 'Daily Task',
    description: 'Verify your proof of humanity',
    ctaLabel: 'Verify now',
    ctaTarget: 'https://gooddollar.org/verify',
  }

  assert.equal(minimalContent.headline ?? NEXT_TASK_HEADLINE, 'One good next step')
  assert.equal(
    minimalContent.supportingCopy ?? NEXT_TASK_SUPPORTING_COPY,
    'Small actions today create a bigger impact tomorrow. Thanks for being part of GoodDollar.',
  )
  assert.equal(minimalContent.recommendedLabel ?? NEXT_TASK_RECOMMENDED_LABEL, 'RECOMMENDED')
  assert.equal(minimalContent.skipLabel ?? NEXT_TASK_SKIP_LABEL, 'Skip for now')
})

test('NextTaskModal custom copy overrides default text correctly', () => {
  const customContent: NextTaskContent = {
    title: 'Custom Title',
    description: 'Custom Description',
    ctaLabel: 'Click Me',
    ctaTarget: 'https://example.com',
    headline: 'Your Custom Header',
    supportingCopy: 'Custom sub-headline explaining the action.',
    recommendedLabel: 'HOT DECK',
    skipLabel: 'Maybe later',
    statusLabel: 'Identity verified',
  }

  assert.equal(customContent.headline ?? NEXT_TASK_HEADLINE, 'Your Custom Header')
  assert.equal(customContent.supportingCopy ?? NEXT_TASK_SUPPORTING_COPY, 'Custom sub-headline explaining the action.')
  assert.equal(customContent.recommendedLabel ?? NEXT_TASK_RECOMMENDED_LABEL, 'HOT DECK')
  assert.equal(customContent.skipLabel ?? NEXT_TASK_SKIP_LABEL, 'Maybe later')
  assert.equal(customContent.statusLabel, 'Identity verified')
})
