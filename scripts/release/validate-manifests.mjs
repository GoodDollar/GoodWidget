import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import { packages } from './packages.mjs'

const allowedKeys = {
  root: ['schemaVersion', 'hostContractVersion', 'widgetId', 'packageName', 'entries'],
  entries: ['react', 'webComponent'],
  react: ['export'],
  webComponent: ['registerPath', 'tagName'],
}

function exactKeys(value, keys, label) {
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

export function createReleaseEnvelope(descriptor, { version, integrity, sourceSha, releaseUrl }) {
  if (!/^\d+\.\d+\.\d+$/.test(version))
    throw new Error(`Release version must be stable semver, got ${version}`)
  if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(integrity))
    throw new Error('Release integrity must be an npm sha512 integrity value')
  if (!/^[0-9a-f]{40}$/.test(sourceSha))
    throw new Error('Release sourceSha must be a 40-character lowercase commit SHA')
  const parsedReleaseUrl = new URL(releaseUrl)
  if (parsedReleaseUrl.protocol !== 'https:') throw new Error('Release URL must use HTTPS')

  return {
    descriptor,
    version,
    integrity,
    sourceSha,
    releaseUrl,
    idempotencyKey: `${descriptor.packageName}@${version}`,
  }
}

export async function validateAllManifests() {
  const schema = JSON.parse(
    await readFile('schemas/widget-integration-manifest.schema.json', 'utf8'),
  )
  const ajv = new Ajv2020({ allErrors: true })
  const validateSchema = ajv.compile(schema)
  for (const pkg of packages.filter((entry) => entry.kind === 'widget')) {
    const packageJson = JSON.parse(await readFile(`${pkg.dir}/package.json`, 'utf8'))
    const descriptor = JSON.parse(await readFile(`${pkg.dir}/integration-manifest.json`, 'utf8'))
    if (!validateSchema(descriptor)) {
      throw new Error(
        `${pkg.name} schema validation failed: ${ajv.errorsText(validateSchema.errors)}`,
      )
    }
    validateManifest(descriptor, packageJson)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await validateAllManifests()
  console.log('Validated all production widget integration descriptors.')
}
