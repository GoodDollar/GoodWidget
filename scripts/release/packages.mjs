// This allowlist is deliberately topological: shared foundations precede their consumers.
// affectedPackages() preserves this order for versioning, packing, and npm publication.
export const packages = [
  { dir: 'packages/ui', name: '@goodwidget/ui', kind: 'shared', dependencies: [] },
  {
    dir: 'packages/core',
    name: '@goodwidget/core',
    kind: 'shared',
    dependencies: ['@goodwidget/ui'],
  },
  {
    dir: 'packages/embed',
    name: '@goodwidget/embed',
    kind: 'shared',
    dependencies: ['@goodwidget/ui', '@goodwidget/core'],
  },
  {
    dir: 'packages/ai-credits-widget',
    name: '@goodwidget/ai-credits-widget',
    kind: 'widget',
    dependencies: ['@goodwidget/ui', '@goodwidget/core', '@goodwidget/embed'],
  },
  {
    dir: 'packages/citizen-claim-widget',
    name: '@goodwidget/citizen-claim-widget',
    kind: 'widget',
    dependencies: ['@goodwidget/ui', '@goodwidget/core', '@goodwidget/embed'],
  },
  {
    dir: 'packages/goodreserve-widget',
    name: '@goodwidget/goodreserve-widget',
    kind: 'widget',
    dependencies: ['@goodwidget/ui', '@goodwidget/core', '@goodwidget/embed'],
  },
  {
    dir: 'packages/staking-migration-widget',
    name: '@goodwidget/staking-migration-widget',
    kind: 'widget',
    dependencies: ['@goodwidget/ui', '@goodwidget/core', '@goodwidget/embed'],
  },
  {
    dir: 'packages/streaming-widget',
    name: '@goodwidget/streaming-widget',
    kind: 'widget',
    dependencies: ['@goodwidget/ui', '@goodwidget/core', '@goodwidget/embed'],
  },
]

export const productionPackageNames = new Set(packages.map((pkg) => pkg.name))
export const releaseMarker = '[goodwidget release]'

const rootReleaseFiles = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  'tsconfig.base.json',
])

export function isReleaseRelevant(path) {
  if (rootReleaseFiles.has(path)) return true
  if (/(^|\/)(?:docs?|tests?|__tests__|screenshots?|fixtures?)(\/|$)/i.test(path)) return false
  if (
    /(?:\.stories\.[cm]?[jt]sx?|\.test\.[cm]?[jt]sx?|\.spec\.[cm]?[jt]sx?|\.mdx?|\.snap)$/i.test(
      path,
    )
  )
    return false
  return packages.some(
    (pkg) =>
      path === `${pkg.dir}/package.json` ||
      path.startsWith(`${pkg.dir}/src/`) ||
      path.startsWith(`${pkg.dir}/tsup.`) ||
      path.startsWith(`${pkg.dir}/tsconfig.`) ||
      path === `${pkg.dir}/integration-manifest.json`,
  )
}

export function affectedPackages(changedPaths) {
  const relevant = changedPaths.filter(isReleaseRelevant)
  if (relevant.length === 0) return []

  const affected = new Set()
  if (relevant.some((path) => rootReleaseFiles.has(path))) {
    for (const pkg of packages) affected.add(pkg.name)
  } else {
    for (const pkg of packages) {
      if (relevant.some((path) => path === pkg.dir || path.startsWith(`${pkg.dir}/`))) {
        affected.add(pkg.name)
      }
    }
  }

  // Release every transitive published consumer so its resolved workspace ranges and
  // tarball are rebuilt against the newly released dependency.
  let changed = true
  while (changed) {
    changed = false
    for (const pkg of packages) {
      if (
        !affected.has(pkg.name) &&
        pkg.dependencies.some((dependency) => affected.has(dependency))
      ) {
        affected.add(pkg.name)
        changed = true
      }
    }
  }
  return packages.filter((pkg) => affected.has(pkg.name))
}

export function stableVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-.+)?$/)
  if (!match) throw new Error(`Unsupported package version: ${version}`)
  return `${match[1]}.${match[2]}.${match[3]}`
}

export function nextVersion(version, currentVersionIsPublished) {
  const normalized = stableVersion(version)
  // First publication keeps the checked-in stable version (and strips a legacy prerelease
  // suffix); later publications are patch releases.
  if (!currentVersionIsPublished) return normalized
  const [major, minor, patch] = normalized.split('.').map(Number)
  return `${major}.${minor}.${patch + 1}`
}

export function compareStableVersions(left, right) {
  const leftParts = stableVersion(left).split('.').map(Number)
  const rightParts = stableVersion(right).split('.').map(Number)
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index]
  }
  return 0
}

export function registryReleaseMatches(record, latest, expectedVersion) {
  return (
    record?.version === expectedVersion &&
    Boolean(record.integrity) &&
    latest === expectedVersion
  )
}

export function walletDispatchEnabled(environment) {
  // A credential alone must never activate cross-repository automation.
  return (
    environment.ENABLE_GOODWALLET_DISPATCH === 'true' &&
    Boolean(environment.GOODWALLET_DISPATCH_PAT)
  )
}

export function pathsForPush(baseSha, diffPaths) {
  // GitHub reports an all-zero base for the first push of next. Treat that bootstrap as a
  // release of the complete production allowlist rather than an empty diff.
  return /^0{40}$/.test(baseSha) ? packages.map((pkg) => `${pkg.dir}/package.json`) : diffPaths
}
