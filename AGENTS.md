# Tamagui Configuration Instructions

These instructions are the working contract for how GoodWidget should use Tamagui.

Primary references:

- https://tamagui.dev/docs/core/configuration
- https://tamagui.dev/docs/core/tokens
- https://tamagui.dev/docs/core/theme
- https://tamagui.dev/docs/core/styled
- https://tamagui.dev/llms.txt

The goal is not "make overrides possible somehow". The goal is to use Tamagui in the way it expects:

- `tokens` are static design values.
- `themes` are contextual semantic values.
- `createTamagui()` produces a stable design-system config.
- named components opt into component sub-themes through `name`.

## Core Model

### 1. Tokens are the static design primitives

Put values in `tokens` when they are design primitives or scales:

- spacing scale
- size scale
- radius scale
- z-index scale
- raw brand colors and raw palette colors
- font scales used by `createFont`

Do not use `tokens` for:

- component-specific skins
- light/dark contextual values
- per-widget stateful overrides
- values that only make sense as `background`, `color`, `borderColor`, etc in a theme

Rule of thumb:

- If the value should mean the same thing everywhere, it is a token.
- If the value should change based on light/dark mode or nested UI context, it is a theme value.

### 2. Themes are semantic and contextual

Themes sit one level below tokens. They should define semantic slots such as:

- `background`, `backgroundHover`, `backgroundPress`, `backgroundFocus`
- `color`, `colorHover`, `colorPress`, `colorFocus`
- `borderColor`, `borderColorHover`, `borderColorPress`, `borderColorFocus`
- `placeholderColor`
- `shadowColor`

Themes should be built from tokens, but themes are not tokens. They are the contextual mapping layer.

Use themes for:

- `light` and `dark`
- component sub-themes such as `light_Button`, `dark_Button`
- optional nested semantic areas such as `light_success`, `dark_success` if the design system needs them

Do not use themes as a grab-bag for arbitrary component props. Theme values should stay semantic and generic.

### 3. `$foo` resolves theme-first, token-second

Tamagui looks up `$value` against the current theme first and then falls back to tokens.

Implications:

- use theme keys for semantic styling in reusable components
- use token keys for raw scales and raw palette access
- avoid defining token names and theme keys that blur semantic intent

Example:

- `backgroundColor="$background"` means "use the current theme background"
- `borderRadius="$3"` means "use the shared radius scale"
- `color="$primary"` is usually a token-level palette usage, not a semantic theme usage

## Configuration Rules

### 4. `createTamagui()` config must come from a stable source of truth

The design-system config belongs in `packages/ui`.

`packages/ui` should own:

- base token definitions
- font definitions
- base themes
- component sub-theme definitions
- `createTamagui()` assembly
- the exported canonical config

`packages/core` should not define design-system values. It should only:

- compose `TamaguiProvider`
- accept a constrained override API from consumers
- apply the chosen config to the widget boundary

### 5. Do not treat the runtime provider as the config authoring layer

The official docs expect Tamagui config to be created once from a relatively simple source and imported near the root.

For this repo that means:

- keep one canonical config definition in `packages/ui`
- do not let `packages/core` become the place where tokens/themes are authored
- do not merge arbitrary theme/token objects into already-created Tamagui objects unless the merge model is explicitly designed for that

### 6. If token overrides are supported, themes must be derived from the same token source

This is a critical rule for this repo.

If a theme is created from module-scoped base tokens and then a consumer overrides tokens later, the existing themes do not automatically become re-derived from the new token values.

Also:

- do not deep-merge the return values of `createTokens()` or `createTheme()` as if they were plain seed objects
- merge plain seed objects first, then call Tamagui factories on the merged result

Therefore:

- never promise token overrides unless base themes and component themes are generated from the effective token set
- keep token seeds as plain objects or factory inputs
- build themes from those token seeds inside a single config creation pipeline

Bad pattern:

- create `tokens`
- create `lightTheme` from those tokens once
- later merge token overrides into config without regenerating `lightTheme` and `light_Button`

Good pattern:

- define token seed objects
- derive effective tokens from seed + override
- derive all themes from the effective tokens
- call `createTamagui()` once for that effective config

### 7. Keep the override surface small and typed

Do not expose `Record<string, Record<string, string | number>>` as the main long-term contract unless there is no better option.

Prefer a constrained API such as:

- `tokenOverrides` for allowed token groups and keys
- `themeOverrides` for allowed theme names and semantic theme keys
- possibly separate `componentThemeOverrides` if that improves clarity

Why:

- the host should override the design system, not mutate arbitrary config internals
- a smaller API makes it clear what is supported and what will remain stable

## Theme Naming Rules

### 8. Base theme names

Use stable root theme names:

- `light`
- `dark`

### 9. Component sub-theme names

Named styled components opt into component themes via `name`.

If a component is named `Button`, Tamagui looks for:

