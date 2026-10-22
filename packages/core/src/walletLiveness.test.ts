import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveLiveAddress,
  resolveTrackedAddress,
  resolveVerifiedAddress,
} from './walletLiveness.ts'

const ADDRESS = '0x6d2000000000000000000000000000000000fff4'
const OTHER_ADDRESS = '0x1111111111111111111111111111111111111111'

test('an address survives while the wallet still reports accounts', () => {
  assert.equal(resolveLiveAddress(ADDRESS, false), ADDRESS)
})

test('a wallet reporting no accounts drops the address', () => {
  // The locked-MetaMask case: AppKit still hands down a cached address, the
  // wallet says it has nothing, and the widget must render as disconnected.
  assert.equal(resolveLiveAddress(ADDRESS, true), null)
})

test('the veto cannot invent an address', () => {
  assert.equal(resolveLiveAddress(null, false), null)
  assert.equal(resolveLiveAddress(null, true), null)
})

test('verification fails closed when the wallet has no accounts', () => {
  assert.equal(resolveVerifiedAddress([], { hasAddressOverride: true, candidate: ADDRESS }), null)
  assert.equal(resolveVerifiedAddress([], { hasAddressOverride: false, candidate: ADDRESS }), null)
})

test('verification keeps the overridden address when the wallet has accounts', () => {
  assert.equal(
    resolveVerifiedAddress([ADDRESS], { hasAddressOverride: true, candidate: ADDRESS }),
    ADDRESS,
  )
})

test('verification does not swap identities behind the integrator', () => {
  // The user switched accounts in MetaMask while the SDK still points at the
  // old one. The session is signable, so verification passes — but returning
  // the wallet's account would change who the widget thinks it is acting for.
  assert.equal(
    resolveVerifiedAddress([OTHER_ADDRESS], { hasAddressOverride: true, candidate: ADDRESS }),
    ADDRESS,
  )
})

test('verification adopts the wallet account when we track it ourselves', () => {
  assert.equal(
    resolveVerifiedAddress([OTHER_ADDRESS], { hasAddressOverride: false, candidate: ADDRESS }),
    OTHER_ADDRESS,
  )
})

test('an accountsChanged event clears a tracked address', () => {
  assert.equal(resolveTrackedAddress(ADDRESS, [], 'event'), null)
})

test('a polled empty read leaves a tracked address alone', () => {
  // A reconnect can briefly report no accounts; clearing on that would drop a
  // session that is about to come back.
  assert.equal(resolveTrackedAddress(ADDRESS, [], 'poll'), ADDRESS)
})

test('both sources adopt an account the wallet reports', () => {
  assert.equal(resolveTrackedAddress(null, [OTHER_ADDRESS], 'event'), OTHER_ADDRESS)
  assert.equal(resolveTrackedAddress(ADDRESS, [OTHER_ADDRESS], 'poll'), OTHER_ADDRESS)
})
