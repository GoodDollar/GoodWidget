#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { packages } from './packages.mjs'

const allowlisted = new Set(packages.map((pkg) => pkg.name))

for (const expected of packages) {
  const manifest = JSON.parse(readFileSync(`${expected.dir}/package.json`, 'utf8'))

  assert.equal(manifest.name, expected.name)
  assert.notEqual(manifest.private, true, `${manifest.name} must remain public`)

  // The release order is driven by the declared graph, so it must match what the package
  // actually depends on. A missed edge silently skips a consumer's re-release.
  const actualDependencies = Object.keys({
    ...manifest.dependencies,
    ...manifest.peerDependencies,
  })
    .filter((name) => allowlisted.has(name))
    .sort()
  assert.deepEqual(
    [...expected.dependencies].sort(),
    actualDependencies,
    `${manifest.name} declares a release graph that does not match its dependencies`,
  )
}

console.log(`Validated metadata for ${packages.length} production packages.`)
