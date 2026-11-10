#!/usr/bin/env node
// Translates a Penpot design spec (spec/*.json + meta.json) into Tamagui-oriented build notes.
//
// Usage:  node docs/design-files/scripts/spec-to-tamagui.mjs docs/design-files/<feature> [--check]
//
// Reads   <feature>/spec/tokens.json, spec/components/*.json, spec/journey/*.json, spec/journey.json, meta.json
// Writes  <feature>/generated/{components,journey,component-to-code-map,validation}.md
// With --check the script writes nothing and exits 1 when the spec has errors (unknown tokens,
// map entries pointing at missing files, instances with no code mapping). No dependencies.
//
// Rules, in short: a Penpot token name becomes a Tamagui `$token` (resolveToken), Penpot flex layout
// becomes XStack/YStack props (translateLayout, translateSizing), and every Penpot component
// instance is resolved to a code target through meta.json `componentMap` (describeCodeTarget).

import fs from 'node:fs'
import path from 'node:path'

const featureDir = path.resolve(process.argv[2] ?? '')
const isCheckOnly = process.argv.includes('--check')
// docs/design-files/<feature> -> repo root, used to verify code targets exist on disk.
const repoRoot = path.resolve(featureDir, '../../..')

if (!process.argv[2] || !fs.existsSync(path.join(featureDir, 'spec'))) {
  console.error('Usage: spec-to-tamagui.mjs <docs/design-files/feature-dir> [--check]')
  process.exit(2)
}

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(featureDir, relativePath), 'utf8'))

const readJsonDirectory = (relativeDirectory) =>
  fs
    .readdirSync(path.join(featureDir, relativeDirectory))
    .filter((fileName) => fileName.endsWith('.json'))
    .sort()
    .map((fileName) => readJson(path.join(relativeDirectory, fileName)))

const tokensSpec = readJson('spec/tokens.json')
const metaSpec = readJson('meta.json')
const journeySpec = readJson('spec/journey.json')
const componentSpecs = readJsonDirectory('spec/components')
const journeyFrameSpecs = readJsonDirectory('spec/journey')

// ---------------------------------------------------------------------------
// Validation bookkeeping
// ---------------------------------------------------------------------------

const errors = []
const warnings = []
// `prop=value -> $token` -> number of occurrences and first location, to keep the report readable.
const inferredBindings = new Map()
const rawValues = []

// ---------------------------------------------------------------------------
// Token catalog: which tokens exist, per Mode theme
// ---------------------------------------------------------------------------

const tokenNamesByTheme = Object.fromEntries(
  tokensSpec.themes.map((theme) => [
    theme.name,
    new Set(theme.activeSets.flatMap((setName) => Object.keys(tokensSpec.sets[setName] ?? {}))),
  ]),
)
const everyTokenName = new Set(Object.values(tokenNamesByTheme).flatMap((names) => [...names]))
const componentThemeNames = new Set(
  Object.keys(tokensSpec.sets)
    .filter((setName) => setName.startsWith('component/'))
    .flatMap((setName) => Object.keys(tokensSpec.sets[setName]).map((tokenName) => tokenName.split('.')[0])),
)

// Raw-number scales used to infer a token when the designer left a value unbound.
const tokenScales = {
  space: scaleFromTokens('space'),
  radius: scaleFromTokens('radius'),
  fontSize: scaleFromTokens('fontSize.body'),
}

/** Builds { rawNumber: tokenKey } for one numeric scale, e.g. space.4 = 16 -> { 16: '4' }. */
function scaleFromTokens(prefix) {
  const scale = {}
  for (const [tokenName, tokenValue] of Object.entries(tokensSpec.sets['core/dimensions'] ?? {})) {
    reverseScaleEntry(scale, prefix, tokenName, tokenValue)
  }
  for (const [tokenName, tokenValue] of Object.entries(tokensSpec.sets['core/typography'] ?? {})) {
    reverseScaleEntry(scale, prefix, tokenName, tokenValue)
  }
  return scale
}

