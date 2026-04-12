# Task: Make Theme Propagation Consistent Across Primitives And Demos

This task defines the next implementation target for the GoodWidget UI layer:
make token/theme propagation predictable, visible, and honestly represented in demos.

The current architecture is now:
- token values are plain seed values
- theme values are plain semantic maps derived from tokens
- `createTamagui({ themes })` consumes plain theme objects

This task is not about inventing a new theming system.
It is about making primitive color contracts and demo messaging match the existing model.

## Objective

Ensure that:

1. token overrides have a clear broad-scope story
2. component theme overrides have a clear isolated-target story
3. primitives consistently consume intentional semantic theme roles
4. demos only promise behavior that primitives actually provide

End result:
- if a host overrides `tokens.color.primary`, primitives wired to primary/action semantics visibly change
- if a host overrides `themes.light_Button` or `themes.light_Card`, those components visibly and reliably change
- demos distinguish broad token effects from targeted component-theme effects

## Core Problem To Solve

Primitives are still inconsistent in how they map visuals to semantic roles.
Some components still use hardcoded colors where theme semantics should be explicit.

Examples from current code:
- `Badge` variant backgrounds are hardcoded hex values
- `Alert` variant backgrounds and borders are hardcoded hex values
- `Text` mostly uses semantic theme keys (`$color`, `$placeholderColor`)
- `TokenAmount` uses semantic text + muted text split, but no explicit contract note

Result:
- token override demos can overpromise
- component-theme override story can look stronger than primitive contracts actually support

## Scope

Relevant files:
- [config.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/config.ts)
- [theme.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/theme.ts)
- [Button.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components/Button.tsx)
- [Card.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components/Card.ts)
- [Badge.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components/Badge.ts)
- [Text.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components/Text.ts)
- [TokenAmount.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components/TokenAmount.tsx)
- [Alert.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/components/Alert.tsx)
- [ClaimWidget.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/claim-widget/src/ClaimWidget.tsx)
- [App.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/examples/react-web/src/App.tsx)

Out of scope:
- SDK adapters
- widget manifests
- Web Component registration
- wallet host integrations

## Required Design Rules

### 1. Primitive semantic intent must be explicit

Every visible primitive must have an intentional answer to:
"Which semantic theme role is this primitive expressing?"

Allowed roles include:
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

Not acceptable:
- color choices that only happen to look right
- hardcoded values without deliberate semantic reason
- demo claims that depend on undefined semantic contracts

### 2. Token overrides are broad by default

Token overrides are system-level inputs, not guaranteed isolated styling.

Implications:
- in shared provider/config contexts, token changes can affect non-widget UI using the same system
- token demo copy must not imply strict per-widget isolation in regular React app trees
- isolated targeting should be demonstrated via component theme overrides (`themes.light_*`) and provider boundaries

### 3. Component theme overrides are the authoritative targeted path

For visible component-level restyling, `themes.light_*` / `themes.dark_*` should be the primary reliable mechanism.

Demos should:
- use token overrides for broad design-system adjustments
- use component theme overrides for explicit targeted restyling

### 4. Demo honesty over visual drama

The mocked `ClaimWidget` and `react-web` demo must only claim behavior that primitives actually express.

If token override impact is intentionally limited for semantic reasons, demo copy must say that.

## Implementation Requirements

### 1. Primitive color contract audit

Audit current color paths for:
- `Button`
- `Card`
- `Badge`
- `Text`
- `TokenAmount`
- `Alert`

Capture:
- which semantic theme keys each variant/state consumes
- where hardcoded colors still exist
- which hardcoded colors are acceptable vs should be replaced

### 2. Align primitives to semantic theme roles

Update primitives so variants map to deliberate theme semantics.

At minimum:
- primary button path must clearly express primary action semantics
- card surfaces must clearly express surface semantics
- feedback components (`Badge`, `Alert`) must use an explicit feedback semantic strategy
- text variants must keep clear body vs muted contract

Implementation can use code comments and/or nearby docs.
No separate schema/registry required in this task.

### 3. Align demo behavior and copy

In `examples/react-web`:
- token tab text must describe broad/system-level behavior accurately
- component tab text must describe targeted component-theme behavior
- host tab text must emphasize host override precedence and component targeting

### 4. Validate propagation behavior

Provide a short verification pass showing expected responses for:
- `tokens.color.primary`
- `themes.light_Button`
- `themes.light_Card`
- one feedback primitive override path (`Badge` or `Alert`)

## Deliverables

1. Primitive semantic usage audit notes
2. Primitive updates for consistent semantic mapping
3. Demo copy updates aligned to real behavior
4. Verification notes for token vs component-theme propagation

## Acceptance Criteria

Task is complete only if all are true:

1. `tokens.color.primary` visibly changes primitives explicitly mapped to primary/accent semantics.
2. `tokens.color.primary` is not described as an isolated widget-only override in the shared React demo context.
3. `themes.light_Button` visibly changes button surfaces in primitive and widget contexts.
4. `themes.light_Card` visibly changes card surfaces in primitive and widget contexts.
5. `Badge` and `Alert` have explicit feedback color contract decisions (semantic mapping or justified hardcoded exception).
6. Demo tab copy matches actual runtime behavior without overstatement.

## Recommended Execution Order

1. Audit primitive color/semantic usage
2. Write or refine primitive semantic role notes
3. Update primitive color paths
4. Validate mocked widget composition behavior
5. Update demo copy and examples
6. Run verification pass

## What Not To Do

1. Do not add widget-local hacks for a single screenshot/demo state.
2. Do not create a parallel theming system.
3. Do not hardcode one-off brand colors into shared primitives.
4. Do not blur token overrides vs component-theme overrides.
5. Do not claim per-widget isolation for token overrides in contexts where config/theme scope is shared.

## Intended Outcome

After this task:
- presets define baseline semantics
- tokens define broad system inputs and scales
- component themes define targeted visual contracts
- primitives consume semantic roles consistently
- demos communicate real override behavior accurately
