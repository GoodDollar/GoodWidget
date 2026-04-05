# Task: Make Theme Overrides Propagate Consistently Through UI Primitives

This task defines the next implementation target for the GoodWidget UI layer:
make color and theme overrides apply in a predictable, visible, and repeatable way across primitives and widgets.

The immediate reason for this task is that the current mocked `claim-widget` and `react-web` demo communicate a stronger override story than the primitives currently support in practice.

Example of the mismatch:

- the `tokens` tab in `examples/react-web` says overriding `tokens.color.primary` should propagate through the widget
- in reality, only a subset of visible UI reflects that token
- other visible surfaces are driven by component theme values or unrelated semantic colors
- this makes the override story look unreliable even when Tamagui itself is functioning correctly

This task is not about inventing a new theming system.
It is about making the existing `tokens` + `themes` + `preset` model coherent at the primitive layer.

## Objective

Ensure that:

1. token overrides have a clear and limited but real propagation story
2. component theme overrides have a clear and stronger propagation story
3. primitives consistently consume semantic theme values instead of mixing hardcoded or loosely related color paths
4. demos only promise behavior that the primitive system actually provides

The end result should be:

- if a host overrides `tokens.color.primary`, the primitives that are supposed to express the primary action/accent visibly change
- if a host overrides `themes.light_Button` or `themes.light_Card`, the affected primitives visibly change in the expected way
- if a preset changes semantic action/surface/text colors, the widget updates coherently without widget-local exceptions

## Core Problem To Solve

Today, primitives do not consistently map visual roles to semantic theme keys.

Examples:

- `Button` uses the `Button` theme and therefore can reflect primary color changes
- `Card` uses `background`, `borderColor`, and `shadowColor`, but not all card-like visuals are intentionally tied to the same semantic surface story
- `Badge` variants use `successMuted`, `errorMuted`, `warningMuted`, and `infoMuted`, so changing `primary` does not necessarily change them
- `Text` mostly consumes `color` and `placeholderColor`, not action/accent tokens
- the mocked `ClaimWidget` mostly renders cards, labels, muted text, and amount text, so overriding only `primary` does not visibly recolor most of the widget

This is not a Tamagui failure.
It is a primitive contract problem:
the visual language of the primitives is not explicit enough, and the demos currently overstate token propagation.

## Scope

This task applies to the GoodWidget UI primitives and the mocked demo/widget only.

Relevant files:

- [config.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/config.ts)
- [theme.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/theme.ts)
- [Button.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components/Button.tsx)
- [Card.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components/Card.ts)
- [Badge.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components/Badge.ts)
- [Text.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components/Text.ts)
- [TokenAmount.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components/TokenAmount.tsx)
- [ClaimWidget.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/claim-widget/src/ClaimWidget.tsx)
- [App.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/examples/react-web/src/App.tsx)

This task does not require changes to:

- SDK adapters
- widget manifests
- Web Component registration
- GoodWalletV2 source code

## Required Design Rule

Every visible primitive must have an intentional answer to this question:

"Which semantic theme role is this primitive expressing?"

Allowed answers include:

- primary action
- secondary action
- surface
- muted surface
- primary text
- muted text
- success feedback
- warning feedback
- error feedback
- accent/emphasis

What is not acceptable:

- using whichever token happened to work visually at the time
- mixing semantic theme values and direct color choices without a documented reason
- relying on host token overrides to affect primitives that are not actually wired to those semantics

## Implementation Requirements

### 1. Define a primitive color contract

For each primitive, document which semantic roles it consumes.

At minimum:

- `Button`
  - primary variant must express primary action semantics
  - secondary/ghost/outline variants must express non-primary action semantics deliberately
- `Card`
  - must express surface semantics
- `Badge`
  - each badge variant must express explicit feedback or accent semantics
- `Text`
  - body/label/caption/display variants must clearly map to text semantics
- `TokenAmount`
  - amount and token symbol must have an explicit design rule for emphasis vs muted support text