function reverseScaleEntry(scale, prefix, tokenName, tokenValue) {
  const isInScale = tokenName.startsWith(`${prefix}.`) && typeof tokenValue === 'number'
  const tokenKey = tokenName.slice(prefix.length + 1)
  // `true` is the default alias of another step, so it must not win the reverse lookup.
  if (isInScale && tokenKey !== 'true' && !(tokenValue in scale)) scale[tokenValue] = tokenKey
}

// ---------------------------------------------------------------------------
// Penpot token name -> Tamagui token reference
// ---------------------------------------------------------------------------

/**
 * Resolves a Penpot token name to its Tamagui reference.
 * Returns { reference, subTheme } or null when the token does not exist in the catalog.
 * `subTheme` is set for component tokens (claimCard.background -> $background inside ClaimCard).
 */
function resolveToken(tokenName, locationLabel) {
  if (!everyTokenName.has(tokenName)) {
    errors.push(`Unknown token \`${tokenName}\` at ${locationLabel}`)
    return null
  }
  for (const [themeName, names] of Object.entries(tokenNamesByTheme)) {
    if (!names.has(tokenName)) warnings.push(`Token \`${tokenName}\` is missing in ${themeName} mode (${locationLabel})`)
  }
  const [firstSegment, ...remainingSegments] = tokenName.split('.')
  if (componentThemeNames.has(firstSegment)) {
    // Component tokens live in the component's own sub-theme (presets.ts: light_ClaimCard, dark_ClaimCard).
    const subTheme = firstSegment[0].toUpperCase() + firstSegment.slice(1)
    return { reference: `$${remainingSegments.join('.')}`, subTheme }
  }
  if (firstSegment === 'theme' || firstSegment === 'color') return { reference: `$${remainingSegments.join('.')}` }
  // space.N / radius.N / size.N / fontSize.<family>.N / fontFamily.<family>: the last segment is the Tamagui key.
  return { reference: `$${remainingSegments[remainingSegments.length - 1]}` }
}

/** Formats a resolved token as a prop value, noting the sub-theme when there is one. */
function formatTokenValue(resolvedToken) {
  const subThemeSuffix = resolvedToken.subTheme ? ` (theme ${resolvedToken.subTheme})` : ''
  return `"${resolvedToken.reference}"${subThemeSuffix}`
}

/** Expands a composite shadow token into Tamagui's shadow props using the token's own value. */
function expandShadowToken(tokenName, locationLabel) {
  const shadowDefinition = Object.values(tokensSpec.sets)
    .map((tokenSet) => tokenSet[tokenName])
    .find(Boolean)?.[0]
  if (!shadowDefinition) {
    errors.push(`Unknown shadow token \`${tokenName}\` at ${locationLabel}`)
    return []
  }
  const colorTokenName = shadowDefinition.color.replace(/[{}]/g, '')
  const resolvedColor = resolveToken(colorTokenName, locationLabel)
  return [
    `shadowColor=${resolvedColor ? formatTokenValue(resolvedColor) : '"?"'}`,
    `shadowOffset={{ width: ${shadowDefinition.offsetX}, height: ${shadowDefinition.offsetY} }}`,
    `shadowRadius={${shadowDefinition.blur}}`,
  ]
}

// ---------------------------------------------------------------------------
// Penpot token property -> Tamagui prop
// ---------------------------------------------------------------------------

