# Task: Native Primitive Migration With GoodWidget Design Integration

This document combines the current follow-up work into one coherent execution task.

It replaces the idea of:

- one separate task for "use Tamagui native primitives"
- one separate task for "fix theme propagation consistency everywhere"

with a single practical workstream:

- migrate one primitive at a time to Tamagui-native behavior
- apply the GoodWidget design-system contract at the same time
- validate that the result is actually usable in demos and widget composition

This is the right execution model for the current codebase.

## Relationship To The Older Documents

This document is intended to subsume the important content from:

- [use-tamagui-primitives.md](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/agent-next-steps/use-tamagui-primitives.md)
- [theme-propagation-consistency-task.md](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/agent-next-steps/theme-propagation-consistency-task.md)

That means it must preserve all of the important detail from those documents, not just their headline idea.

In particular, this combined task must carry forward:

- the Tamagui-native-first rule for primitive behavior
- the requirement that migrated primitives also become GoodWidget-themed and demo-able
- the distinction between broad token effects and targeted component-theme effects
- the demo honesty requirements
- the verification expectations for token and theme propagation
- the warning that undocumented names or theme keys can accidentally become public API

## Why This Is One Coherent Task

For a primitive such as `Checkbox`, it is not enough to swap the implementation to Tamagui native behavior.

To be complete, that primitive also needs:

- the correct GoodWidget component names
- the correct theme contract
- the correct manifest registration path
- the correct visual defaults for the GoodWalletV2 preset
- demo readiness

In other words:

- behavior migration alone is incomplete
- theme cleanup alone is premature if the primitive will be rewritten again

So the executable task unit is:

1. migrate the primitive to Tamagui-native behavior where applicable
2. apply the GoodWidget design and theming contract
3. verify it in real usage

This is the key framing for the combined task:

- "native primitive migration" and
- "design-system integration / propagation consistency"

are not separate deliverables for a single component. They are the same deliverable.

## Goal

Move GoodWidget primitives toward the intended architecture:

- Tamagui owns primitive behavior
- GoodWidget owns naming, theme targeting, preset mapping, and public override surface
- each migrated primitive is immediately usable in demos and widgets

The goal is not a one-shot full-library rewrite.
The goal is a repeatable per-component migration workflow.

The task should be thought of as one workstream with repeated component-sized execution units, not as one huge implementation PR and not as two disconnected refactors.

## Current Architectural Basis

The codebase already has the correct high-level config pipeline:

- token values remain plain seeds until config creation
- preset + author + host token overrides are merged first
- semantic themes are derived from the effective token set
- theme overrides are then layered by theme name
- `createTamagui()` is called once for the effective config

That means the next work is not to invent theming architecture.
It is to make individual primitives conform to that architecture.

Relevant current files:

- [packages/ui/src/config.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/config.ts)
- [packages/ui/src/theme.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/theme.ts)
- [packages/ui/src/presets.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/presets.ts)
- [packages/ui/src/createComponent.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/createComponent.ts)
- [packages/ui/src/manifest.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/manifest.ts)

## Execution Model

Do this iteratively, per component.

For each primitive:

1. replace custom behavior with a Tamagui-native primitive if Tamagui already provides one
2. wrap the exposed visual parts with `createComponent`
3. apply GoodWidget semantic styling and preset alignment
4. verify the component is themeable and manifest-visible in an intentional way
5. validate it in the demo or widget context where it is actually used

This is intentionally not a "migrate all components first, theme them later" plan.

That split would create duplicate work because:

- design choices become clearer only once the native primitive shape exists
- semantic theme decisions are easier to make against the final behavior surface
- demo verification should happen against the migrated component, not a temporary one

It also creates the wrong incentive structure:

- if behavior migration lands without design integration, the primitive is still not a trustworthy example
- if design cleanup happens before behavior migration, the semantic work may need to be redone on the next implementation pass

## Task Unit Definition

A single component task is complete only when all of the following are true:

1. the component uses Tamagui-native behavior if a suitable native primitive exists
2. exposed visual parts use intentional GoodWidget names
3. the component is registered through `createComponent` where appropriate
4. the visual design follows current GoodWidget preset semantics
5. theme/sub-theme behavior is intentional and understandable
6. the component works in the demo or widget usage path
7. any new override target introduced is treated as API surface, not an accident

This is the minimum "done" bar for a component-sized task in this workstream.

## Migration Rubric Per Component

Use this checklist for every migrated primitive.

### 1. Behavior base

Ask:

- does Tamagui already provide the primitive?
- if yes, are we using it as the behavioral base?
- if no, is custom behavior actually justified?

Examples:

- `Checkbox` -> Tamagui `Checkbox`
- `Switch` -> Tamagui `Switch`
- `Select` -> Tamagui `Select`
- `Input` -> Tamagui `Input`
- `Button` -> Tamagui `Button`
- `Drawer` -> Tamagui `Sheet`

