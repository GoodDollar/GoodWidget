#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { packages } from './packages.mjs'

const repositoryUrl = 'https://github.com/GoodDollar/GoodWidget.git'

// Keep npm's legal/source metadata aligned with the repository rather than
// relying on each package author to remember the same publication fields.
for (const expected of packages) {
  const manifest = JSON.parse(readFileSync(`${expected.dir}/package.json`, 'utf8'))

  assert.equal(manifest.name, expected.name)
  assert.notEqual(manifest.private, true, `${manifest.name} must remain public`)
  assert.equal(manifest.license, 'MIT', `${manifest.name} needs the MIT license`)
  assert.equal(
    manifest.repository?.url,
    repositoryUrl,
    `${manifest.name} needs its source repository`,
  )
  assert.equal(
    manifest.repository?.directory,
    expected.dir,
    `${manifest.name} needs its monorepo directory`,
  )
  assert.equal(
    manifest.publishConfig?.access,
    'public',
    `${manifest.name} needs explicit public npm access`,
  )
}

const license = readFileSync('LICENSE', 'utf8')
assert.match(license, /^MIT License\n/, 'The repository needs an MIT LICENSE file')

console.log(`Validated metadata for ${packages.length} production packages.`)
