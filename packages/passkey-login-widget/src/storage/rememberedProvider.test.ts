import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createInMemoryStorage } from '../testFixtures.ts'
import { REMEMBERED_PROVIDER_STORAGE_KEY, readRememberedProviderId, rememberProviderId } from './rememberedProvider.ts'

function createFakeBrowserStorage() {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

describe('remembered provider', () => {
  const offeredProviders = [createInMemoryStorage('google-drive'), createInMemoryStorage('icloud')]

  it('stores only the provider id', () => {
    const browserStorage = createFakeBrowserStorage()
    rememberProviderId('icloud', browserStorage)
    assert.deepEqual([...browserStorage.values], [[REMEMBERED_PROVIDER_STORAGE_KEY, 'icloud']])
  })

  it('returns the remembered id only while that provider is still offered', () => {
    const browserStorage = createFakeBrowserStorage()
    rememberProviderId('icloud', browserStorage)
    assert.equal(readRememberedProviderId(offeredProviders, browserStorage), 'icloud')
    assert.equal(readRememberedProviderId([offeredProviders[0]], browserStorage), null)
  })

  it('returns null when nothing is remembered or storage is blocked', () => {
    assert.equal(readRememberedProviderId(offeredProviders, createFakeBrowserStorage()), null)
    const blockedStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
    }
    assert.equal(readRememberedProviderId(offeredProviders, blockedStorage), null)
  })
})