Reference list of native Tamagui primitives that should be preferred where applicable:

- `Checkbox` -> Tamagui `Checkbox`
  - https://tamagui.dev/ui/checkbox
- `Drawer` / bottom sheet -> Tamagui `Sheet`
  - https://tamagui.dev/ui/sheet
- `Switch` -> Tamagui `Switch`
  - https://tamagui.dev/ui/switch
- `Select` -> Tamagui `Select`
  - https://tamagui.dev/ui/select
- `Button` -> Tamagui `Button`
  - https://tamagui.dev/ui/button
- `Input` -> Tamagui `Input`
  - https://tamagui.dev/ui/input
- dialog / modal flows -> Tamagui `Dialog`
  - https://tamagui.dev/ui/dialog
- toast / notification flows -> Tamagui `Toast`
  - https://tamagui.dev/ui/toast
- tabs -> Tamagui `Tabs`
  - https://tamagui.dev/ui/tabs
- radio groups -> Tamagui `RadioGroup`
  - https://tamagui.dev/ui/radio-group
- list rows -> Tamagui `ListItem`
  - https://tamagui.dev/ui/list-item

### 2. GoodWidget naming

Ask:

- which parts need stable `name` values?
- which of those names are public override targets?
- which names are internal implementation details and should not be treated as API?

The component should not gain extra named theme targets casually.

This matters because a name can become public API long before anyone explicitly documents it.

When adding or preserving a named part, explicitly decide:

- is this a public override target?
- is this only an internal implementation detail?
- do we expect integrators or hosts to rely on this name?

If the answer is unclear, do not expand the public theming surface yet.

### 3. Semantic theme contract

Ask:

- which semantic role is this primitive expressing?
- which theme keys does it rely on?
- are those theme keys already established, or are we introducing a new contract?

Examples of acceptable semantic intent:

- primary action
- secondary action
- surface
- muted surface
- primary text
- muted text
- success feedback
- warning feedback
- error feedback

Examples of poor semantic intent:

- styles that only happen to look right in the current preset
- ad hoc colors that are not tied to a clear role
- demo claims that imply broader propagation than the primitive actually supports
- custom theme keys that are used in examples but never intentionally defined as supported contract

This point is especially important for components like `TokenAmountText`, where custom keys such as `secondaryColor` may function today but still need an explicit decision about whether they are part of the intended public override surface.

### 4. Preset alignment

Ask:

- does the migrated primitive actually look aligned with the GoodWalletV2 preset?
- are we using token and theme semantics rather than accidental styling?
- are we relying on hardcoded values only where that decision is deliberate and justified?

The design objective is not "make it themeable somehow".

The design objective is:

- Tamagui-native behavior
- GoodWidget naming and manifest discipline
- GoodWalletV2-aligned defaults
- honest semantic styling that remains understandable under override

### 5. Manifest and override surface

Ask:

- does this component need to appear in the manifest?
- if it appears there, is that intentional?
- are we exposing a stable host-facing override contract or just leaking implementation details?

Public override targets are part of the library API surface.

That means:

- their names should be intentional
- renaming them is a breaking change for integrators
- they should appear in examples/docs only when the team intends to support them
- internal names should not be casually presented as supported host-facing customization points

### 6. Demo readiness

Ask:

- can this primitive be shown honestly in `examples/react-web` or the widget?
- does the demo copy match what the component actually supports?
- do token overrides and component-theme overrides behave in a way we can explain clearly?

This requirement comes directly from the older propagation task and should remain explicit:

- token demos must describe broad/system-level behavior
- component-theme demos must describe targeted visual behavior
- host override demos must describe precedence accurately
- demo copy must not overstate isolation or propagation

More specifically:

- token overrides should be described as broad design-system inputs
- component theme overrides should be described as the authoritative targeted restyling path
- host `themeOverrides` should be described as the last runtime JS override layer
- CSS custom properties in the web component path should be described as a later web-only host layer

## Current Priority Candidates

These are the best current candidates for this workflow:

1. [packages/ui/src/components-test/Checkbox.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components-test/Checkbox.tsx)
2. [packages/ui/src/components-test/Switch.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components-test/Switch.tsx)
3. [packages/ui/src/components-test/Select.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components-test/Select.tsx)
4. [packages/ui/src/components-test/Input.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components-test/Input.tsx)
5. [packages/ui/src/components-test/Button.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components-test/Button.tsx)

Secondary candidates after those:

1. [packages/ui/src/components-test/ActionSheet.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components-test/ActionSheet.tsx)
2. [packages/ui/src/components-test/Toast.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components-test/Toast.tsx)

Already partially aligned reference:

1. [packages/ui/src/components/Drawer.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components/Drawer.tsx)

