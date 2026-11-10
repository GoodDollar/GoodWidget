#!/usr/bin/env node
// Translates a Penpot design export into ONE build-spec markdown file for a follow-up agent.
//
// Usage:  node docs/design-files/scripts/spec-to-tamagui.mjs docs/design-files/<feature> [--check]
//
// Reads   <feature>/spec/**           local Penpot export (gitignored, produced by penpot-extract-spec.js)
//         <feature>/meta.json         hand-authored component-to-code map and open questions
//         packages/ui/src/presets.ts  the token catalog (goodWalletV2Preset), the single source of truth
// Writes  <feature>/design-spec.md    the only committed output
//
// With --check nothing is written: the output is regenerated in memory and compared with the committed
// design-spec.md. It exits 1 when the file is stale (Penpot changed, nobody regenerated) or the
// design has errors (tokens missing from presets.ts, map entries pointing at missing files, unmapped instances).
// The output is deterministic, so a clean re-export always reproduces the committed file byte for byte.
//
// Rules, in short: a Penpot token name becomes a Tamagui `$token` (resolveToken), Penpot flex layout
// becomes XStack/YStack props (translateLayout, translateSizing), and every Penpot component
// instance is resolved to a code target through meta.json `componentMap` (describeCodeTarget).
// Requires Node >= 22.18 (imports presets.ts directly).

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const featureDir = path.resolve(process.argv[2] ?? '')
const isCheckOnly = process.argv.includes('--check')
// docs/design-files/<feature> -> repo root, used to find presets.ts and verify code targets exist on disk.
const repoRoot = path.resolve(featureDir, '../../..')
const outputFilePath = path.join(featureDir, 'design-spec.md')

if (!process.argv[2] || !fs.existsSync(path.join(featureDir, 'meta.json'))) {
  console.error('Usage: spec-to-tamagui.mjs <docs/design-files/feature-dir> [--check]')
  process.exit(2)
}
if (!fs.existsSync(path.join(featureDir, 'spec'))) {
  console.error(`No local Penpot export in ${path.join(featureDir, 'spec')}. Re-export from Penpot first (see docs/design-files/README.md).`)
  process.exit(2)
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(featureDir, relativePath), 'utf8'))
}

function readJsonDirectory(relativeDirectory) {
  return fs
    .readdirSync(path.join(featureDir, relativeDirectory))
    .filter((fileName) => fileName.endsWith('.json'))
    .sort()
    .map((fileName) => readJson(path.join(relativeDirectory, fileName)))
}

const metaSpec = readJson('meta.json')
const journeySpec = readJson('spec/journey.json')
const componentSpecs = readJsonDirectory('spec/components')
const journeyFrameSpecs = readJsonDirectory('spec/journey')
const { goodWalletV2Preset: preset } = await import(pathToFileURL(path.join(repoRoot, 'packages/ui/src/presets.ts')).href)

// ---------------------------------------------------------------------------
// Validation bookkeeping
// ---------------------------------------------------------------------------

const errors = []
const warnings = []
// `prop=value -> $token` -> number of occurrences and first location, to keep the report readable.
const inferredBindings = new Map()
const rawValues = []

// ---------------------------------------------------------------------------
// Token catalog (presets.ts): which tokens exist, and raw-number scales for inference
// ---------------------------------------------------------------------------

const colorModes = ['light', 'dark']

// Raw-number scales used to infer a token when the designer left a value unbound.
const tokenScales = {
  space: reverseScale(preset.tokens.space),
  radius: reverseScale(preset.tokens.radius),
  fontSize: reverseScale(preset.typography.body.size),
}

/** Builds { rawNumber: tokenKey } for one numeric scale, e.g. space.4 = 16 -> { 16: '4' }. */
function reverseScale(scaleTokens) {
  const scale = {}
  for (const [tokenKey, tokenValue] of Object.entries(scaleTokens)) {
    // `true` is the default alias of another step, so it must not win the reverse lookup.
    if (tokenKey !== 'true' && !(tokenValue in scale)) scale[tokenValue] = tokenKey
  }
  return scale
}

/** Which colour modes (light/dark) define a key in the base theme or in a component sub-theme (light_Card). */
function modesDefiningThemeKey(subThemeName, themeKey) {
  return colorModes.filter((mode) => themeKey in (preset.themes[subThemeName ? `${mode}_${subThemeName}` : mode] ?? {}))
}

/**
 * Resolves a Penpot token name against presets.ts.
 * Returns { reference, subTheme } or null when presets.ts does not define it.
 * `subTheme` is set for component tokens (claimCard.background -> $background inside ClaimCard).
 */