const cornerPropNames = {
  borderRadiusTopLeft: 'borderTopLeftRadius',
  borderRadiusTopRight: 'borderTopRightRadius',
  borderRadiusBottomRight: 'borderBottomRightRadius',
  borderRadiusBottomLeft: 'borderBottomLeftRadius',
}
const directTokenPropNames = {
  strokeColor: 'borderColor',
  fontFamilies: 'fontFamily',
  fontSize: 'fontSize',
  fontWeight: 'fontWeight',
  lineHeight: 'lineHeight',
  letterSpacing: 'letterSpacing',
  rowGap: 'rowGap',
  columnGap: 'columnGap',
  opacity: 'opacity',
  width: 'width',
  height: 'height',
  paddingTop: 'paddingTop',
  paddingRight: 'paddingRight',
  paddingBottom: 'paddingBottom',
  paddingLeft: 'paddingLeft',
}

/** Translates every token binding of a node into Tamagui props; also returns the resolved token per Penpot property. */
function translateTokenBindings(node, locationLabel) {
  const props = []
  const resolvedByProperty = {}
  const cornerValues = {}
  for (const [penpotProperty, tokenName] of Object.entries(node.tokens ?? {})) {
    if (penpotProperty === 'shadow') {
      props.push(...expandShadowToken(tokenName, locationLabel))
      continue
    }
    const resolvedToken = resolveToken(tokenName, locationLabel)
    if (!resolvedToken) continue
    resolvedByProperty[penpotProperty] = resolvedToken
    if (penpotProperty === 'fill') {
      // Fill is the text colour on text nodes and the background everywhere else.
      props.push(`${node.type === 'text' ? 'color' : 'backgroundColor'}=${formatTokenValue(resolvedToken)}`)
    } else if (penpotProperty in cornerPropNames) {
      cornerValues[penpotProperty] = formatTokenValue(resolvedToken)
    } else if (penpotProperty in directTokenPropNames && !penpotProperty.startsWith('padding') && !penpotProperty.endsWith('Gap')) {
      props.push(`${directTokenPropNames[penpotProperty]}=${formatTokenValue(resolvedToken)}`)
    } else if (!(penpotProperty in directTokenPropNames)) {
      warnings.push(`Token property \`${penpotProperty}\` has no Tamagui mapping (${locationLabel})`)
    }
  }
  props.push(...collapseCornerRadii(cornerValues, node, locationLabel))
  return { props, resolvedByProperty }
}

/** Four equal corner tokens become one `borderRadius`; otherwise the per-corner props are kept. */
function collapseCornerRadii(cornerValues, node, locationLabel) {
  const cornerEntries = Object.entries(cornerValues)
  if (cornerEntries.length === 0) return []
  const distinctValues = new Set(cornerEntries.map(([, value]) => value))
  if (cornerEntries.length === 4 && distinctValues.size === 1) return [`borderRadius=${[...distinctValues][0]}`]
  return cornerEntries.map(([penpotProperty, value]) => `${cornerPropNames[penpotProperty]}=${value}`)
}

// ---------------------------------------------------------------------------
// Layout -> stack props
// ---------------------------------------------------------------------------

const justifyContentValues = { start: 'flex-start', center: 'center', end: 'flex-end', 'space-between': 'space-between', 'space-around': 'space-around', 'space-evenly': 'space-evenly' }
const alignItemsValues = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' }

/**
 * Picks the value for one spacing prop: the bound token when present, otherwise an exact-match
 * token inferred from the raw number (marked †), otherwise the raw number (marked ‡).
 */
function spacingValue(rawNumber, boundToken, scaleName, locationLabel, propName) {
  if (boundToken) return formatTokenValue(boundToken)
  const inferredKey = tokenScales[scaleName][rawNumber]
  if (inferredKey !== undefined) {
    const bindingLabel = `${propName.replace(/(Top|Right|Bottom|Left)$/, '')}=${rawNumber} -> \`$${inferredKey}\` (${scaleName}.${inferredKey})`
    const previousEntry = inferredBindings.get(bindingLabel)
    inferredBindings.set(bindingLabel, { count: (previousEntry?.count ?? 0) + 1, firstLocation: previousEntry?.firstLocation ?? locationLabel })
    return `"$${inferredKey}"†`
  }
  rawValues.push(`${propName}=${rawNumber} has no ${scaleName} token at ${locationLabel}`)
  return `{${rawNumber}}‡`
}

