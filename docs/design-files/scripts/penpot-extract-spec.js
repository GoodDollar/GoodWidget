// Penpot design-spec extractor.
//
// Runs INSIDE the Penpot plugin sandbox (Penpot MCP `execute_code`, or any plugin console),
// not in Node. It reads the currently open page and returns plain JSON that is saved
// verbatim under docs/design-files/<feature>/spec/. Nothing here writes to Penpot.
//
// Usage (two calls, because `penpot.openPage` only takes effect between calls):
//   1. penpot.openPage(<page id>)
//   2. run this file's body, then call one of:
//        extractComponentsPage()   -> { kind: 'components', components: [...] }
//        extractJourneyPage()      -> { kind: 'journey', frames: [...], annotations: [...] }
//        extractTokenCatalog()     -> { kind: 'tokens', sets: [...], themes: [...] }
//
// The output is theme-independent: colours are reported as token names (never resolved hex),
// so one export describes both Light and Dark.

const SPEC_VERSION = 1

const SHAPE_TYPE_NAMES = {
  board: 'board',
  text: 'text',
  rectangle: 'rect',
  ellipse: 'ellipse',
  path: 'path',
  group: 'group',
  boolean: 'boolean',
  image: 'image',
  'svg-raw': 'svg',
}

// Token properties whose resolved number is theme-independent, so it is safe (and useful for
// verification) to report the resolved value next to the token name.
const RESOLVABLE_TEXT_TOKEN_PROPS = ['fontSize', 'fontWeight', 'letterSpacing']

const roundToTwoDecimals = (value) => Math.round(value * 100) / 100

// Copies only the keys of `source` whose value is neither null nor a default.
function pickNonDefault(source, defaults) {
  const picked = {}
  for (const key of Object.keys(defaults)) {
    const value = source[key]
    if (value !== null && value !== undefined && value !== defaults[key]) picked[key] = value
  }
  return picked
}

// Layout facts of a flex board: direction, alignment, gaps and padding as raw numbers.
// Token bindings for the same properties are reported separately under `tokens`.
function describeFlexLayout(flex) {
  const layout = {
    direction: flex.dir,
    alignItems: flex.alignItems,
    justifyContent: flex.justifyContent,
    gap: { row: flex.rowGap, column: flex.columnGap },
    padding: {
      top: flex.topPadding,
      right: flex.rightPadding,
      bottom: flex.bottomPadding,
      left: flex.leftPadding,
    },
  }
  if (flex.wrap && flex.wrap !== 'nowrap') layout.wrap = flex.wrap
  return layout
}

// Raw (non-token) visual values. Anything listed here is a value the design did NOT bind to a
// token, which the translator reports so that unbound values are visible, not silently copied.
function describeUnboundVisuals(shape, tokens) {
  const raw = {}

  if (shape.fills && shape.fills.length > 0 && !tokens.fill) {
    raw.fills = shape.fills.map((fill) => ({
      color: fill.fillColor,
      opacity: fill.fillOpacity,
    }))
  }

  if (shape.strokes && shape.strokes.length > 0) {
    raw.strokes = shape.strokes.map((stroke) => ({
      // Colour is only reported when it is not token-bound.
      color: tokens.strokeColor ? undefined : stroke.strokeColor,
      width: stroke.strokeWidth,
      alignment: stroke.strokeAlignment,
      style: stroke.strokeStyle,
    }))
  }

  const hasRadiusToken = Object.keys(tokens).some((name) => name.startsWith('borderRadius'))
  if (!hasRadiusToken && shape.borderRadius) {
    raw.borderRadius = [
      shape.borderRadiusTopLeft,
      shape.borderRadiusTopRight,
      shape.borderRadiusBottomRight,
      shape.borderRadiusBottomLeft,
    ]
  }

  if (shape.opacity !== null && shape.opacity !== undefined && shape.opacity !== 1) {
    raw.opacity = shape.opacity
  }

  if (shape.shadows && shape.shadows.length > 0) {
    raw.shadows = shape.shadows.map((shadow) => ({
      style: shadow.style,
      offsetX: shadow.offsetX,
      offsetY: shadow.offsetY,
      blur: shadow.blur,
      spread: shadow.spread,
      color: shadow.color && shadow.color.color,
      opacity: shadow.color && shadow.color.opacity,
    }))
  }

  if (shape.blur) raw.blur = shape.blur

  return raw
}

