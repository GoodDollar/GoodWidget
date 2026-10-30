import assert from 'node:assert/strict'
import test from 'node:test'

import {
  NEXT_TASK_TRIGGER_EVENT,
  dispatchNextTaskTrigger,
  subscribeToNextTaskTrigger,
} from './nextTaskEventBus.ts'

test('subscribe receives the dispatched detail', () => {
  const received: unknown[] = []
  const unsubscribe = subscribeToNextTaskTrigger((detail) => received.push(detail))

  const detail = dispatchNextTaskTrigger({ source: 'claim' })

  assert.equal(received.length, 1)
  assert.deepEqual(received[0], detail)
  assert.equal(detail.source, 'claim')
  unsubscribe()
})

test('each dispatch gets a unique triggerId', () => {
  const first = dispatchNextTaskTrigger({ source: 'claim' })
  const second = dispatchNextTaskTrigger({ source: 'claim' })
  assert.notEqual(first.triggerId, second.triggerId)
})

test('metadata passes through untouched', () => {
  const received: unknown[] = []
  const unsubscribe = subscribeToNextTaskTrigger((detail) => received.push(detail))

  dispatchNextTaskTrigger({ source: 'claim', metadata: { chainId: 42220 } })

  assert.deepEqual((received[0] as { metadata?: unknown }).metadata, { chainId: 42220 })
  unsubscribe()
})

test('unsubscribe stops further delivery', () => {
  const received: unknown[] = []
  const unsubscribe = subscribeToNextTaskTrigger((detail) => received.push(detail))
  unsubscribe()

  dispatchNextTaskTrigger({ source: 'claim' })

  assert.equal(received.length, 0)
})

test('listeners only fire for the next-task trigger event name', () => {
  assert.equal(NEXT_TASK_TRIGGER_EVENT, 'gw:next-task-trigger')
})