`Drawer` should be treated as the current reference implementation for the combined pattern:

- Tamagui native primitive owns behavior
- GoodWidget wraps themed subparts with `createComponent`
- the result is a smaller GoodWidget-facing API with named override targets

## Recommended Order

Use this order unless a stronger product need overrides it:

1. `Checkbox`
2. `Switch`
3. `Select`
4. `Input`
5. `Button`
6. then a second wave for `ScrollArea`, `Spinner`, `Toast`, and `ActionSheet`
7. then a smaller cross-cutting pass on shared semantic consistency and demo copy

This order is useful because:

- it starts with smaller stateful controls
- it lets patterns stabilize before hitting heavier components
- it avoids doing broad semantic cleanup before the real primitive surfaces exist
- it keeps the first wave focused on obvious direct primitive migrations
- it avoids mixing composition-only components like `Alert` and `Badge` into the same task shape

After several component migrations land, a smaller cross-cutting pass should consolidate any shared semantic decisions that emerged during the component work.

That follow-up pass should focus on:

- demo copy
- shared semantic naming decisions
- any back-propagation fixes to earlier migrated components
- verification notes for token vs component-theme behavior

## Cross-Cutting Rule

Each component task may refine the shared design-system pattern.

That means some back-propagation is expected:

- a decision made during `Switch` may require a small correction in `Checkbox`
- a decision made during `Button` may refine how action semantics should be expressed across earlier components

This is acceptable.
What should be avoided is trying to finalize every semantic rule globally before the first migration lands.

The correct stance is:

- expect some back-propagation
- keep it small and explicit
- let real implementation decisions harden the shared standard

## Acceptance Criteria For The Overall Workstream

This combined task is on track when:

1. migrated primitives use Tamagui-native behavior where available
2. migrated primitives have intentional GoodWidget names and theme contracts
3. migrated primitives are demo-able immediately after migration
4. token overrides are described as broad system inputs
5. component theme overrides are described as the targeted visual override path
6. newly exposed override targets are intentional and stable
7. demo copy stays aligned with actual runtime behavior

The combined task is complete enough to feed a bounty specification only if it also contains explicit verification expectations.

## Verification Expectations

The following checks should remain part of the artifact because they were explicitly useful in the older propagation task.

### Token propagation checks

At minimum, verification should explain the expected visible impact of:

- `tokens.color.primary`
- `tokens.color.primaryDark`
- `tokens.color.primaryLight`

The artifact should make clear that:

- these are broad design-system inputs
- they affect only primitives and states wired to those semantics
- they should not be described as isolated single-component overrides

Expected examples:

- primary action surfaces and related hover/focus states
- accent/glow treatments that intentionally consume primary semantics
- border/focus accents where those semantics are derived from primary values

### Component theme propagation checks

At minimum, verification should explain the expected visible impact of:

- `themes.light_Button`
- `themes.dark_Button`
- `themes.light_Card`
- `themes.dark_Card`

The artifact should make clear that:

- these are the authoritative targeted override path for component-level restyling
- they should visibly affect the named component in primitive and widget composition contexts
- this is different from broad token changes

### Feedback primitive checks

At minimum, one feedback primitive should be verified explicitly, such as:

- `Badge`
- `Alert`

The verification should state:

- which semantic role the feedback primitive is expressing
- whether its feedback styling is token-driven, theme-driven, or intentionally local
- why that choice is acceptable

### Custom key / extended contract checks

If a primitive uses keys outside the base shared semantic set, verification should explicitly say whether those keys are:

- intended public contract
- temporary internal detail
- something to be removed or normalized later

This is especially relevant to cases like:

- `TokenAmountText`
- any widget-specific sub-theme names
- any component-specific semantic extensions introduced during migration

## Deliverable Expectations For The Artifact

Because this document is intended to feed a bounty spec later, it should be complete enough to preserve:

1. the architectural rationale
2. the execution model
3. the per-component definition of done
4. the design-system consistency rules
5. the demo honesty rules
6. the verification expectations
7. the warning about public API surface and accidental override targets

## What Not To Do

1. Do not define this as one giant "migrate all primitives and fix all theming" task.
2. Do not migrate behavior first and postpone all design integration until later.
3. Do not treat every named component automatically as public override API.
4. Do not blur token overrides with component-theme overrides.
5. Do not use demos to imply behavior that the migrated primitive does not actually support.
6. Do not silently normalize undocumented custom theme keys into public contract without making that decision explicit.

## Intended Outcome

After following this workflow:

- each primitive migration is a complete, reviewable unit
- Tamagui owns more of the real behavior
- GoodWidget owns a cleaner and more intentional design-system layer
- demos become more trustworthy because they are validated against the migrated primitives
- consistency emerges through repeated application of the same rubric rather than through one large speculative rewrite