/** Translates flex layout (direction, alignment, gap, padding) into XStack/YStack props. */
function translateLayout(node, resolvedByProperty, locationLabel) {
  const { layout } = node
  const props = []
  if (layout.alignItems !== 'stretch') props.push(`alignItems="${alignItemsValues[layout.alignItems]}"`)
  if (layout.justifyContent !== 'start') props.push(`justifyContent="${justifyContentValues[layout.justifyContent]}"`)

  const isColumn = layout.direction === 'column'
  const gapRawValue = isColumn ? layout.gap.row : layout.gap.column
  const gapToken = resolvedByProperty[isColumn ? 'rowGap' : 'columnGap']
  if (gapRawValue !== 0 || gapToken) props.push(`gap=${spacingValue(gapRawValue, gapToken, 'space', locationLabel, 'gap')}`)

  const paddingByEdge = {}
  for (const edge of ['Top', 'Right', 'Bottom', 'Left']) {
    const rawValue = layout.padding[edge.toLowerCase()]
    const boundToken = resolvedByProperty[`padding${edge}`]
    if (rawValue !== 0 || boundToken) paddingByEdge[edge] = spacingValue(rawValue, boundToken, 'space', locationLabel, `padding${edge}`)
  }
  props.push(...collapsePadding(paddingByEdge))
  return props
}

/** Equal edges collapse to `padding`, mirrored edges to paddingHorizontal/Vertical. */
function collapsePadding(paddingByEdge) {
  const { Top, Right, Bottom, Left } = paddingByEdge
  const allEdgesPresent = [Top, Right, Bottom, Left].every(Boolean)
  if (allEdgesPresent && new Set([Top, Right, Bottom, Left]).size === 1) return [`padding=${Top}`]
  const props = []
  const horizontalIsMirrored = Left && Left === Right
  const verticalIsMirrored = Top && Top === Bottom
  if (horizontalIsMirrored) props.push(`paddingHorizontal=${Left}`)
  if (verticalIsMirrored) props.push(`paddingVertical=${Top}`)
  for (const [edge, value] of Object.entries(paddingByEdge)) {
    const isCovered = (horizontalIsMirrored && (edge === 'Left' || edge === 'Right')) || (verticalIsMirrored && (edge === 'Top' || edge === 'Bottom'))
    if (!isCovered) props.push(`padding${edge}=${value}`)
  }
  return props
}

/** Translates Penpot sizing (fix/auto/fill) relative to the parent's flex direction. */
function translateSizing(node, parentDirection, resolvedByProperty) {
  if (node.type === 'text' || !node.sizing) return []
  const props = []
  const axes = [
    { name: 'width', mode: node.sizing.horizontal, length: node.size[0], isMainAxis: parentDirection === 'row' },
    { name: 'height', mode: node.sizing.vertical, length: node.size[1], isMainAxis: parentDirection === 'column' },
  ]
  for (const axis of axes) {
    if (axis.mode === 'fill') props.push(axis.isMainAxis ? 'flex={1}' : 'alignSelf="stretch"')
    // A parent-less frame is the artboard; its size is the device frame, not a prop.
    if (axis.mode === 'fix' && parentDirection) {
      const boundToken = resolvedByProperty[axis.name]
      if (!boundToken) props.push(`${axis.name}={${axis.length}}`)
    }
  }
  return props
}