- `light_Button`
- `dark_Button`

The suffix must match the component `name` exactly.

Examples:

- `name: 'Card'` -> `light_Card`, `dark_Card`
- `name: 'ClaimCard'` -> `light_ClaimCard`, `dark_ClaimCard`

### 10. Keep theme shapes aligned

Base themes and component themes should use the same semantic keys wherever possible.

This keeps overrides predictable because:

- missing keys resolve upward
- nested sub-themes remain understandable
- hosts can override a small known set of keys

## Component Authoring Rules

### 11. Use a named styled component when the component owns a theme contract

Use `styled()` or this repo's `createComponent()` when the component:

- is a reusable design-system primitive
- has variants/default styling
- should have a component sub-theme
- should be targetable by theme overrides

Examples:

- `Card`
- `ButtonFrame`
- `InputFrame`
- a widget-specific frame like `ClaimCard`

### 12. Use a plain functional wrapper when the component is only composition/logic

Use a plain React component when the component:

- mainly composes existing Tamagui components
- adds behavior or state
- does not need its own sub-theme contract

Examples:

- a widget screen
- a composed panel made from `Card`, `Text`, `Button`
- logic wrappers around wallet state

### 13. Use `.styleable()` when wrapping a styled component and you still want it to be stylable

Per the Tamagui `styled()` docs:

- if a function component wraps a styled component and should itself be safe to extend with `styled()`, use `.styleable()`

Use `.styleable()` for wrappers that:

- forward Tamagui style props to one styled child
- add logic but should remain extendable/stylable

Do not assume every plain wrapper should be `styled()` directly.

### 14. Do not create a named component just to avoid inline styles

Use direct Tamagui components when:

- the usage is local
- there is no reusable design-system contract
- there is no need for a component-specific sub-theme

This keeps the theme namespace small.

### 15. Prefer Tamagui primitives directly when the base theme already covers the use case

If a component can be expressed cleanly with the existing base theme and shared tokens, use Tamagui directly.

Create a custom named component only when one or more of these are true:

- it needs default variants
- it needs a stable override target
- it represents a library primitive we expect consumers to reuse
- it needs a distinct visual identity from generic `Stack`, `Text`, etc

## Repo Boundary Rules

### 16. `packages/ui`

`packages/ui` is the design-system package.

It should own:

- token seeds
- fonts
- theme factories
- the canonical Tamagui config export
- reusable named primitives
- any helper that standardizes component naming or manifest registration

It should not depend on host environment concerns.

### 17. `packages/core`

`packages/core` is the widget/runtime integration layer.

It should own:

- `GoodWidgetProvider`
- host/provider detection
- override plumbing from app/widget boundary to `TamaguiProvider`

It should not:

- author base tokens
- author base themes
- invent new design-system naming rules

### 18. `examples/*`

Examples demonstrate supported patterns. They must not become the source of truth.

### 19. Preserve Comments

When refactoring files, keep existing comments
and other structural navigation comments unless the user explicitly asks to remove
or rewrite them.

If an example conflicts with `packages/ui` architecture, fix the example.

## Integrator Theming Model

### Product goal

GoodWidget ships with one default preset design system.

Integrators such as dapps, wallets, and websites should be able to:

- use the default preset unchanged
- apply their own branding at the widget boundary
- theme different widget instances differently when needed
- override supported surfaces in a way that is consistent across widgets and components

The goal is not to ship many built-in themes. The goal is to support one strong default plus a clean override model.

### Widget instance isolation

Each widget instance must be able to render with its own effective design system.

That means:

- a widget may have its own `TamaguiProvider`
- one page may contain multiple GoodWidget instances with different configs
- host overrides must be scoped to the widget instance boundary
- no override API should assume a single global app theme unless the host explicitly chooses that pattern

Practical implication:

- treat theming inputs as part of widget instance configuration, not a global singleton
- avoid hidden module-level mutable theme state

### Override precedence

Override precedence must be explicit and stable.

Default order:

1. `packages/ui` base preset
2. widget author configuration for a specific widget package
3. host or integrator overrides at embed/app level
4. one-off local component props and inline styles

Rules:

- later layers may specialize earlier layers
- lower layers define the public default contract
- local one-off styles are not the primary theming API and should not be used to paper over missing theme architecture

### Supported override layers

The override API should clearly separate intent.

Use token overrides for:

- brand palette inputs
- spacing scale changes
- radius scale changes
- size scale changes
- typography scale inputs when supported

Use base theme overrides for:

- app-wide semantic surfaces
- app-wide text and border semantics
- light/dark semantic mapping changes

Use component sub-theme overrides for:

- stable public component skins such as `Button`, `Card`, `Input`
- widget-specific public components that intentionally expose a theme contract

Use local props or inline style only for:

- one-off layout adjustments
- isolated presentation exceptions
- temporary demo code

