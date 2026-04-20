# Repo Context Report

## Repo & package targets

- Repo(s): `GoodDollar/GoodWidget`
- Package(s)/workspaces: `packages/ui`, `packages/core`, `packages/embed`, `packages/claim-widget`, `examples/react-web`
- Primary paths:
  - `packages/ui/src/components-test/Checkbox.tsx`
  - `packages/ui/src/components-test/Switch.tsx`
  - `packages/ui/src/components-test/Select.tsx`
  - `packages/ui/src/components-test/Input.tsx`
  - `packages/ui/src/components-test/Button.tsx`
  - `packages/ui/src/components/Card.ts`
  - `packages/ui/src/components/Drawer.tsx`
  - `packages/ui/src/createComponent.ts`
  - `packages/ui/src/manifest.ts`
  - `packages/ui/src/config.ts`
  - `packages/ui/src/theme.ts`
  - `packages/ui/src/presets.ts`
  - `packages/ui/src/index.ts`
  - `examples/react-web/src/App.tsx`
  - `agent-next-steps/native-primitives-design-integration-task.md`
- Build/test/lint commands found:
  - root: `pnpm build`, `pnpm dev`, `pnpm lint`
  - `packages/ui`: `pnpm --dir packages/ui build`, `pnpm --dir packages/ui lint`
  - `packages/core`: `pnpm --dir packages/core build`, `pnpm --dir packages/core lint`
  - `packages/embed`: `pnpm --dir packages/embed build`, `pnpm --dir packages/embed lint`
  - `packages/claim-widget`: `pnpm --dir packages/claim-widget build`, `pnpm --dir packages/claim-widget lint`
  - `examples/react-web`: `pnpm --dir examples/react-web build`, `pnpm --dir examples/react-web lint`
  - no dedicated repo-level `test` or `typecheck` scripts were found; `examples/react-web` currently typechecks via `tsc && vite build`

## Closest existing patterns (paths)

- `packages/ui/src/components/Drawer.tsx` — best current reference for Tamagui-native behavior plus GoodWidget-wrapped themed subparts.
- `packages/ui/src/components/Card.ts` — clean example of a GoodWidget-named primitive consuming semantic theme keys and shared token scales.
- `packages/ui/src/createComponent.ts` — the canonical wrapper for naming and manifest registration; this is the mechanism contributors should use when exposing themed subparts.
- `packages/ui/src/manifest.ts` — defines the runtime override-surface discovery model; important for deciding which names become public targets.
- `packages/ui/src/config.ts` — shows the authoritative config layering and confirms the bounty must preserve the seed -> derived themes -> `createTamagui()` pipeline.
- `packages/ui/src/theme.ts` — defines current base semantic theme keys and indicates which styling decisions are already shared versus still local.
- `packages/claim-widget/src/ClaimWidget.tsx` — current real widget composition example, including widget-specific named components like `ClaimCard` and `ClaimActionButton`.
- `examples/react-web/src/App.tsx` — the current override demo and the main place where migrated primitives need to remain usable and honestly represented.

## Likely change points (ranked)

### Core logic / services

- `packages/ui/src/createComponent.ts` — may need small changes only if the migration requires different wrapper ergonomics for Tamagui-native subparts.
- `packages/ui/src/manifest.ts` — may need updates only if the team decides to expose or suppress new public override targets.

### UI / components

- `packages/ui/src/components-test/Checkbox.tsx` — currently custom `Stack`-based; highest-priority candidate for Tamagui `Checkbox`.
- `packages/ui/src/components-test/Switch.tsx` — currently custom `Stack`-based; strong candidate for Tamagui `Switch`.
- `packages/ui/src/components-test/Select.tsx` — currently custom open-state and option rendering; strong candidate for Tamagui `Select`.
- `packages/ui/src/components-test/Input.tsx` — currently a custom `Stack` + `tag: 'input'` implementation; strong candidate for Tamagui `Input`.
- `packages/ui/src/components-test/Button.tsx` — currently a custom `Stack`-based control with `Theme reset` handling; candidate for Tamagui `Button`.
- `packages/ui/src/index.ts` — export surface that will need to stay stable or be intentionally updated if file locations change.
- `packages/ui/src/components/Card.ts` — reference for semantic styling and likely inheritance / `extends` model.
- `packages/ui/src/components/Drawer.tsx` — reference for Tamagui-native behavior and GoodWidget-wrapped subparts.

### Hooks / state

- `examples/react-web/src/App.tsx` — uses the migrated primitives directly and is the main manual QA surface for component behavior and demo honesty.
- `packages/claim-widget/src/ClaimWidget.tsx` — may be indirectly affected if shared button or input semantics change, even if it does not consume every first-wave primitive today.

### SDK / API wrappers

- None expected for this bounty.

### Contracts / onchain

- None expected for this bounty.

### Config / env

- `packages/ui/src/config.ts` — must remain architecturally intact; migrations should not regress the override pipeline.
- `packages/ui/src/theme.ts` — may need small additions or clarifications if a migrated primitive requires explicit semantic keys.
- `packages/ui/src/presets.ts` — may need adjustments if the GoodWalletV2 preset needs component-theme refinements for the migrated primitives.
- `packages/ui/package.json` — reference only; confirms Tamagui `1.121.0`, `@tamagui/core 1.121.0`, and `@tamagui/themes 1.121.0`.
- `examples/expo/package.json` — confirms the current Expo 52 / React Native 0.76.9 compatibility baseline that should not be accidentally regressed.