// Typography of a text shape. fontSize/fontWeight/letterSpacing are the resolved numbers, so a
// reviewer can check them against the token value without opening Penpot.
function describeText(shape) {
  return {
    characters: shape.characters,
    fontFamily: shape.fontFamily,
    fontSize: Number(shape.fontSize),
    fontWeight: shape.fontWeight,
    lineHeight: Number(shape.lineHeight),
    letterSpacing: Number(shape.letterSpacing),
    align: shape.align,
    growType: shape.growType,
  }
}

// Sizing behaviour: "fix" = fixed size, "auto" = hug content, "fill" = fill the parent.
function describeSizing(shape) {
  const layoutChild = shape.layoutChild
  const horizontal = shape.horizontalSizing || (layoutChild && layoutChild.horizontalSizing)
  const vertical = shape.verticalSizing || (layoutChild && layoutChild.verticalSizing)
  const sizing = {}
  if (horizontal) sizing.horizontal = horizontal
  if (vertical) sizing.vertical = vertical
  return sizing
}

// Placement facts that only exist for a child of a flex board.
function describeFlexChild(shape) {
  const layoutChild = shape.layoutChild
  if (!layoutChild) return {}
  const child = {}
  if (layoutChild.absolute) child.absolute = true
  if (layoutChild.alignSelf && layoutChild.alignSelf !== 'auto') child.alignSelf = layoutChild.alignSelf
  const margins = pickNonDefault(layoutChild, {
    topMargin: 0,
    rightMargin: 0,
    bottomMargin: 0,
    leftMargin: 0,
    minWidth: null,
    maxWidth: null,
    minHeight: null,
    maxHeight: null,
  })
  return Object.keys(margins).length > 0 ? { ...child, constraints: margins } : child
}

// Overrides that a component instance can carry: changed text, hidden layers. Path glyph
// overrides are not machine readable, so icons are listed in the feature's meta.json instead.
function describeInstanceOverrides(instance) {
  const texts = []
  const hiddenLayers = []
  const visit = (shape, pathSegments) => {
    for (const child of shape.children || []) {
      const childPath = [...pathSegments, child.name]
      if (child.hidden) {
        hiddenLayers.push(childPath.join('/'))
        continue
      }
      if (child.type === 'text') texts.push({ layer: childPath.join('/'), characters: child.characters })
      visit(child, childPath)
    }
  }
  visit(instance, [])
  const nestedInstances = describeNestedInstances(instance)
  return nestedInstances.length > 0 ? { texts, hiddenLayers, nestedInstances } : { texts, hiddenLayers }
}

// Component instances nested inside an instance, with the variant each one is set to. This is
// where state lives (e.g. which BottomBarItem inside a BottomAppBar is "active"), so without it
// two frames in different states would export identically. Every descendant of a nested copy is
// itself reported as a copy by Penpot, so only the copy roots are kept: a descendant is skipped
// when it belongs to the same component as its nearest copy ancestor.
function describeNestedInstances(instance) {
  const nestedInstances = []
  const visit = (shape, pathSegments, ancestorComponentName) => {
    for (const child of shape.children || []) {
      const childPath = [...pathSegments, child.name]
      let childAncestorComponentName = ancestorComponentName
      if (child.isComponentCopyInstance && child.isComponentCopyInstance()) {
        const component = child.component()
        // Only variant-carrying copies hold state; plain copies are fully described by their component.
        if (component.name !== ancestorComponentName && component.variantProps) {
          nestedInstances.push({
            layer: childPath.join('/'),
            component: component.name,
            variant: component.variantProps,
          })
        }
        childAncestorComponentName = component.name
      }
      visit(child, childPath, childAncestorComponentName)
    }
  }
  visit(instance, [], instance.component().name)
  return nestedInstances
}

