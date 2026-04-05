# Use Tamagui Native Components First

## Intent

GoodWidget should prefer Tamagui's native UI primitives whenever Tamagui already provides the same behavior.

That means:

- use Tamagui for behavior, accessibility, gestures, focus handling, portal behavior, and platform differences
- use GoodWidget's design system for theming, sizing, visual defaults, and manifest registration
- only build a fully custom primitive when Tamagui does not already provide a suitable base component

This keeps GoodWidget aligned with:

- the intended Tamagui architecture
- our cross-platform target: React Native + web via \`react-native-web\`
- the GoodWalletV2-derived design preset and host override chain

## Core Rule

If Tamagui has a native component for the primitive we want, use that native component as the base.

Then:

1. wrap themed sub-parts with \`createComponent(...)\`
2. keep the public GoodWidget API small and opinionated
3. map GoodWalletV2 design semantics into those wrapped parts
4. avoid re-implementing interactions Tamagui already owns

The main anti-pattern is building a fake version out of \`Stack\`, \`YStack\`, or \`XStack\` when Tamagui already ships the real primitive.

## Pattern

Use this structure:

1. Tamagui primitive owns behavior
2. GoodWidget wraps exposed subparts with \`createComponent\`
3. GoodWidget exports a small composite API

In practice:

- \`Checkbox\` behavior comes from Tamagui \`Checkbox\`
- \`Drawer\` behavior comes from Tamagui \`Sheet\`
- GoodWidget wraps \`Checkbox.Indicator\`, \`Sheet.Frame\`, \`Sheet.Overlay\`, \`Sheet.Handle\`
- host overrides target the GoodWidget names through the manifest

## Example: Checkbox

### Do

Use Tamagui \`Checkbox\` as the actual control.

Reference:

- https://tamagui.dev/ui/checkbox

Why:

- controlled + uncontrolled support already exists
- accessibility is already implemented
- indeterminate state already exists
- Tamagui already handles native/web differences

GoodWidget responsibility:

- provide the GoodWidget-named wrapper pieces:
  - \`Checkbox\`
  - \`CheckboxIndicator\`
  - \`CheckboxLabel\`
- apply theme tokens and focus/hover states
- keep a small API such as:
  - \`checked\`
  - \`onCheckedChange\`
  - \`label\`
  - \`disabled\`

This is the correct shape:

\`\`\`ts
const CheckboxFrame = createComponent(TamaguiCheckbox as any, {
name: 'Checkbox',
...
})

const CheckboxIndicator = createComponent(TamaguiCheckbox.Indicator as any, {
name: 'CheckboxIndicator',
...
})
\`\`\`

This is the wrong shape:

\`\`\`ts
const FakeCheckbox = createComponent(Stack, {
tag: 'button',
role: 'checkbox',
...
})
\`\`\`

The wrong version duplicates behavior Tamagui already ships.

## Example: Drawer

### Do

Use Tamagui \`Sheet\` as the actual bottom-sheet / drawer behavior.

Reference:

- https://tamagui.dev/ui/sheet

Why:

- drag-to-dismiss already exists
- snap points already exist
- modal/portal behavior already exists
- animation driver integration already exists
- cross-platform behavior is already handled by Tamagui

GoodWidget responsibility:

- expose a simpler \`Drawer\` API
- wrap the visual subparts for theme targeting:
  - \`Sheet.Frame\` -> \`Drawer\`
  - \`Sheet.Overlay\` -> \`DrawerOverlay\`
  - \`Sheet.Handle\` -> \`DrawerHandle\`
- map GoodWalletV2 design semantics onto those parts

This is the correct shape:

\`\`\`ts
const DrawerOverlay = createComponent(Sheet.Overlay as any, {
name: 'DrawerOverlay',
...
})

const DrawerFrame = createComponent(Sheet.Frame as any, {
name: 'Drawer',
extends: 'Card',
...
})

const DrawerHandle = createComponent(Sheet.Handle as any, {
name: 'DrawerHandle',
...
})

export function Drawer(props: DrawerProps) {
return <Sheet ... />
}
\`\`\`

This is the wrong shape:

\`\`\`ts
const Overlay = createComponent(Stack, ...)
const Panel = createComponent(Stack, ...)
\`\`\`

That recreates a sheet poorly and usually breaks parity on drag, close timing, overlay behavior, focus, or portals.

## Native Equivalents To Prefer

These local boilerplate primitives often have Tamagui-native equivalents and should be reviewed before writing custom behavior:

- \`Checkbox\` -> Tamagui \`Checkbox\`
  - https://tamagui.dev/ui/checkbox
- \`Drawer\` / bottom sheet -> Tamagui \`Sheet\`
  - https://tamagui.dev/ui/sheet
- \`Switch\` -> Tamagui \`Switch\`
  - https://tamagui.dev/ui/switch
- \`Select\` -> Tamagui \`Select\`
  - https://tamagui.dev/ui/select
- \`Button\` -> Tamagui \`Button\`
  - https://tamagui.dev/ui/button
- dialog/modal flows -> Tamagui \`Dialog\`
  - https://tamagui.dev/ui/dialog
- notification/toast flows -> Tamagui \`Toast\`
  - https://tamagui.dev/ui/toast
- tabbed navigation -> Tamagui \`Tabs\`
  - https://tamagui.dev/ui/tabs
- radio selection groups -> Tamagui \`RadioGroup\`
  - https://tamagui.dev/ui/radio-group
- list row primitives -> Tamagui \`ListItem\`
  - https://tamagui.dev/ui/list-item

This does not mean every GoodWidget component should disappear.

It means most GoodWidget primitives should become one of:

- a thin themed wrapper around a native Tamagui primitive
- a small opinionated composition of native Tamagui primitives
- a fully custom component only when Tamagui has no real equivalent

## Decision Rule

Before creating or rewriting any primitive in \`packages/ui/src/components\`:

1. check if Tamagui already ships the primitive
2. if yes, use the Tamagui primitive as the base
3. wrap the subparts that need GoodWidget theme targeting with \`createComponent\`
4. keep the exported GoodWidget API simpler than the raw Tamagui API
5. only fall back to pure \`Stack\` composition if Tamagui truly lacks the behavior

## GoodWidget-Specific Constraint

\`createComponent()\` is still required for the visual pieces we want to expose to:

- the theme manifest
- host override targeting
- GoodWalletV2 preset mapping
- component lineage via \`extends\`

So the rule is not "use Tamagui directly everywhere".

The rule is:

- use Tamagui native components for behavior
- use GoodWidget \`createComponent\` wrappers for themed subparts and public design-system integration

## Practical Standard

For future work in \`@goodwidget/ui\`:

- prefer native Tamagui behavior first
- keep GoodWidget wrappers thin
- do not rebuild accessibility or gestures manually
- do not recreate portaled/modal primitives from \`Stack\` unless there is no Tamagui equivalent
- treat \`Checkbox\` and \`Drawer\` as the reference examples for this pattern
  `
