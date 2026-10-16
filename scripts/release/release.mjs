import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  affectedPackages,
  channelConfig,
  compareStableVersions,
  devVersion,
  nextVersion,
  pathsForPush,
  registryReleaseMatches,
  releaseMarker,
  walletDispatchEnabled,
  withPackageVersionConstant,
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

function registryDistTag(name, distTag) {
  try {
    return JSON.parse(
      run('npm', ['view', name, `dist-tags.${distTag}`, '--json'], { capture: true }),
    )
  } catch {
    return null
  }
}

function registryVersions(name) {
  try {
    const versions = JSON.parse(run('npm', ['view', name, 'versions', '--json'], { capture: true }))
    return Array.isArray(versions) ? versions : [versions]
  } catch {
    return []
  }
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function verifyRegistryRelease(name, version, distTag) {
  // npm metadata is eventually consistent. Do not tag or notify GoodWallet
  // until both the immutable release and the mutable channel tag agree.
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const record = registryRecord(name, version)
    const tagged = registryDistTag(name, distTag)
    if (registryReleaseMatches(record, tagged, version)) return record
    if (attempt < 6) await wait(2_000)
  }
  throw new Error(`Registry verification failed for ${name}@${version} or its ${distTag} tag`)
}

function changedPaths(base, head) {
  const diff = /^0{40}$/.test(base)
    ? []
    : run('git', ['diff', '--name-only', `${base}..${head}`], { capture: true })
        .split('\n')
        .filter(Boolean)
  return pathsForPush(base, diff)
}

const releaseBranches = { production: 'next', dev: 'main' }

// Publication validates what it publishes. Linting or building the whole workspace would
// let unrelated app code block a widget release, which is the opposite of the point.
const filters = (selected, suffix = '') =>
  selected.flatMap((pkg) => ['--filter', `${pkg.name}${suffix}`])

function assertReleaseBranch(channel) {
  const expected = releaseBranches[channel]
  const branch =
    process.env.GITHUB_REF_NAME || run('git', ['branch', '--show-current'], { capture: true })
  if (branch !== expected)
    throw new Error(
      `Refusing a ${channel} release from ${branch || 'detached HEAD'}; the ${channel} channel only runs from ${expected}`,
    )
}

// The published bundle must not advertise a version the registry never saw, so the
// bump carries the runtime constant with it.
function writeVersion(pkg, json, version) {
  json.version = version
  writeFileSync(`${pkg.dir}/package.json`, `${JSON.stringify(json, null, 2)}\n`)
  const registerEntry = `${pkg.dir}/src/register.ts`
  if (!existsSync(registerEntry)) return []
  const source = readFileSync(registerEntry, 'utf8')
  const updated = withPackageVersionConstant(source, version)
  if (updated === source) return []
  writeFileSync(registerEntry, updated)
  return [registerEntry]
}

// The stable version this commit is a candidate for: the checked-in version when it has
// never been published, otherwise a patch above whatever the registry already carries.
function stableCandidate(pkg, json) {
  let candidate = nextVersion(json.version, Boolean(registryRecord(pkg.name, json.version)))
  const latest = registryDistTag(pkg.name, 'latest')
  if (latest && compareStableVersions(candidate, latest) <= 0) {
    candidate = nextVersion(latest, true)
  }
  return candidate
}

function resolveVersion(pkg, json, channel) {
  const candidateBase = stableCandidate(pkg, json)
  if (channel === 'dev') {
    let candidate = devVersion(candidateBase, registryVersions(pkg.name))
    while (registryRecord(pkg.name, candidate)) {
      candidate = devVersion(candidateBase, [...registryVersions(pkg.name), candidate])
    }
    return candidate
  }
  let candidate = candidateBase
  while (registryRecord(pkg.name, candidate)) {
    candidate = nextVersion(candidate, true)
  }
  return candidate
}

async function dispatchWidget(pkg, { version, integrity, sourceCommit, releaseUrl, channel }) {
  const { distTag } = channelConfig(channel)
  if (!walletDispatchEnabled(process.env, channel)) {
    console.log(
      `GoodWallet ${channel} dispatch is disabled for ${pkg.name}@${version}; activation requires ${channelConfig(channel).activationVariable}=true and the scoped PAT.`,
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
    channel,
    distTag,
  })
  const response = await fetch('https://api.github.com/repos/GoodDollar/GoodWallet/dispatches', {
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
  })
  if (!response.ok)
    throw new Error(`GoodWallet dispatch failed: ${response.status} ${await response.text()}`)
}