// One spec node. Component instances are emitted as references (component + variant +
// overrides); everything else is expanded recursively.
function describeNode(shape, parentIsFlex) {
  const tokens = shape.tokens || {}
  const node = {
    name: shape.name,
    type: SHAPE_TYPE_NAMES[shape.type] || shape.type,
    size: [roundToTwoDecimals(shape.width), roundToTwoDecimals(shape.height)],
  }
  if (shape.hidden) node.hidden = true

  const sizing = describeSizing(shape)
  if (Object.keys(sizing).length > 0) node.sizing = sizing

  if (parentIsFlex) {
    const flexChild = describeFlexChild(shape)
    if (Object.keys(flexChild).length > 0) node.flexChild = flexChild
  } else if (shape.parent) {
    // Outside a flex board the position relative to the parent is part of the design.
    node.position = [roundToTwoDecimals(shape.parentX), roundToTwoDecimals(shape.parentY)]
  }

  if (Object.keys(tokens).length > 0) node.tokens = { ...tokens }

  const unboundVisuals = describeUnboundVisuals(shape, tokens)
  if (Object.keys(unboundVisuals).length > 0) node.unbound = unboundVisuals

  if (shape.type === 'text') {
    node.text = describeText(shape)
    return node
  }

  if (shape.isComponentCopyInstance && shape.isComponentCopyInstance()) {
    const component = shape.component()
    node.instanceOf = { component: component.name, variant: component.variantProps || null }
    node.overrides = describeInstanceOverrides(shape)
    return node
  }

  if (shape.type === 'board') {
    if (shape.flex) node.layout = describeFlexLayout(shape.flex)
    if (shape.clipContent === false) node.clipContent = false
  }

  if (shape.children && shape.children.length > 0) {
    const isFlexBoard = Boolean(shape.flex)
    node.children = shape.children.map((child) => describeNode(child, isFlexBoard))
  }
  return node
}

// A component with all its variants. Variant containers hold one main shape per variant;
// a plain component main is a single variant without properties.
function describeComponent(topLevelBoard) {
  const isVariantContainer = topLevelBoard.isVariantContainer && topLevelBoard.isVariantContainer()
  const mainShapes = isVariantContainer ? topLevelBoard.children : [topLevelBoard]
  const variants = mainShapes.map((main) => {
    const component = main.component()
    const root = describeNode(main, false)
    // The main's position inside the variant container is canvas layout, not design.
    delete root.position
    return {
      properties: component.variantProps || null,
      annotation: component.annotation || undefined,
      root,
    }
  })
  return { name: topLevelBoard.name, variants }
}

function extractComponentsPage() {
  const components = penpot.root.children
    .filter((shape) => shape.type === 'board')
    .filter(
      (board) =>
        (board.isVariantContainer && board.isVariantContainer()) ||
        (board.isComponentMainInstance && board.isComponentMainInstance()),
    )
    .map(describeComponent)
  return { specVersion: SPEC_VERSION, kind: 'components', page: penpot.currentPage.name, components }
}

// Journey frames are top-level boards that are not components; free texts are annotations
// (title, assumptions, "Transition: <frame>" labels that document how one frame leads to another).
function extractJourneyPage() {
  const topLevel = penpot.root.children
  const frames = topLevel
    .filter((shape) => shape.type === 'board')
    .map((board) => ({
      x: roundToTwoDecimals(board.x),
      y: roundToTwoDecimals(board.y),
      node: describeNode(board, false),
    }))
  const annotations = topLevel
    .filter((shape) => shape.type === 'text')
    .map((text) => ({
      name: text.name,
      characters: text.characters,
      x: roundToTwoDecimals(text.x),
      y: roundToTwoDecimals(text.y),
    }))
  return { specVersion: SPEC_VERSION, kind: 'journey', page: penpot.currentPage.name, frames, annotations }
}

// Token sets and the themes that activate them. Values are the authored values (may be
// references such as "{color.primary}"); resolving is the translator's job.
function extractTokenCatalog() {
  const sets = penpot.library.local.tokens.sets.map((tokenSet) => ({
    name: tokenSet.name,
    tokens: tokenSet.tokens.map((token) => ({
      name: token.name,
      type: token.type,
      value: token.value,
    })),
  }))
  const themes = penpot.library.local.tokens.themes.map((theme) => ({
    group: theme.group,
    name: theme.name,
    activeSets: theme.activeSets ? theme.activeSets.map((tokenSet) => tokenSet.name) : undefined,
  }))
  return { specVersion: SPEC_VERSION, kind: 'tokens', sets, themes }
}
