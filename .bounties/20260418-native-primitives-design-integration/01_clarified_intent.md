# Clarified Intent

## Interpreted intent

Define an implementation bounty for the first wave of `@goodwidget/ui` primitive migrations: replace the current exported `packages/ui/src/components-test` controls that are still custom `Stack`-driven implementations with Tamagui-native behavioral primitives, while applying the GoodWidget design-system contract at the same time. The main guiding artifact is [agent-next-steps/native-primitives-design-integration-task.md](../../agent-next-steps/native-primitives-design-integration-task.md), and the intended execution model is per-component migration plus immediate GoodWalletV2-aligned theming and demo readiness, using [packages/ui/src/components/Card.ts](../../packages/ui/src/components/Card.ts) and [packages/ui/src/components/Drawer.tsx](../../packages/ui/src/components/Drawer.tsx) as the closest current reference patterns.

## Assumptions

- The bounty should target the first implementation wave, not every remaining primitive in one pass.
- The first-wave target set is `Checkbox`, `Switch`, `Select`, `Input`, and `Button`.
- A second-wave set exists for `ScrollArea`, `Spinner`, `Toast`, and `ActionSheet`, but should not automatically be merged into the first-wave bounty.
- The work should preserve the current tokens -> derived themes -> `createTamagui()` pipeline in `packages/ui`.
- GoodWidget naming, manifest registration, and sub-theme contracts are part of the implementation, not follow-up polish.
- Demo behavior and copy in `examples/react-web` are in scope when needed to keep the migrated primitives honest and usable.
- `ActionSheet` and `Toast` are better treated as follow-up work unless the final bounty owner explicitly expands scope.
- `Alert` and `Badge` should currently be treated as GoodWidget compositions rather than assumed direct Tamagui-native replacements.

## Clarifying questions

### Must-answer (blocking)

- None.

### Should-answer

- Should the bounty require moving migrated components from `packages/ui/src/components-test/` into `packages/ui/src/components/`, or is retaining the current file locations acceptable for the first wave? — this affects change size and whether the task includes API-surface cleanup or only implementation alignment.
- Which newly named subparts, if any, should be treated as public override targets versus internal implementation detail? — this matters because component names and theme keys can become accidental API surface.
- Should `ActionSheet` and `Toast` stay explicitly out of scope for the first bounty, or be listed as optional stretch work? — this affects tiering and review expectations.
- Should `ScrollArea` and `Spinner` be intentionally saved for a second-wave bounty even though they have clear Tamagui support? — this affects how tightly the first-wave scope stays focused on form controls.

### Nice-to-have

- Is there a preferred reviewer or maintainer owner for approving new public theming targets? — helpful for faster scope decisions during review.
- Should the bounty require screenshots or short demo captures for each migrated primitive, or only for the full demo page? — useful for contributor guidance.

## Required context & documents

- [x] repo(s)/package(s)/paths
- [x] third-party docs (URLs + versions)
- [x] UX references (if UI)
- [x] constraints (security/backwards compat/networks)

## Provisional acceptance criteria (draft)

- [ ] `Checkbox`, `Switch`, `Select`, `Input`, and `Button` each use Tamagui-native behavior where Tamagui already provides the primitive.
- [ ] Each migrated primitive keeps or introduces only intentional GoodWidget `name` values and manifest-visible override targets.
- [ ] Each migrated primitive is visually aligned to the GoodWalletV2 preset and uses semantic theme/token styling rather than ad hoc color choices.
- [ ] The migrated primitives remain exported and usable through `@goodwidget/ui` without breaking the current demo path.
- [ ] `examples/react-web` demonstrates the migrated primitives honestly, including the distinction between broad token overrides and targeted component-theme overrides.
- [ ] Any custom keys or new sub-theme names introduced during the migration are either explicitly documented as supported contract or avoided.
- [ ] Components without a clear direct inline Tamagui primitive, such as `Alert` and `Badge`, are not incorrectly folded into the first-wave native-wrapper scope.

## Next step

Use this clarified intent plus the combined native-primitives task doc to produce a repo-context scan focused on first-wave `@goodwidget/ui` primitive migration paths, existing patterns, verification commands, and likely risks.