/** Translates the node's non-token styling: stroke width, raw radius, raw opacity. */
function translateUnboundValues(node, locationLabel) {
  const props = []
  for (const [unboundKey, unboundValue] of Object.entries(node.unbound ?? {})) {
    if (unboundKey === 'strokes') {
      props.push(`borderWidth={${unboundValue[0].width}}`)
    } else if (unboundKey === 'borderRadius') {
      const [topLeft, topRight, bottomRight, bottomLeft] = unboundValue
      props.push(`borderTopLeftRadius={${topLeft}}`, `borderTopRightRadius={${topRight}}`, `borderBottomRightRadius={${bottomRight}}`, `borderBottomLeftRadius={${bottomLeft}}`)
      rawValues.push(`borderRadius [${unboundValue.join(', ')}] is raw (no radius token covers it) at ${locationLabel}`)
    } else if (unboundKey === 'shadows') {
      // Penpot keeps a resolved copy of a token-bound shadow here; only a shadow with no token is a raw value.
      if (!node.tokens?.shadow) rawValues.push(`shadow is not bound to a shadow token at ${locationLabel}`)
    } else if (unboundKey === 'opacity') {
      props.push(`opacity={${unboundValue}}`)
    } else {
      warnings.push(`Unhandled unbound property \`${unboundKey}\` at ${locationLabel}`)
    }
  }
  return props
}

// ---------------------------------------------------------------------------
// Node -> annotated pseudo-JSX tree
// ---------------------------------------------------------------------------

const componentMap = metaSpec.componentMap
const instanceUsageCounts = {}

function toCamelCase(label) {
  const [firstWord, ...otherWords] = label.split(/\s+/)
  return firstWord.toLowerCase() + otherWords.map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase()).join('')
}

/** Describes where an instance's component lives in code, from meta.json. */
function describeCodeTarget(componentName, locationLabel) {
  const mapEntry = componentMap[componentName]
  if (!mapEntry) {
    errors.push(`Component \`${componentName}\` has no entry in meta.json componentMap (${locationLabel})`)
    return 'UNMAPPED'
  }
  const target = mapEntry.file ?? mapEntry.proposedFile ?? 'n/a'
  const exportSuffix = mapEntry.export ? ` (${mapEntry.export})` : ''
  return `${mapEntry.status}: ${target}${exportSuffix}`
}

/** Renders one node (and children) as indented lines of annotated pseudo-JSX. */
function renderNode(node, parentDirection, depth, framePath) {
  const indent = '  '.repeat(depth)
  // The root node is the frame itself, so its label is not repeated.
  const locationLabel = depth === 0 ? framePath : `${framePath} > ${node.name}`
  const { props: tokenProps, resolvedByProperty } = translateTokenBindings(node, locationLabel)
  const props = [...tokenProps, ...translateSizing(node, parentDirection, resolvedByProperty), ...translateUnboundValues(node, locationLabel)]
  if (node.flexChild?.absolute) {
    props.push('position="absolute"')
    warnings.push(`Absolute child without exported offset: ${locationLabel}`)
  }
  if (node.layout) props.push(...translateLayout(node, resolvedByProperty, locationLabel))
  if (node.clipContent === false) props.push('overflow="visible"')
  if (node.hidden) props.push('/* hidden in design */')

  const lines = []
  if (node.instanceOf) {
    const { component, variant } = node.instanceOf
    instanceUsageCounts[component] = (instanceUsageCounts[component] ?? 0) + 1
    const variantProps = Object.entries(variant ?? {}).map(([key, value]) => `${toCamelCase(key)}="${value}"`)
    lines.push(`${indent}<${[component, ...variantProps, ...props].join(' ')} />   // ${describeCodeTarget(component, locationLabel)}`)
    lines.push(...renderOverrides(node.overrides, indent + '  ', locationLabel))
    return lines
  }

  if (node.type === 'text') {
    const textStyle = node.text.align !== 'left' ? [`textAlign="${node.text.align}"`] : []
    lines.push(`${indent}<${['Text', ...props, ...textStyle].join(' ')}>${node.text.characters}</Text>`)
    return lines
  }

  const elementName = node.layout ? (node.layout.direction === 'row' ? 'XStack' : 'YStack') : 'Stack'
  const childrenDirection = node.layout?.direction
  lines.push(`${indent}<${[elementName, `/* ${node.name} */`, ...props].join(' ')}>`)
  for (const childNode of node.children ?? []) lines.push(...renderNode(childNode, childrenDirection, depth + 1, locationLabel))
  lines.push(`${indent}</${elementName}>`)
  return lines
}