function packageReleaseUrl(pkg, version, channel, sourceCommit) {
  // Production releases are reachable by their pushed tag. A dev build is never tagged,
  // so its provenance link is the exact commit it was produced from.
  return channel === 'production'
    ? `https://github.com/GoodDollar/GoodWidget/tree/${pkg.name.replace('@goodwidget/', '')}-v${version}`
    : `https://github.com/GoodDollar/GoodWidget/commit/${sourceCommit}`
}

async function release(channel) {
  // This assertion is repeated in code so local/manual invocation cannot bypass the
  // workflow-level main-versus-next publication boundary.
  assertReleaseBranch(channel)
  const { distTag, commitsVersions } = channelConfig(channel)
  const head = process.env.GITHUB_SHA || 'HEAD'
  const subject = run('git', ['log', '-1', '--pretty=%s', head], { capture: true })
  if (subject.includes(releaseMarker))
    return console.log('Release marker commit detected; nothing to release.')
  const base = process.env.RELEASE_BASE_SHA || process.argv[3] || `${head}^`
  const selected = affectedPackages(changedPaths(base, head))
  if (selected.length === 0) return console.log('No release-relevant package changes.')

  // selected follows the topological allowlist, so consumers are processed after every
  // affected shared dependency.
  const touched = []
  for (const pkg of selected) {
    const json = packageJson(pkg)
    touched.push(
      `${pkg.dir}/package.json`,
      ...writeVersion(pkg, json, resolveVersion(pkg, json, channel)),
    )
  }
  run('pnpm', ['install', '--lockfile-only', '--frozen-lockfile=false'])
  await validateAllManifests()
  run('pnpm', [...filters(selected), 'run', 'lint'])
  // The `...` suffix pulls in each package's workspace dependencies, so a widget-only
  // release still builds against freshly built shared packages in a clean checkout.
  run('pnpm', [...filters(selected, '...'), 'run', 'build'])

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
  if (commitsVersions) {
    // Versions and the lockfile become authoritative before publication. The marker makes
    // the resulting push a no-op for release-next.yml and enables exact-version recovery.
    run('git', ['add', ...new Set(touched), 'pnpm-lock.yaml'])
    run('git', ['commit', '-m', `${releaseMarker} ${versions.join(', ')}`])
    run('git', ['push', 'origin', 'next'])
  } else {
    // A dev build is a disposable candidate. It never writes to main, so an in-flight
    // production release is never blocked or conflicted by wallet integration traffic.
    console.log(`Publishing uncommitted dev candidates: ${versions.join(', ')}`)
  }

  // Publish in dependency order and require both immutable registry integrity
  // and the channel tag before creating local tags or notifying GoodWallet.
  const verifiedReleases = new Map()
  for (const pkg of selected) {
    const version = packageJson(pkg).version
    if (!registryRecord(pkg.name, version))
      run('npm', [
        'publish',
        tarballs.get(pkg.name),
        '--access',
        'public',
        '--provenance',
        '--tag',
        distTag,
      ])
    verifiedReleases.set(pkg.name, await verifyRegistryRelease(pkg.name, version, distTag))
    if (!commitsVersions) continue
    run('git', [
      'tag',
      '-a',
      `${pkg.name.replace('@goodwidget/', '')}-v${version}`,
      '-m',
      `${pkg.name}@${version}`,
    ])
  }
  if (commitsVersions) run('git', ['push', 'origin', '--tags'])

  // Cross-repository dispatch happens only after the whole npm release is verified and
  // its tags are pushed; a partial or unverified release cannot reach GoodWallet.
  const sourceCommit = run('git', ['rev-parse', 'HEAD'], { capture: true })
  for (const pkg of selected.filter((entry) => entry.kind === 'widget')) {
    const version = packageJson(pkg).version
    await dispatchWidget(pkg, {
      version,
      integrity: verifiedReleases.get(pkg.name).integrity,
      sourceCommit,
      releaseUrl: packageReleaseUrl(pkg, version, channel, sourceCommit),
      channel,
    })
  }
}

await release(process.argv[2] === 'dev' ? 'dev' : 'production')