The implementation does not need a separate registry or schema first.
It does need code comments or nearby documentation so the contract is visible to future contributors.

### 2. Reduce accidental dependence on raw token names

Raw token overrides like `tokens.color.primary` should only be expected to affect primitives that intentionally derive from the primary action or accent role.

That means:

- do not promise global recoloring from one token override
- do not leave important component colors disconnected from semantic theme roles if they are supposed to participate in the same visual system

The preferred pattern is:

- preset -> semantic roles -> component themes -> primitive styles

not:

- preset -> some token names
- host override -> some other token names
- primitive -> whichever theme key or hardcoded value happens to exist

### 3. Make component theme overrides the authoritative visual override path

For visible component-level changes, `themes.light_*` / `themes.dark_*` should be the explicit and reliable override mechanism.

That means:

- demos should use token overrides only for cases that actually propagate meaningfully
- demos should use component theme overrides for card/button/surface restyling
- primitive implementation should make component theme segments sufficiently expressive to support host branding and preset portability

### 4. Make the mocked claim widget an honest demonstration

The mocked `ClaimWidget` should only be used to demonstrate override behavior that it actually expresses.

Specifically:

- if the widget mostly shows surface/text/muted states, then the token demo must not claim broad primary-color propagation unless the primitive layer actually makes that visible
- if a stronger visual change is desired, the demo should use component theme overrides or a widget composition that visibly includes primary-action surfaces

This is a demo honesty requirement, not a request for widget-specific hacks.

## Deliverables

The implementation task should produce the following:

1. A primitive-by-primitive audit of current semantic color usage
2. A small, explicit primitive color contract documented in code and/or docs
3. Primitive updates so they consistently consume the intended semantic theme values
4. Demo updates so the claims about token propagation and component overrides are technically accurate
5. A short verification pass proving that the mocked `ClaimWidget` responds predictably to:
   - `tokens.color.primary`
   - `themes.light_Button`
   - `themes.light_Card`
   - one feedback-themed primitive such as `Badge` or `Alert`

## Acceptance Criteria

This task is complete only if all of the following are true:

1. Overriding `tokens.color.primary` causes a visible change in every primitive that is explicitly defined as expressing primary action or accent semantics.
2. Overriding `tokens.color.primary` does not claim to recolor primitives that are intentionally using surface/text/feedback semantics.
3. Overriding `themes.light_Button` visibly changes primary button surfaces in both the standalone primitive demo and the mocked claim widget.
4. Overriding `themes.light_Card` visibly changes card-based surfaces in both the standalone primitive demo and the mocked claim widget.
5. Text emphasis, muted text, and amount display use an intentional semantic mapping rather than incidental color choices.
6. The `react-web` demo copy matches real behavior and no longer overstates token propagation.

## Recommended Execution Order

1. Audit primitives:
   - list current color/theme inputs for `Button`, `Card`, `Badge`, `Text`, `TokenAmount`, `Alert`
2. Define semantic intent:
   - write down the intended semantic role for each variant/state
3. Update primitive implementations:
   - align styles to semantic theme keys
4. Verify widget composition:
   - confirm the mocked `ClaimWidget` is composed from primitives in a way that makes override behavior visible and understandable
5. Update demo copy:
   - make the `react-web` tabs say exactly what the override level is expected to affect

## What Not To Do

1. Do not add widget-local color hacks just to make one screenshot look better.
2. Do not introduce a second parallel theming system.
3. Do not solve this by hardcoding special purple/pink/teal cases into primitives.
4. Do not blur the distinction between token overrides and component theme overrides.
5. Do not use GoodWalletV2 local component styles as a shortcut for mocked widget behavior.

## The Intended Outcome

After this task, the override story should be simple and defensible:

- presets define the baseline semantic design system
- tokens influence shared scales and a limited set of semantic color roots
- component themes define the actual visual contract used by primitives
- primitives consume those theme values consistently
- demos show the real effect of each override level without exaggeration