## Dependencies & integration notes

- Third-party libs (name + where used + version if found)
  - `tamagui@1.121.0` — core UI library in `packages/ui`
  - `@tamagui/core@1.121.0` — core Tamagui primitives and styling runtime in `packages/ui`
  - `@tamagui/themes@1.121.0` — theme package in `packages/ui`
  - `@tamagui/animations-react-native@^1.121.0` — animation config assembly in `packages/ui/src/config.ts`
  - `expo@~52.0.0` and `react-native@0.76.9` — current native compatibility baseline in `examples/expo`
- Internal modules to reuse
  - `createComponent()` for naming + manifest registration
  - `Card` and `Drawer` as current implementation references
  - `config.ts`, `theme.ts`, and `presets.ts` for understanding semantic theme expectations
  - `native-primitives-design-integration-task.md` as the execution rubric and architectural brief
- External docs needed (if any)
  - Tamagui docs for `Checkbox`, `Switch`, `Select`, `Input`, `Button`, and related theming/styled behavior
  - No additional third-party product docs appear blocking at this stage

## Tamagui primitive support map

- Direct first-wave candidates:
  - `Checkbox` -> Tamagui `Checkbox`
  - `Switch` -> Tamagui `Switch`
  - `Select` -> Tamagui `Select`
  - `Input` -> Tamagui `Input`
  - `Button` -> Tamagui `Button`
- Clear second-wave candidates:
  - `ScrollArea` -> Tamagui `ScrollView`
  - `Spinner` -> Tamagui `Spinner`
  - `Toast` -> Tamagui `Toast`
  - `ActionSheet` -> Tamagui `Sheet`
- Already aligned reference:
  - `Drawer` -> Tamagui `Sheet`
- Components likely to remain GoodWidget compositions built from Tamagui parts:
  - `Container`
  - `Card`
  - `GlowCard`
  - `MiniAppShell`
  - `TokenInput`
  - `AddressDisplay`
  - `WalletInfo`
  - `TransactionButton`
  - `ChainBadge`
  - `TokenAmount`
- Components without a clear 1:1 inline Tamagui primitive:
  - `Alert` — nearest official pieces are `AlertDialog`, `Dialog`, and `Toast`, but no obvious inline banner primitive was identified
  - `Badge` — no obvious official Tamagui `Badge` primitive was identified

Implication:

- the bounty should focus direct migration effort on primitives with real supporting Tamagui primitives
- composition-heavy components should be treated separately from the direct native-wrapper track
- `Alert` and `Badge` still matter for semantic consistency, but they are not strong candidates for the same direct migration workflow as `Checkbox` or `Button`

## Testing & verification plan

- Unit/integration/e2e likely affected:
  - No formal unit or e2e test suite was found in the repo scripts
  - Validation will rely on build/lint plus manual verification in `examples/react-web`
  - If the contributor adds focused tests, they should be package-local and scoped to migrated primitives rather than inventing a new broad test harness
- Manual QA steps:
  - run repo lint/build and package-specific build where needed
  - run `examples/react-web` and verify each migrated primitive still renders and behaves correctly
  - verify demo language and actual override behavior stay aligned
  - verify no accidental manifest/public override target expansion beyond intended names
  - verify the migrated primitives still fit the GoodWalletV2 preset visually

## Risks & edge cases

- High:
  - accidentally expanding public override API through new `name` values or custom theme keys
  - regressing current semantic theming by hardcoding styles into migrated primitives
  - changing component behavior without keeping the exported `@goodwidget/ui` API stable enough for current consumers
  - incorrectly assuming every `components-test` component has a direct Tamagui primitive and over-scoping the migration
- Medium:
  - Tamagui-native behavior may require structural changes to subparts, forcing clearer decisions about which parts should or should not be public override targets
  - the current demo copy in `examples/react-web` can become misleading if the migrated primitives do not react to overrides exactly as previously implied
  - cross-platform behavior may differ between web and Expo if the migration relies on web-only assumptions
- Low:
  - file moves from `components-test/` to `components/` can create churn without real architectural benefit if done too early
  - existing widget examples may need minor visual adjustments if shared primitive semantics become more explicit

## Open questions (blocking only)

- None.

## Handoff summary

The best executable first-wave bounty is to migrate `Checkbox`, `Switch`, `Select`, `Input`, and `Button` from current custom `components-test` implementations to Tamagui-native behavioral primitives while applying GoodWidget naming, manifest discipline, GoodWalletV2-aligned semantic styling, and demo readiness at the same time. `ScrollArea`, `Spinner`, `Toast`, and `ActionSheet` have supporting Tamagui primitives and are strong second-wave candidates, while `Alert` and `Badge` should currently be treated as GoodWidget compositions rather than forced direct migrations. `Card` and `Drawer` are the best current reference patterns; `config.ts`, `theme.ts`, and `presets.ts` define the architectural constraints; `examples/react-web/src/App.tsx` is the main validation surface; and the work should explicitly avoid turning accidental names or theme keys into public API.