Do not use local props or inline style as a substitute for missing token/theme definitions.

### Semantic naming policy

The design system should maintain a clear distinction between:

- raw design primitives
- semantic UI meaning

Preferred structure:

- raw token values describe scales and palette primitives
- themes map those primitives into semantic UI slots

Examples of raw primitives:

- brand colors
- neutral palette colors
- spacing steps
- radius steps

Examples of semantic slots:

- `background`
- `color`
- `borderColor`
- `placeholderColor`
- `shadowColor`

Avoid naming that collapses those layers together.

In practice:

- tokens should not become a duplicate semantic theme map
- themes should not become a bag of raw palette values with no semantic intent
- agents should choose names that still make sense if the visual branding changes later

### Public theming contract

Not every internal component is automatically part of the public override surface.

A component is part of the public theming contract only if:

- it is a reusable primitive or documented widget surface
- its visual identity is expected to be host-customizable
- its name and override behavior are intended to remain stable

A component is not automatically public just because it has a Tamagui `name`.

When adding or reviewing a named component, explicitly decide:

- is this an internal implementation detail
- is this a public override target
- do we expect host apps to rely on this name

If the answer is "internal", avoid documenting it as a supported override target even if Tamagui technically allows it.

### Multi-widget examples

Examples should demonstrate both:

- default standalone widget rendering
- separate widget instances using different overrides on the same page

This is important because the product requirement is instance-level branding flexibility, not only app-global theming.

### Compiler and config stability guardrail

Tamagui prefers a stable config source for compilation and extraction.

For this repo:

- keep the canonical config assembly in `packages/ui`
- keep runtime override inputs constrained and well-defined
- do not let per-instance theming turn into arbitrary ad hoc config mutation

Per-instance theming is supported, but it must still be built from the same documented config pipeline and naming rules.

## Current Correction Targets

These are the main issues the current codebase should be corrected toward.

### 19. Stop mixing static config definition with runtime deep-merge mutation

Current direction to avoid:

- define Tamagui tokens/themes once in module scope
- deep-merge overrides at provider runtime
- assume theme values still track overridden tokens

Correct direction:

- keep plain seeds and factories in `packages/ui`
- derive effective tokens first
- derive themes from those effective tokens
- create the final config from that single effective source

### 20. Separate broad branding from component skinning

Use:

- token overrides for broad brand/palette/scale changes
- theme overrides for semantic contextual changes
- component sub-theme overrides for component-specific skinning

Do not use component themes as the first tool for global re-branding if the intent is actually token-level.

### 21. Tighten naming and override contracts

Current and future components should have an explicit answer to:

- what is the component name?
- does it own a sub-theme?
- should a host be able to override it?
- is it a design-system primitive or just composition?

If those answers are unclear, do not add a new named theme target yet.

### 22. Make instance-level theming a first-class requirement

The system should be designed so that:

- one widget can use the default preset
- another widget on the same page can use host branding
- both remain isolated and predictable

Any architecture that assumes one implicit global active GoodWidget theme is the wrong direction for this product.

### 23. Document and preserve override precedence

When refactoring or extending theming, preserve this order unless there is a deliberate product decision to change it:

1. `packages/ui` base preset
2. widget package defaults
3. host/integrator overrides
4. one-off local styling

If code makes this precedence ambiguous, fix the code or the API before adding more theming features.

### 24. Treat public override targets as API surface

Public theme targets are part of the library API.

That means:

- their names should be intentional
- renaming them is a breaking change for integrators
- examples and docs should focus on public targets, not incidental internal names

Do not casually expand the public theming surface without a clear need.

## Decision Checklist

Before changing Tamagui config or adding a component, answer these questions:

1. Is this value static or contextual?
2. If static, should it be a token?
3. If contextual, should it be a base theme key or a component sub-theme key?
4. Does this component need its own `name`, or can it rely on the parent/base theme?
5. Is this a reusable primitive in `packages/ui`, or just composition in a widget package?
6. If overrides are needed, should they happen at token level, theme level, or through a nested `Theme` boundary?
7. If tokens can change, are all dependent themes being regenerated from the same effective source?
8. Is this override scoped per widget instance, or does it accidentally leak into a broader boundary?
9. Is this component or theme name part of the intended public override API?
10. Does this change preserve the documented override precedence?

## Working Guidance For Agents

When reviewing or changing this repo:

- prefer official Tamagui semantics over ad-hoc merge behavior
- preserve a clear separation between tokens, themes, and config assembly
- keep the set of named components intentional
- make override APIs narrower, not broader
- add short comments to non-trivial functions and methods in theming/config files so the
  token -> preset -> theme -> config flow can be understood from the code itself
- treat multi-widget isolation as a product requirement, not an edge case
- treat public override target names as API, not implementation trivia
- if a change makes examples easier but weakens the architecture, reject that change