function resolveToken(tokenName, locationLabel) {
  const [tokenGroup, ...keySegments] = tokenName.split('.')
  const fullKey = keySegments.join('.')
  const lastSegment = keySegments[keySegments.length - 1]
  const typographyFamily = preset.typography[keySegments[0]]
  const typographyScaleByGroup = { fontSize: 'size', fontWeight: 'weight', lineHeight: 'lineHeight', letterSpacing: 'letterSpacing' }

  if (tokenGroup === 'color' || tokenGroup === 'space' || tokenGroup === 'radius' || tokenGroup === 'size') {
    if (preset.tokens[tokenGroup]?.[fullKey] === undefined) return reportUnknownToken(tokenName, locationLabel)
    return { reference: tokenGroup === 'color' ? `$${fullKey}` : `$${lastSegment}` }
  }
  if (tokenGroup in typographyScaleByGroup) {
    if (typographyFamily?.[typographyScaleByGroup[tokenGroup]]?.[keySegments[1]] === undefined) return reportUnknownToken(tokenName, locationLabel)
    return { reference: `$${lastSegment}` }
  }
  if (tokenGroup === 'fontFamily') {
    if (typographyFamily?.family === undefined) return reportUnknownToken(tokenName, locationLabel)
    return { reference: `$${lastSegment}` }
  }

  // `theme.x` lives in the base light/dark themes; any other group is a component sub-theme (claimCard -> light_ClaimCard).
  const subThemeName = tokenGroup === 'theme' ? undefined : tokenGroup[0].toUpperCase() + tokenGroup.slice(1)
  const definingModes = modesDefiningThemeKey(subThemeName, fullKey)
  if (definingModes.length === 0) return reportUnknownToken(tokenName, locationLabel)
  if (definingModes.length < colorModes.length) warnings.push(`Token \`${tokenName}\` is only defined in ${definingModes.join('/')} mode in presets.ts (${locationLabel})`)
  return { reference: `$${fullKey}`, subTheme: subThemeName }
}

function reportUnknownToken(tokenName, locationLabel) {
  errors.push(`Token \`${tokenName}\` is not defined in packages/ui/src/presets.ts (${locationLabel})`)
  return null
}

