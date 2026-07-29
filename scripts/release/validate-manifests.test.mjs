import assert from 'node:assert/strict'
import test from 'node:test'
import { createReleaseEnvelope, validateManifest } from './validate-manifests.mjs'

const descriptor = {
  schemaVersion: '2.0.0',
  hostContractVersion: '1.0.0',
  widgetId: 'goodwidget.goodreserve',
  packageName: '@goodwidget/goodreserve-widget',
  entries: {
    react: { export: 'GoodReserveWidget' },
    webComponent: {
      registerPath: './register',
      tagName: 'gw-goodreserve-widget',
    },
  },
}

const packageJson = {
  name: '@goodwidget/goodreserve-widget',
  files: ['dist', 'integration-manifest.json'],
  exports: {
    '.': './dist/index.js',
    './register': './dist/register.js',
    './integration-manifest': './integration-manifest.json',
  },
}

test('accepts the minimal v2 descriptor', () => {
  assert.doesNotThrow(() => validateManifest(descriptor, packageJson))
})

test('rejects undeclared fields and entry points missing from the package', () => {
  assert.throws(
    () => validateManifest({ ...descriptor, selectors: {} }, packageJson),
    /descriptor must contain exactly/,
  )
  assert.throws(
    () =>
      validateManifest(descriptor, {
        ...packageJson,
        exports: { ...packageJson.exports, './register': undefined },
      }),
    /does not export \.\/register/,
  )
})

test('builds a release envelope without duplicating descriptor fields', () => {
  const envelope = createReleaseEnvelope(descriptor, {
    version: '1.2.3',
    integrity: `sha512-${'a'.repeat(86)}==`,
    sourceSha: 'a'.repeat(40),
    releaseUrl: 'https://github.com/GoodDollar/GoodWidget/tree/goodreserve-widget-v1.2.3',
  })

  assert.deepEqual(Object.keys(envelope), [
    'descriptor',
    'version',
    'integrity',
    'sourceSha',
    'releaseUrl',
    'idempotencyKey',
  ])
  assert.equal(envelope.idempotencyKey, '@goodwidget/goodreserve-widget@1.2.3')
})

test('rejects prerelease versions and malformed provenance', () => {
  const release = {
    version: '1.2.3',
    integrity: `sha512-${'a'.repeat(86)}==`,
    sourceSha: 'a'.repeat(40),
    releaseUrl: 'https://github.com/GoodDollar/GoodWidget/tree/goodreserve-widget-v1.2.3',
  }

  assert.throws(
    () => createReleaseEnvelope(descriptor, { ...release, version: '1.2.3-beta.1' }),
    /stable semver/,
  )
  assert.throws(
    () => createReleaseEnvelope(descriptor, { ...release, integrity: 'sha256-nope' }),
    /sha512/,
  )
  assert.throws(
    () => createReleaseEnvelope(descriptor, { ...release, sourceSha: 'abc' }),
    /sourceSha/,
  )
})
