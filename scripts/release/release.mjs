import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  affectedPackages,
  compareStableVersions,
  nextVersion,
  packages,
  pathsForPush,
  registryReleaseMatches,
  releaseMarker,
  walletDispatchEnabled,
} from './packages.mjs'
import {
  createReleaseEnvelope,
  validateAllManifests,
  validateManifest,
} from './validate-manifests.mjs'

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    ...options,
  }).trim()
}

function packageJson(pkg) {
  return JSON.parse(readFileSync(`${pkg.dir}/package.json`, 'utf8'))
}

function registryRecord(name, version) {
  try {
    const record = JSON.parse(
      run('npm', ['view', `${name}@${version}`, '--json'], { capture: true }),
    )
    return { version: record.version, integrity: record.dist?.integrity }
  } catch {
    return null
  }
}

function registryLatest(name) {
  try {
    return JSON.parse(run('npm', ['view', name, 'dist-tags.latest', '--json'], { capture: true }))
  } catch {
    return null
  }
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function verifyRegistryRelease(name, version) {
  // npm metadata is eventually consistent. Do not tag or notify GoodWallet
  // until both the immutable release and the mutable `latest` channel agree.
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const record = registryRecord(name, version)
    const latest = registryLatest(name)
    if (registryReleaseMatches(record, latest, version)) return record
    if (attempt < 6) await wait(2_000)
  }
  throw new Error(`Registry verification failed for ${name}@${version} or its latest tag`)
}

function changedPaths(base, head) {
  const diff = /^0{40}$/.test(base)
    ? []
    : run('git', ['diff', '--name-only', `${base}..${head}`], { capture: true })
        .split('\n')
        .filter(Boolean)
  return pathsForPush(base, diff)
}

function assertNextBranch() {
  const branch =
    process.env.GITHUB_REF_NAME || run('git', ['branch', '--show-current'], { capture: true })
  if (branch !== 'next')
    throw new Error(
      `Refusing npm release from ${branch || 'detached HEAD'}; releases only run from next`,
    )
}