/** Formats a resolved token as a prop value, noting the sub-theme when there is one. */
function formatTokenValue(resolvedToken) {
  const subThemeSuffix = resolvedToken.subTheme ? ` (theme ${resolvedToken.subTheme})` : ''
  return `"${resolvedToken.reference}"${subThemeSuffix}`
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
      // presets.ts has no composite shadow tokens, so a bound shadow cannot be mapped to a `$token`.
      warnings.push(`Shadow token \`${tokenName}\` has no presets.ts mapping (${locationLabel})`)
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
      if (unboundValue[0].style !== 'solid') props.push(`borderStyle="${unboundValue[0].style}"`)
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
  // A slot is where the embedded widget is mounted as-is; there is nothing to build for it.
  if (mapEntry.status === 'slot') return 'slot: embedded widget, rendered as-is'
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
    if (componentMap[component]?.status === 'slot') {
      // A slot's placeholder styling is design-time only; the implementer mounts the named widget unstyled.
      const widgetName = node.overrides?.texts?.find((textOverride) => textOverride.layer === 'Widget name')?.characters ?? 'unnamed'
      lines.push(`${indent}<${component} widget="${widgetName}" />   // ${describeCodeTarget(component, locationLabel)}`)
      return lines
    }
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
// Build-spec document (single output file)
// ---------------------------------------------------------------------------

const legend = [
  '> Generated by `docs/design-files/scripts/spec-to-tamagui.mjs` from the Penpot export, `meta.json` and `packages/ui/src/presets.ts`. Do not edit by hand: change Penpot or `meta.json`, re-export, regenerate.',
  '> `†` value was not bound to a token in Penpot; the token shown is an exact numeric match in the scale. `‡` raw number with no matching token.',
  '> `// status: file` after an instance is its code target from `meta.json` (exists / extend / new / third-party / slot).',
].join('\n')

/** Journey table: one row per frame with its transitions. */
function buildJourneySection() {
  const rows = journeySpec.frames.map((frame) => `| ${frame.step} | ${frame.name} | ${frame.transitions ?? 'none'} |`)
  return ['## Journey\n', journeySpec.notes, '\n| Step | Frame | Transitions |', '| --- | --- | --- |', ...rows, ''].join('\n')
}

/** Structure of every component the implementer has to build or change. Reused components need no structure. */
function buildComponentStructureSection() {
  const sections = ['## Components to build or change\n']
  for (const componentSpec of componentSpecs) {
    const mapEntry = componentMap[componentSpec.name]
    if (mapEntry?.status !== 'new' && mapEntry?.status !== 'extend') continue
    sections.push(`### ${componentSpec.name}\n\nCode target: \`${describeCodeTarget(componentSpec.name, componentSpec.name)}\`\n`)
    for (const variant of componentSpec.variants) {
      const variantLabel = Object.entries(variant.properties ?? {}).map(([key, value]) => `${key}=${value}`).join(', ') || 'default'
      const treeLines = renderNode(variant.root, undefined, 0, `${componentSpec.name} [${variantLabel}]`)
      sections.push(`#### ${variantLabel}\n\n\`\`\`text\n${treeLines.join('\n')}\n\`\`\`\n`)
    }
  }
  return sections.join('\n')
}

/** Structure of every journey frame, rendered with the embedded widget as a WidgetSlot placeholder. */
function buildFrameSection() {
  const sections = ['## Journey frames\n']
  for (const frameSpec of journeyFrameSpecs) {
    const treeLines = renderNode(frameSpec.root, undefined, 0, frameSpec.name)
    sections.push(`### Step ${frameSpec.step}: ${frameSpec.name}\n\n\`\`\`text\n${treeLines.join('\n')}\n\`\`\`\n`)
  }
  return sections.join('\n')
}

/** Component-to-code map: one row per Penpot component, with how often the design uses it. */
function buildComponentMapSection() {
  const rows = Object.entries(componentMap).map(([componentName, entry]) => {
    const target = entry.status === 'slot' ? 'embedded widget' : entry.file ?? entry.proposedFile ?? 'n/a'
    const exportName = entry.export ? ` \`${entry.export}\`` : ''
    const storybook = entry.storybook ? `\`${entry.storybook}\`` : ''
    return `| ${componentName} | ${entry.status} | \`${target}\`${exportName} | ${storybook} | ${instanceUsageCounts[componentName] ?? 0} | ${entry.change ?? entry.notes ?? ''} |`
  })
  return [
    '## Component-to-code map\n',
    '| Penpot component | Status | Code target | Storybook | Instances | Notes |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
    '\n### Status legend\n',
    ...Object.entries(metaSpec.statusLegend).map(([status, meaning]) => `- **${status}**: ${meaning}`),
    '',
  ].join('\n')
}

function buildOpenQuestionsSection() {
  return ['## Open questions\n', ...metaSpec.openQuestions.map((question) => `- ${question}`), ''].join('\n')
}

function buildValidationSection() {
  const listOrNone = (items) => (items.length ? [...new Set(items)].map((item) => `- ${item}`).join('\n') : '- none')
  return [
    '## Validation\n',
    `Errors block \`--check\`; warnings need a human look.\n`,
    `**Errors (${new Set(errors).size})**\n\n${listOrNone(errors)}\n`,
    `**Warnings (${new Set(warnings).size})**\n\n${listOrNone(warnings)}\n`,
    `**Inferred token bindings (${inferredBindings.size} distinct)**: values left unbound in Penpot that exactly match a scale token. Bind them in Penpot to remove the inference.\n\n${listOrNone([...inferredBindings].map(([label, { count, firstLocation }]) => `${label}: ${count}x, first at ${firstLocation}`))}\n`,
    `**Raw values with no token (${new Set(rawValues).size})**\n\n${listOrNone(rawValues)}\n`,
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Map integrity: every referenced file must exist
// ---------------------------------------------------------------------------

function validateComponentMap() {
  for (const [componentName, entry] of Object.entries(componentMap)) {
    for (const referencedFile of [entry.file, entry.storybook].filter(Boolean)) {
      if (!fs.existsSync(path.join(repoRoot, referencedFile))) errors.push(`meta.json componentMap.${componentName} points at missing file \`${referencedFile}\``)
    }
    if (entry.status === 'new' && entry.file) errors.push(`meta.json componentMap.${componentName} is "new" but sets \`file\`; use \`proposedFile\``)
  }
}

/** Map entries nothing in the design uses are stale and should be removed from meta.json. */
function warnAboutUnusedMapEntries() {
  for (const componentName of Object.keys(componentMap)) {
    if (!instanceUsageCounts[componentName]) warnings.push(`meta.json componentMap.${componentName} is not used by any frame or built component`)
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

validateComponentMap()
// Trees are rendered first so instance usage counts and validation findings are complete before the tables are built.
const componentStructureSection = buildComponentStructureSection()
const frameSection = buildFrameSection()
warnAboutUnusedMapEntries()

const buildSpecDocument = [
  `# ${metaSpec.feature}: design build spec\n`,
  legend,
  '',
  buildJourneySection(),
  buildComponentMapSection(),
  componentStructureSection,
  frameSection,
  buildOpenQuestionsSection(),
  buildValidationSection(),
].join('\n')

console.log(`errors: ${new Set(errors).size}  warnings: ${new Set(warnings).size}  inferred bindings: ${inferredBindings.size} distinct  raw values: ${new Set(rawValues).size}`)
for (const error of new Set(errors)) console.error(`ERROR ${error}`)

if (isCheckOnly) {
  const committedDocument = fs.existsSync(outputFilePath) ? fs.readFileSync(outputFilePath, 'utf8') : null
  if (committedDocument !== buildSpecDocument) {
    console.error(`ERROR ${path.relative(process.cwd(), outputFilePath)} is ${committedDocument === null ? 'missing' : 'stale'}: regenerate it without --check and commit the result`)
    process.exit(1)
  }
  console.log('design-spec.md is up to date')
} else {
  fs.writeFileSync(outputFilePath, buildSpecDocument)
  console.log(`wrote ${path.relative(process.cwd(), outputFilePath)}`)
}
process.exit(errors.length ? 1 : 0)