/** Lists text overrides, hidden layers and variant-carrying nested instances of an instance. */
function renderOverrides(overrides, indent, locationLabel) {
  const lines = []
  for (const textOverride of overrides?.texts ?? []) lines.push(`${indent}text  ${textOverride.layer} = "${textOverride.characters}"`)
  const hiddenLayerCounts = {}
  for (const hiddenLayer of overrides?.hiddenLayers ?? []) hiddenLayerCounts[hiddenLayer] = (hiddenLayerCounts[hiddenLayer] ?? 0) + 1
  for (const [layer, count] of Object.entries(hiddenLayerCounts)) lines.push(`${indent}hide  ${layer}${count > 1 ? ` (x${count})` : ''}`)
  for (const nestedInstance of overrides?.nestedInstances ?? []) {
    const variantProps = Object.entries(nestedInstance.variant ?? {}).map(([key, value]) => `${toCamelCase(key)}="${value}"`)
    instanceUsageCounts[nestedInstance.component] = (instanceUsageCounts[nestedInstance.component] ?? 0) + 1
    lines.push(`${indent}nested  ${nestedInstance.layer}: <${[nestedInstance.component, ...variantProps].join(' ')} />   // ${describeCodeTarget(nestedInstance.component, locationLabel)}`)
  }
  return lines
}

// ---------------------------------------------------------------------------
// Markdown documents
// ---------------------------------------------------------------------------

const legend = [
  '> Generated by `docs/design-files/scripts/spec-to-tamagui.mjs`. Do not edit by hand: change the Penpot file or `meta.json`, re-export, regenerate.',
  '> `†` value was not bound to a token in Penpot; the token shown is an exact numeric match in the scale. `‡` raw number with no matching token.',
  '> `// status: file` after an instance is its code target from `meta.json` (exists / extend / new / private / third-party / widget-internal).',
].join('\n')

function buildComponentsDocument() {
  const sections = [`# ${metaSpec.feature}: component structure\n`, legend]
  for (const componentSpec of componentSpecs) {
    sections.push(`\n## ${componentSpec.name}\n\nCode target: \`${describeCodeTarget(componentSpec.name, componentSpec.name)}\`\n`)
    for (const variant of componentSpec.variants) {
      const variantLabel = Object.entries(variant.properties ?? {}).map(([key, value]) => `${key}=${value}`).join(', ') || 'default'
      const treeLines = renderNode(variant.root, undefined, 0, `${componentSpec.name} [${variantLabel}]`)
      sections.push(`### ${variantLabel}\n\n\`\`\`text\n${treeLines.join('\n')}\n\`\`\`\n`)
    }
  }
  return sections.join('\n')
}

function buildJourneyDocument() {
  const sections = [`# ${journeySpec.title}\n`, legend, `\n${journeySpec.notes}\n`]
  for (const frameSpec of journeyFrameSpecs) {
    const frameSummary = journeySpec.frames.find((frame) => frame.step === frameSpec.step)
    const treeLines = renderNode(frameSpec.root, undefined, 0, frameSpec.name)
    sections.push(`\n## Step ${frameSpec.step}: ${frameSpec.name}\n\nTransitions: ${frameSummary?.transitions ?? 'none'}\n\n\`\`\`text\n${treeLines.join('\n')}\n\`\`\`\n`)
  }
  return sections.join('\n')
}

