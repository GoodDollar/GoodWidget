# [BOUNTY] Migrate First-Wave UI Primitives To Tamagui-Native Wrappers

Contribution guidelines:
https://docs.gooddollar.org/for-developers/contributing#gooddollar-bounties-overview

## Summary

GoodWidget currently exports several reusable controls from `packages/ui/src/components-test/`, and many of them still recreate primitive behavior with `Stack` instead of using Tamagui’s native components. This bounty covers the first direct migration wave: `Checkbox`, `Switch`, `Select`, `Input`, and `Button`.

The implementation is not just a behavior swap. Each migrated primitive must also preserve or improve:

- GoodWidget naming
- manifest registration discipline
- semantic theming
- GoodWalletV2 preset alignment
- demo readiness in `examples/react-web`

The result should be a set of migrated primitives that are immediately usable in `@goodwidget/ui`, demo correctly in `examples/react-web`, and do not accidentally expand the public override API.

Supporting artifacts on this branch:

- `.bounties/20260418-native-primitives-design-integration/01_clarified_intent.md`
- `.bounties/20260418-native-primitives-design-integration/02_repo_context.md`
- `.bounties/20260418-native-primitives-design-integration/03_bounty_spec.md`
- `.bounties/20260418-native-primitives-design-integration/04_review_dod.md`
- `agent-next-steps/native-primitives-design-integration-task.md`

## Desired Behavior

- `Checkbox`, `Switch`, `Select`, `Input`, and `Button` use Tamagui-native primitives as their behavioral base where Tamagui already provides that primitive.
- Each migrated primitive keeps only intentional GoodWidget `name` values and themed subparts, with no accidental new public override targets.
- Each migrated primitive applies GoodWidget semantic styling and remains aligned to the shipped GoodWalletV2 preset.
- The exported `@goodwidget/ui` API remains usable by current consumers, including `examples/react-web` and existing widget composition paths.
- The migrated primitives can be demonstrated honestly in `examples/react-web`, including the distinction between broad token overrides and targeted component-theme overrides.
- Any custom keys or component-specific theme extensions introduced during migration are explicitly intentional and justified, or avoided.

## Tamagui Support Matrix

The current exported `@goodwidget/ui` surface should not be treated as one uniform “all of these are direct native wrapper” set.

### Direct first-wave candidates

- `Checkbox` -> Tamagui `Checkbox`
- `Switch` -> Tamagui `Switch`
- `Select` -> Tamagui `Select`
- `Input` -> Tamagui `Input`
- `Button` -> Tamagui `Button`

### Clear second-wave candidates

- `ScrollArea` -> Tamagui `ScrollView`
- `Spinner` -> Tamagui `Spinner`
- `Toast` -> Tamagui `Toast`
- `ActionSheet` -> Tamagui `Sheet`
- `Drawer` -> Tamagui `Sheet` (already aligned reference)

### GoodWidget compositions built from Tamagui parts

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

### Components without a clear 1:1 inline Tamagui primitive

- `Alert` — nearest official pieces are `AlertDialog`, `Dialog`, and `Toast`, but no clear inline banner-style primitive was identified
- `Badge` — no clear official Tamagui `Badge` primitive was identified

### Planning implication

- First-wave direct migration should stay focused on `Checkbox`, `Switch`, `Select`, `Input`, and `Button`
- Second-wave work can cover `ScrollArea`, `Spinner`, `Toast`, and `ActionSheet`
- `Alert` and `Badge` still matter for semantic consistency, but should not be forced into the same direct native-wrapper task shape

## Scope

**In scope**

- Migrating `Checkbox`, `Switch`, `Select`, `Input`, and `Button` from custom `components-test` behavior to Tamagui-native wrappers
- Applying GoodWidget naming, `createComponent` usage, and manifest discipline to the migrated primitives
- Aligning migrated primitive visuals with current token/theme/preset semantics
- Updating `examples/react-web` only as needed to keep the migrated primitives usable and the demo copy honest
- Small supporting updates to `theme.ts`, `presets.ts`, `config.ts`, or exports if required by the migration

**Out of scope**

- A full migration of every remaining `components-test` component
- `ScrollArea`, `Spinner`, `Toast`, and `ActionSheet` migration unless maintainers explicitly expand the bounty
- `Alert` and `Badge` redesign or forced direct native-migration work
- Rebuilding the overall Tamagui config architecture
- Wallet, SDK, host-detection, or onchain behavior changes
- Large visual redesign beyond current GoodWalletV2-aligned semantics

## Starting Points

- `agent-next-steps/native-primitives-design-integration-task.md` — canonical execution brief and migration rubric
- `packages/ui/src/components/Drawer.tsx` — best current example of Tamagui-native behavior wrapped with GoodWidget-named themed subparts
- `packages/ui/src/components/Card.ts` — best current example of a stable GoodWidget primitive consuming semantic theme values
- `packages/ui/src/createComponent.ts` — naming + manifest registration wrapper that should be reused where public themed subparts are intentional
- `packages/ui/src/components-test/Checkbox.tsx` — first-wave migration target
- `packages/ui/src/components-test/Switch.tsx` — first-wave migration target
- `packages/ui/src/components-test/Select.tsx` — first-wave migration target
- `packages/ui/src/components-test/Input.tsx` — first-wave migration target
- `packages/ui/src/components-test/Button.tsx` — first-wave migration target
- `examples/react-web/src/App.tsx` — main manual QA surface and demo-honesty validation path

## Definition Of Done

- [ ] `Checkbox`, `Switch`, `Select`, `Input`, and `Button` use Tamagui-native primitives for behavior where available.
- [ ] Any exposed visual subparts use intentional GoodWidget `name` values and `createComponent` where appropriate.
- [ ] No accidental public override targets or undocumented theme-key contracts are introduced.
- [ ] Migrated primitives consume semantic theme/token styling consistent with the current GoodWalletV2 preset.
- [ ] `packages/ui/src/index.ts` continues to export the migrated primitives in a stable and intentional way.
- [ ] `examples/react-web` still renders and exercises the migrated primitives correctly after the refactor.
- [ ] Demo copy and example behavior remain accurate about broad token overrides versus targeted component-theme overrides.
- [ ] Repo lint/build and `examples/react-web` build pass with the migrated primitives.
- [ ] The implementation does not silently expand into second-wave primitives or composition-only components unless maintainers explicitly approve that scope change.

## How To Test

```bash
pnpm install
pnpm lint
pnpm build
pnpm --dir examples/react-web lint
pnpm --dir examples/react-web build
pnpm --dir examples/react-web dev
```

## Notes For Contributors

- Treat naming and theme-key exposure as API-surface decisions, not incidental implementation details.
- Prefer Tamagui-native behavior first, but keep GoodWidget responsible for naming, theme targeting, preset alignment, and manifest discipline.
- Do not assume every `components-test` export has a direct Tamagui equivalent.
- If you believe scope should expand into the second-wave set, ask for explicit maintainer approval first.
