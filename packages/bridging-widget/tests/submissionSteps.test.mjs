import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildSubmissionSteps } from '../src/adapter/submissionSteps.ts'

test('preparation failure does not mark an unperformed approval completed', () => {
  const steps = buildSubmissionSteps('failed', true, null, 'Unable to prepare bridge.')
  assert.deepEqual(steps.map((step) => step.status), ['pending', 'pending', 'pending'])
  assert.match(steps[2].description, /Awaiting confirmation/)
  assert.equal(steps[2].title, 'Source confirmation')
})

test('bridge failure preserves approval completion without claiming source confirmation', () => {
  const steps = buildSubmissionSteps('failed', true, 'bridging', 'Network unavailable.')
  assert.deepEqual(steps.map((step) => step.status), ['completed', 'failed', 'pending'])
  assert.match(steps[2].description, /Awaiting confirmation/)
})

test('only successful source confirmation completes the final step', () => {
  const steps = buildSubmissionSteps('completed', false, null, null)
  assert.deepEqual(steps.map((step) => step.status), ['completed', 'completed'])
  assert.match(steps[1].description, /source-chain transaction is confirmed/)
})

test('an actual approval failure stays visible even when the earlier quote did not require approval', () => {
  const steps = buildSubmissionSteps('failed', false, 'approving', 'Approval failed.')
  assert.equal(steps[0].id, 'approving')
  assert.equal(steps[0].status, 'failed')
  assert.equal(steps[0].description, 'Approval failed.')
  assert.equal(buildSubmissionSteps('approving', false, null, null)[0].status, 'active')
})
