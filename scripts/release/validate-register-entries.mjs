#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { packages } from './packages.mjs'

const require = createRequire(import.meta.url)

// Next.js and other SSR-aware consumers may evaluate package exports in Node
// while building their module graph. Every production registration entry must
// be importable without HTMLElement, customElements, document, or window.
for (const pkg of packages.filter((entry) => entry.kind === 'widget')) {
  const entryUrl = pathToFileURL(resolve(pkg.dir, 'dist/register.js')).href
  const module = await import(entryUrl)

  assert.equal(
    typeof module.register,
    'function',
    `${pkg.name} must export a register function`,
  )

  const serverProbeTag = `ssr-probe-${pkg.name.split('/').at(-1)}`
  assert.equal(
    await module.register(serverProbeTag),
    serverProbeTag,
    `${pkg.name} register() must be a no-op without DOM globals`,
  )

  // The package publishes both import and require conditions. Exercise the
  // CommonJS artifact too so a safe ESM entry cannot hide an eager CJS bundle.
  const commonJsModule = require(resolve(pkg.dir, 'dist/register.cjs'))
  const commonJsProbeTag = `cjs-${serverProbeTag}`
  assert.equal(
    await commonJsModule.register(commonJsProbeTag),
    commonJsProbeTag,
    `${pkg.name} CommonJS register() must be a no-op without DOM globals`,
  )
}

console.log('Validated SSR-safe ESM and CommonJS imports for all widget registration entries.')
