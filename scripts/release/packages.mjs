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
  {
    dir: 'packages/superfluid-campaign-widget',
    name: '@goodwidget/superfluid-campaign-widget',
    kind: 'widget',
    // This widget also consumes another published widget, so it must be released
    // after it rather than alongside it.
    dependencies: [
      '@goodwidget/ui',
      '@goodwidget/core',
      '@goodwidget/embed',
      '@goodwidget/citizen-claim-widget',
    ],
  },
]

export const productionPackageNames = new Set(packages.map((pkg) => pkg.name))
export const releaseMarker = '[goodwidget release]'

// Two publication channels share one pipeline. `dev` exists so GoodWallet can integrate a
// widget change before it is promoted, and is deliberately unable to move the `latest` tag
// or write to the repository.
export const channels = {
  dev: {
    distTag: 'dev',
    prereleaseIdentifier: 'dev',
    activationVariable: 'ENABLE_GOODWALLET_DEV_DISPATCH',
    commitsVersions: false,
  },
  production: {
    distTag: 'latest',
    prereleaseIdentifier: null,
    activationVariable: 'ENABLE_GOODWALLET_DISPATCH',
    commitsVersions: true,
  },
}

export function channelConfig(channel) {
  const config = channels[channel]
  if (!config) throw new Error(`Unknown release channel: ${channel}`)
  return config
}

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

// A dev build numbers itself beneath the stable version it is a candidate for, so
// `0.1.13-dev.4` sorts below `0.1.13` and can never be mistaken for the promoted release.
export function devVersion(baseStableVersion, publishedVersions = []) {
  const base = stableVersion(baseStableVersion)
  const pattern = new RegExp(`^${base.replace(/\./g, '\\.')}-dev\\.(\\d+)$`)
  const highest = publishedVersions.reduce((max, version) => {
    const match = version.match(pattern)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `${base}-dev.${highest + 1}`
}

export function registryReleaseMatches(record, channelTagVersion, expectedVersion) {
  return (
    record?.version === expectedVersion &&
    Boolean(record.integrity) &&
    channelTagVersion === expectedVersion
  )
}

export function walletDispatchEnabled(environment, channel = 'production') {
  // A credential alone must never activate cross-repository automation, and each channel
  // is switched on separately so wallet dev integration can run before production does.
  const { activationVariable } = channelConfig(channel)
  return environment[activationVariable] === 'true' && Boolean(environment.GOODWALLET_DISPATCH_PAT)
}

export function pathsForPush(baseSha, diffPaths) {
  // GitHub reports an all-zero base for the first push of next. Treat that bootstrap as a
  // release of the complete production allowlist rather than an empty diff.
  return /^0{40}$/.test(baseSha) ? packages.map((pkg) => `${pkg.dir}/package.json`) : diffPaths
}

// Several widgets export their own version as a runtime constant. Automated bumps must
// carry it along, and PR validation asserts it, so a published bundle cannot report a
// version the registry never saw.
export const packageVersionConstantPattern = /(packageVersion:\s*')([^']*)(')/

export function readPackageVersionConstant(source) {
  return source.match(packageVersionConstantPattern)?.[2] ?? null
}

export function withPackageVersionConstant(source, version) {
  if (readPackageVersionConstant(source) === null) return source
  return source.replace(packageVersionConstantPattern, `$1${version}$3`)
}
