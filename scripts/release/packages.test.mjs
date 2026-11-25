import test from 'node:test'
import assert from 'node:assert/strict'
import {
  affectedPackages,
  compareStableVersions,
  isReleaseRelevant,
  nextVersion,
  packages,
  pathsForPush,
  publishIfMissing,
  releaseMarker,
  stableVersion,

  walletDispatchEnabled,
} from './packages.mjs'

const names = (paths) => affectedPackages(paths).map((pkg) => pkg.name)
const widgets = packages.filter((pkg) => pkg.kind === 'widget').map((pkg) => pkg.name)

test('ui changes cascade through core, embed, and every production widget', () => {
  assert.deepEqual(
    names(['packages/ui/src/Button.tsx']),
    packages.map((pkg) => pkg.name),
  )
})
test('core changes cascade to embed and every production widget', () => {
  assert.deepEqual(names(['packages/core/src/provider.tsx']), [
    '@goodwidget/core',
    '@goodwidget/embed',
    ...widgets,
  ])
})
test('embed changes cascade only to production widgets', () => {
  assert.deepEqual(names(['packages/embed/src/bridge.ts']), ['@goodwidget/embed', ...widgets])
})
test('widget-only fixes release only that widget', () => {
  assert.deepEqual(names(['packages/goodreserve-widget/src/amount.ts']), [
    '@goodwidget/goodreserve-widget',
  ])
})
test('docs, tests, stories, and screenshots are no-op changes', () => {
  assert.equal(isReleaseRelevant('packages/ui/src/Button.test.tsx'), false)
  assert.deepEqual(
    names([
      'docs/PACKAGING.md',
      'packages/ui/README.md',
      'packages/ui/src/Button.test.tsx',
      'packages/goodreserve-widget/screenshots/a.png',
    ]),
    [],
  )
})
test('root resolution changes release the complete allowlist', () => {
  assert.deepEqual(
    names(['pnpm-lock.yaml']),
    packages.map((pkg) => pkg.name),
  )
})
test('a widget that consumes another widget is released after it', () => {
  assert.deepEqual(names(['packages/citizen-claim-widget/src/claim.ts']), [
    '@goodwidget/citizen-claim-widget',
    '@goodwidget/superfluid-campaign-widget',
  ])
})
test('excluded packages never enter the production allowlist', () => {
  assert.deepEqual(
    names([
      'packages/governance-widget/src/index.ts',
      'packages/claim-widget-theme-demo/src/index.ts',
    ]),
    [],
  )
})
test('bootstrap strips prerelease without increment and subsequent releases patch bump', () => {
  assert.equal(stableVersion('0.2.0-beta'), '0.2.0')
  assert.equal(nextVersion('0.2.0-beta', false), '0.2.0')
  assert.equal(nextVersion('0.2.0', true), '0.2.1')
  assert.ok(compareStableVersions('1.0.10', '1.0.9') > 0)
})
test('release marker is stable for loop prevention', () => {
  assert.equal(releaseMarker, '[goodwidget release]')
})
test('recovery reuses the integrity of an existing exact version without publishing', () => {
  const result = publishIfMissing('@goodwidget/example', '1.2.3', {
    readRecord: () => ({ version: '1.2.3', integrity: 'sha512-existing' }),
    publish: () => assert.fail('must not republish an existing version'),
  })
  assert.equal(result, 'sha512-existing')
})

test('successful publish uses the tarball integrity without another registry read', () => {
  let reads = 0
  const result = publishIfMissing('@goodwidget/example', '1.2.3', {
    readRecord: () => {
      assert.equal(++reads, 1)
      return null
    },
    publish: () => Buffer.from('abc'),
  })
  assert.equal(
    result,
    'sha512-3a81oZNherrMQXNJriBBMRLm+k6JqX6iCp7u5ktV05ohkpkqJ0/BqDa6PCOj/uu9RU1EI2Q86A4qmslPpUyknw==',
  )
})

test('a rejected publish still fails the release', () => {
  assert.throws(
    () => publishIfMissing('@goodwidget/example', '1.2.3', {
      readRecord: () => null,
      publish: () => { throw new Error('npm publish rejected') },
    }),
    /npm publish rejected/,
  )
})

test('wallet dispatch requires both explicit activation and its scoped PAT', () => {
  assert.equal(walletDispatchEnabled({ GOODWALLET_DISPATCH_PAT: 'secret' }), false)
  assert.equal(walletDispatchEnabled({ ENABLE_GOODWALLET_DISPATCH: 'true' }), false)
  assert.equal(
    walletDispatchEnabled({
      ENABLE_GOODWALLET_DISPATCH: 'false',
      GOODWALLET_DISPATCH_PAT: 'secret',
    }),
    false,
  )
  assert.equal(
    walletDispatchEnabled({
      ENABLE_GOODWALLET_DISPATCH: 'true',
      GOODWALLET_DISPATCH_PAT: 'secret',
    }),
    true,
  )
})
test('first creation of next bootstraps the full production allowlist', () => {
  const paths = pathsForPush('0000000000000000000000000000000000000000', [])
  assert.deepEqual(affectedPackages(paths), packages)
  assert.deepEqual(pathsForPush('a'.repeat(40), ['packages/goodreserve-widget/src/amount.ts']), [
    'packages/goodreserve-widget/src/amount.ts',
  ])
})