async function dispatchWidget(pkg, version, integrity, sourceCommit, releaseUrl) {
  if (!walletDispatchEnabled(process.env)) {
    console.log(
      `GoodWallet dispatch is disabled for ${pkg.name}@${version}; activation requires ENABLE_GOODWALLET_DISPATCH=true and the scoped PAT.`,
    )
    return
  }
  // The checked-in descriptor is immutable package capability metadata. Release
  // provenance is added beside it only after npm has returned the exact integrity.
  const descriptor = JSON.parse(readFileSync(`${pkg.dir}/integration-manifest.json`, 'utf8'))
  validateManifest(descriptor, packageJson(pkg))
  const envelope = createReleaseEnvelope(descriptor, {
    version,
    integrity,
    sourceSha: sourceCommit,
    releaseUrl,
  })
  const response = await fetch(
    'https://api.github.com/repos/GoodDollar/GoodWallet/repository/dispatches',
    {
      method: 'POST',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${process.env.GOODWALLET_DISPATCH_PAT}`,
        'x-github-api-version': '2022-11-28',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'goodwidget-released',
        client_payload: envelope,
      }),
    },
  )
  if (!response.ok)
    throw new Error(`GoodWallet dispatch failed: ${response.status} ${await response.text()}`)
}

async function release() {
  // This assertion is repeated in code so local/manual invocation cannot bypass the
  // workflow-level main-versus-next publication boundary.
  assertNextBranch()
  const head = process.env.GITHUB_SHA || 'HEAD'
  const subject = run('git', ['log', '-1', '--pretty=%s', head], { capture: true })
  if (subject.includes(releaseMarker))
    return console.log('Release marker commit detected; nothing to release.')
  const base = process.env.RELEASE_BASE_SHA || process.argv[2] || `${head}^`
  const selected = affectedPackages(changedPaths(base, head))
  if (selected.length === 0) return console.log('No release-relevant package changes.')

  // selected follows the topological allowlist, so consumers are processed after every
  // affected shared dependency.
  for (const pkg of selected) {
    const json = packageJson(pkg)
    let candidate = nextVersion(json.version, Boolean(registryRecord(pkg.name, json.version)))
    const latest = registryLatest(pkg.name)
    if (latest && compareStableVersions(candidate, latest) <= 0) {
      candidate = nextVersion(latest, true)
    }
    while (Boolean(registryRecord(pkg.name, candidate))) {
      candidate = nextVersion(candidate, true)
    }
    json.version = candidate
    writeFileSync(`${pkg.dir}/package.json`, `${JSON.stringify(json, null, 2)}\n`)
  }
  run('pnpm', ['install', '--lockfile-only', '--frozen-lockfile=false'])
  await validateAllManifests()
  run('pnpm', ['lint'])
  run('pnpm', ['build'])
  // Exercise the built `./register` exports in plain Node before packing.
  // This catches accidental DOM access that would break Next.js consumers.
  run('pnpm', ['validate:register-entries'])
  run('pnpm', ['test:release'])

  const packDir = mkdtempSync(join(tmpdir(), 'goodwidget-release-'))
  const tarballs = new Map()
  for (const pkg of selected) {
    run('pnpm', ['--dir', pkg.dir, 'pack', '--pack-destination', packDir])
    const tarball = readdirSync(packDir).find(
      (file) =>
        file.startsWith(pkg.name.replace('@', '').replace('/', '-')) && file.endsWith('.tgz'),
    )
    if (!tarball) throw new Error(`Unable to locate packed tarball for ${pkg.name}`)
    const listing = run('tar', ['-tzf', join(packDir, tarball)], { capture: true })
    if (
      !listing.includes('package/dist/index.js') ||
      (pkg.kind === 'widget' &&
        (!listing.includes('package/dist/register.js') ||
          !listing.includes('package/integration-manifest.json')))
    )
      throw new Error(`Tarball inspection failed for ${pkg.name}`)
    tarballs.set(pkg.name, join(packDir, tarball))
  }

  const versions = selected.map((pkg) => `${pkg.name}@${packageJson(pkg).version}`)
  // Versions and the lockfile become authoritative before publication. The marker makes
  // the resulting push a no-op for release-next.yml and enables exact-version recovery.
  run('git', ['add', ...selected.map((pkg) => `${pkg.dir}/package.json`), 'pnpm-lock.yaml'])
  run('git', ['commit', '-m', `${releaseMarker} ${versions.join(', ')}`])
  run('git', ['push', 'origin', 'next'])

  // Publish in dependency order and require both immutable registry integrity
  // and the `latest` tag before creating local tags or notifying GoodWallet.
  const verifiedReleases = new Map()
  for (const pkg of selected) {
    const version = packageJson(pkg).version
    if (!registryRecord(pkg.name, version))
      run('npm', ['publish', tarballs.get(pkg.name), '--access', 'public', '--provenance'])
    const verified = await verifyRegistryRelease(pkg.name, version)
    verifiedReleases.set(pkg.name, verified)
    run('git', [
      'tag',
      '-a',
      `${pkg.name.replace('@goodwidget/', '')}-v${version}`,
      '-m',
      `${pkg.name}@${version}`,
    ])
  }
  run('git', ['push', 'origin', '--tags'])

  // Cross-repository dispatch happens only after the whole npm release is verified and
  // its tags are pushed; a partial or unverified release cannot reach GoodWallet.
  const sourceCommit = run('git', ['rev-parse', 'HEAD'], { capture: true })
  for (const pkg of selected.filter((entry) => entry.kind === 'widget')) {
    const version = packageJson(pkg).version
    const verified = verifiedReleases.get(pkg.name)
    await dispatchWidget(
      pkg,
      version,
      verified.integrity,
      sourceCommit,
      `https://github.com/GoodDollar/GoodWidget/tree/${pkg.name.replace('@goodwidget/', '')}-v${version}`,
    )
  }
}

async function recover() {
  assertNextBranch()
  const requested = process.env.RECOVERY_PACKAGE
  const pkg = packages.find((entry) => entry.name === requested)
  if (!pkg) throw new Error(`RECOVERY_PACKAGE must be a production package, got ${requested}`)
  const version = packageJson(pkg).version
  // Recovery is idempotent: publish only when absent, then verify the exact committed
  // version before optionally replaying the wallet dispatch.
  if (!registryRecord(pkg.name, version))
    run('pnpm', [
      '--dir',
      pkg.dir,
      'publish',
      '--access',
      'public',
      '--provenance',
      '--no-git-checks',
    ])
  // Recovery owns the already committed version. If publication succeeded but
  // the mutable channel was not updated, repair it idempotently.
  if (registryLatest(pkg.name) !== version) {
    run('npm', ['dist-tag', 'add', `${pkg.name}@${version}`, 'latest'])
  }
  const verified = await verifyRegistryRelease(pkg.name, version)
  if (pkg.kind === 'widget') {
    const sourceCommit = run('git', ['rev-parse', 'HEAD'], { capture: true })
    await dispatchWidget(
      pkg,
      version,
      verified.integrity,
      sourceCommit,
      `https://github.com/GoodDollar/GoodWidget/tree/${pkg.name.replace('@goodwidget/', '')}-v${version}`,
    )
  }
}

const mode = process.argv[2]
if (mode === 'recover') await recover()
else await release()
