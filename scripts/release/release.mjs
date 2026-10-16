import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  affectedPackages,
  compareStableVersions,
  nextVersion,
  pathsForPush,
  registryReleaseMatches,
  releaseMarker,
  withPackageVersionConstant,
} from './packages.mjs'

const RELEASE_BRANCH = 'main'

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
  // npm metadata is eventually consistent. Do not tag a release until both the immutable
  // record and the mutable `latest` channel agree.
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const record = registryRecord(name, version)
    if (registryReleaseMatches(record, registryLatest(name), version)) return record
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

function assertReleaseBranch() {
  // Repeated in code so a local or manual invocation cannot publish from a side branch.
  const branch =
    process.env.GITHUB_REF_NAME || run('git', ['branch', '--show-current'], { capture: true })
  if (branch !== RELEASE_BRANCH)
    throw new Error(
      `Refusing to publish from ${branch || 'detached HEAD'}; releases only run from ${RELEASE_BRANCH}`,
    )
}

// Publication validates what it publishes. Linting or building the whole workspace would
// let unrelated app code block a release, which is the opposite of the point.
const filters = (selected, suffix = '') =>
  selected.flatMap((pkg) => ['--filter', `${pkg.name}${suffix}`])

// The published bundle must not advertise a version the registry never saw, so the bump
// carries the runtime constant with it.
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

// The checked-in version when it has never been published, otherwise a patch above
// whatever the registry already carries. Skip anything already taken.
function resolveVersion(pkg, json) {
  let candidate = nextVersion(json.version, Boolean(registryRecord(pkg.name, json.version)))
  const latest = registryLatest(pkg.name)
  if (latest && compareStableVersions(candidate, latest) <= 0) {
    candidate = nextVersion(latest, true)
  }
  while (registryRecord(pkg.name, candidate)) {
    candidate = nextVersion(candidate, true)
  }
  return candidate
}

async function release() {
  assertReleaseBranch()
  const head = process.env.GITHUB_SHA || 'HEAD'
  const subject = run('git', ['log', '-1', '--pretty=%s', head], { capture: true })
  if (subject.includes(releaseMarker))
    return console.log('Release marker commit detected; nothing to release.')
  const base = process.env.RELEASE_BASE_SHA || process.argv[2] || `${head}^`

  // selected follows the topological allowlist, so every affected shared package is
  // versioned, built, packed and published before the widgets that consume it.
  const selected = affectedPackages(changedPaths(base, head))
  if (selected.length === 0) return console.log('No release-relevant package changes.')
  console.log(`Releasing in order: ${selected.map((pkg) => pkg.name).join(' -> ')}`)

  const touched = []
  for (const pkg of selected) {
    const json = packageJson(pkg)
    touched.push(`${pkg.dir}/package.json`, ...writeVersion(pkg, json, resolveVersion(pkg, json)))
  }
  run('pnpm', ['install', '--lockfile-only', '--frozen-lockfile=false'])
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
      (pkg.kind === 'widget' && !listing.includes('package/dist/register.js'))
    )
      throw new Error(`Tarball inspection failed for ${pkg.name}`)
    tarballs.set(pkg.name, join(packDir, tarball))
  }

  // Versions and the lockfile become authoritative before publication, so an interrupted
  // run leaves a committed version to republish rather than an unknown state. The marker
  // makes the resulting push a no-op for this same workflow.
  const versions = selected.map((pkg) => `${pkg.name}@${packageJson(pkg).version}`)
  run('git', ['add', ...new Set(touched), 'pnpm-lock.yaml'])
  run('git', ['commit', '-m', `${releaseMarker} ${versions.join(', ')}`])
  run('git', ['push', 'origin', RELEASE_BRANCH])

  for (const pkg of selected) {
    const version = packageJson(pkg).version
    if (!registryRecord(pkg.name, version))
      run('npm', ['publish', tarballs.get(pkg.name), '--access', 'public', '--provenance'])
    await verifyRegistryRelease(pkg.name, version)
    run('git', [
      'tag',
      '-a',
      `${pkg.name.replace('@goodwidget/', '')}-v${version}`,
      '-m',
      `${pkg.name}@${version}`,
    ])
  }
  run('git', ['push', 'origin', '--tags'])
  console.log(`Released ${versions.join(', ')}`)
}

await release()
