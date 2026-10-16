import { readFile } from 'node:fs/promises'
import { packages } from './packages.mjs'

const allowedKeys = {
  root: ['schemaVersion', 'hostContractVersion', 'widgetId', 'packageName', 'entries'],
  entries: ['react', 'webComponent'],
  react: ['export'],
  webComponent: ['registerPath', 'tagName'],
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object containing exactly: ${keys.join(', ')}`)
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (actual.join('\0') !== expected.join('\0'))
    throw new Error(`${label} must contain exactly: ${keys.join(', ')}`)
}

export function validateManifest(descriptor, packageJson) {
  // This descriptor intentionally contains only package identity and entry points.
  // Wallet presentation, provider policy, tests, and release provenance have separate owners.
  exactKeys(descriptor, allowedKeys.root, 'descriptor')
  exactKeys(descriptor.entries, allowedKeys.entries, 'entries')
  exactKeys(descriptor.entries.react, allowedKeys.react, 'entries.react')
  exactKeys(descriptor.entries.webComponent, allowedKeys.webComponent, 'entries.webComponent')

  if (descriptor.schemaVersion !== '2.0.0') throw new Error('Unsupported schemaVersion')
  if (!/^1\.\d+\.\d+$/.test(descriptor.hostContractVersion))
    throw new Error('Unsupported hostContractVersion')
  if (!/^goodwidget\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(descriptor.widgetId))
    throw new Error('Invalid widgetId')
  if (!/^@goodwidget\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(descriptor.packageName))
    throw new Error('Invalid packageName')
  if (!/^[A-Z][A-Za-z0-9]*$/.test(descriptor.entries.react.export))
    throw new Error('Invalid React export')
  if (descriptor.entries.webComponent.registerPath !== './register')
    throw new Error('Web Component registerPath must be ./register')
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(descriptor.entries.webComponent.tagName))
    throw new Error('Invalid Web Component tagName')
  if (descriptor.packageName !== packageJson.name)
    throw new Error(`packageName mismatch for ${packageJson.name}`)
  if (!packageJson.exports?.['./integration-manifest'])
    throw new Error(`${packageJson.name} does not export its integration descriptor`)
  if (!packageJson.files?.includes('integration-manifest.json'))
    throw new Error(`${packageJson.name} does not pack its integration descriptor`)
  if (!packageJson.exports?.['.'])
    throw new Error(`${packageJson.name} does not export its React entry`)
  if (!packageJson.exports?.[descriptor.entries.webComponent.registerPath])
    throw new Error(
      `${packageJson.name} does not export ${descriptor.entries.webComponent.registerPath}`,
    )
}

// Each channel accepts only the version shape it is allowed to produce, so a dev
// candidate can never be delivered to GoodWallet as a production release.
const channelVersionPatterns = {
  production: /^\d+\.\d+\.\d+$/,
  dev: /^\d+\.\d+\.\d+-dev\.\d+$/,
}

export function createReleaseEnvelope(
  descriptor,
  { version, integrity, sourceSha, releaseUrl, channel = 'production', distTag },
) {
  const versionPattern = channelVersionPatterns[channel]
  if (!versionPattern) throw new Error(`Unknown release channel: ${channel}`)
  if (!versionPattern.test(version))
    throw new Error(`Release version ${version} is not valid for the ${channel} channel`)
  if (typeof distTag !== 'string' || !/^[a-z][a-z0-9-]*$/.test(distTag))
    throw new Error('Release distTag must be an npm dist-tag name')
  if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(integrity))
    throw new Error('Release integrity must be an npm sha512 integrity value')
  if (!/^[0-9a-f]{40}$/.test(sourceSha))
    throw new Error('Release sourceSha must be a 40-character lowercase commit SHA')
  const parsedReleaseUrl = new URL(releaseUrl)
  if (parsedReleaseUrl.protocol !== 'https:') throw new Error('Release URL must use HTTPS')

  return {
    descriptor,
    channel,
    distTag,
    version,
    integrity,
    sourceSha,
    releaseUrl,
    idempotencyKey: `${descriptor.packageName}@${version}`,
  }
}

export async function validateAllManifests() {
  // validateManifest() is the enforcing implementation; schemas/ publishes the same
  // contract in a form GoodWallet can validate incoming payloads against. Keep the two
  // in step by hand — nothing here compiles the schema.
  for (const pkg of packages.filter((entry) => entry.kind === 'widget')) {
    const packageJson = JSON.parse(await readFile(`${pkg.dir}/package.json`, 'utf8'))
    const descriptor = JSON.parse(await readFile(`${pkg.dir}/integration-manifest.json`, 'utf8'))
    validateManifest(descriptor, packageJson)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await validateAllManifests()
  console.log('Validated all production widget integration descriptors.')
}