function buildComponentMapDocument() {
  const specifiedComponentNames = new Set(componentSpecs.map((componentSpec) => componentSpec.name))
  const rows = Object.entries(componentMap).map(([componentName, entry]) => {
    const target = entry.file ?? entry.proposedFile ?? 'n/a'
    const exportName = entry.export ? ` \`${entry.export}\`` : ''
    const storybook = entry.storybook ? `\`${entry.storybook}\`` : ''
    const specLink = specifiedComponentNames.has(componentName) ? `spec/components/${componentName}.json` : 'embedded widget / shared'
    return `| ${componentName} | ${entry.status} | \`${target}\`${exportName} | ${storybook} | ${specLink} | ${instanceUsageCounts[componentName] ?? 0} | ${entry.change ?? entry.notes ?? ''} |`
  })
  return [
    `# ${metaSpec.feature}: component-to-code map\n`,
    legend,
    '\n| Penpot component | Status | Code target | Storybook | Structural spec | Instances in spec | Notes |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '\n## Status legend\n',
    ...Object.entries(metaSpec.statusLegend).map(([status, meaning]) => `- **${status}**: ${meaning}`),
    '\n## Open questions\n',
    ...metaSpec.openQuestions.map((question) => `- ${question}`),
    '',
  ].join('\n')
}

function buildValidationDocument() {
  const listOrNone = (items) => (items.length ? [...new Set(items)].map((item) => `- ${item}`).join('\n') : '- none')
  return [
    `# ${metaSpec.feature}: spec validation\n`,
    `Errors block the check; warnings need a human look.\n`,
    `## Errors (${new Set(errors).size})\n\n${listOrNone(errors)}\n`,
    `## Warnings (${new Set(warnings).size})\n\n${listOrNone(warnings)}\n`,
    `## Inferred token bindings (${inferredBindings.size} distinct)\n\nValues the designer left unbound that exactly match a scale token. Bind them in Penpot to remove the inference.\n\n${listOrNone([...inferredBindings].map(([label, { count, firstLocation }]) => `${label}: ${count}x, first at ${firstLocation}`))}\n`,
    `## Raw values with no token (${new Set(rawValues).size})\n\n${listOrNone(rawValues)}\n`,
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Map integrity: every referenced file must exist, every instance must be mapped
// ---------------------------------------------------------------------------

function validateComponentMap() {
  for (const [componentName, entry] of Object.entries(componentMap)) {
    for (const referencedFile of [entry.file, entry.storybook].filter(Boolean)) {
      if (!fs.existsSync(path.join(repoRoot, referencedFile))) errors.push(`meta.json componentMap.${componentName} points at missing file \`${referencedFile}\``)
    }
    if (entry.status === 'new' && entry.file) errors.push(`meta.json componentMap.${componentName} is "new" but sets \`file\`; use \`proposedFile\``)
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

validateComponentMap()
const componentsDocument = buildComponentsDocument()
const journeyDocument = buildJourneyDocument()
const componentMapDocument = buildComponentMapDocument()
const validationDocument = buildValidationDocument()

console.log(`errors: ${new Set(errors).size}  warnings: ${new Set(warnings).size}  inferred bindings: ${inferredBindings.size} distinct  raw values: ${new Set(rawValues).size}`)
for (const error of new Set(errors)) console.error(`ERROR ${error}`)

if (!isCheckOnly) {
  const outputDirectory = path.join(featureDir, 'generated')
  fs.mkdirSync(outputDirectory, { recursive: true })
  fs.writeFileSync(path.join(outputDirectory, 'components.md'), componentsDocument)
  fs.writeFileSync(path.join(outputDirectory, 'journey.md'), journeyDocument)
  fs.writeFileSync(path.join(outputDirectory, 'component-to-code-map.md'), componentMapDocument)
  fs.writeFileSync(path.join(outputDirectory, 'validation.md'), validationDocument)
  console.log(`wrote ${path.relative(process.cwd(), outputDirectory)}/{components,journey,component-to-code-map,validation}.md`)
}
process.exit(errors.length ? 1 : 0)
