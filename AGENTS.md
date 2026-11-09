# GoodWidget Contribution Instructions

These instructions apply to people and agents working in this repository.
Read them before starting work; open the linked documents required for your task.
Links are references, not automatically loaded instructions.

## Before starting

1. Read the [GoodDollar contribution guide](https://github.com/GoodDollar/.github/blob/master/CONTRIBUTING.md)
   and the issue or maintainer request, including acceptance criteria and linked references.
2. Confirm a maintainer has assigned or explicitly approved the work and its scope.
   Opening an issue, requesting assignment, finding a problem in a scan, or receiving no
   response is not approval. A direct maintainer request can authorize scoped local work.
3. For implementation, read [ARCHITECTURE.md](ARCHITECTURE.md), inspect nearby code and
   tests, then use the task references below. For QA or documentation, read the relevant
   guide and source material.
4. If required inputs are missing, references are inaccessible, or instructions conflict,
   report the specific gap to the maintainer before proceeding with affected work. Do not
   invent requirements or claim to have read unavailable material.

### When to plan

- Create a separate plan when the request needs investigation or design decisions to
  establish a solution. State the proposed scope, approach, acceptance criteria and
  verification; obtain maintainer approval before implementation.
- A clear, approved issue does not need a separate plan or a `[PLAN]` title.
- For assigned issue-planning work, use the planning section of the
  [spec template](.github/ISSUE_TEMPLATE/goodwidget-spec-template.yml). Preserve the
  parent issue and prepare a `[DRAFT][PLAN]` sub-issue for review. Planning authorization
  does not authorize implementation or a PR.
- Do not implement a draft or planning-only request. If its status conflicts with an
  implementation assignment, ask the maintainer to resolve it.

## Task references

| Task | Read |
| --- | --- |
| Package responsibilities and runtime | [ARCHITECTURE.md](ARCHITECTURE.md) |
| New widgets, components or UI changes | [Widget author instructions](docs/widget-author-instructions.md) |
| Tamagui config, tokens, themes, presets, primitives, names or override behavior | [Theming contract](docs/architecture/theming-contract.md) |
| Stories, fixtures, Playwright and screenshot locations | [Demo environment](docs/demo-environment.md) |
| Human or live QA and reporting | [QA guide](docs/qa-guide.md) |
| Package exports and distribution | [Packaging guide](docs/PACKAGING.md) |
| Defining a new widget issue | [Spec template](.github/ISSUE_TEMPLATE/goodwidget-spec-template.yml) |
| Preparing a contributor bounty for an existing PR | [Contributor bounty guidance](docs/contributor-bounty-template.md) |

Use the requirements for the assigned task. The new-widget template and bounty-specific
roles do not apply automatically to maintenance, documentation or QA-only work.
Historical plans and task notes are context, not authorization to expand the task.
Central links target published `master` content. Do not assume changes proposed in an
organization PR are merged; report conflicts with the agreed task or these instructions.

## Coding and design

- Keep changes within the agreed scope. Reuse existing helpers and follow nearby
  TypeScript, React and formatting conventions; avoid unrelated refactors.
- Put each new widget in its own package under `packages/`, with a clear name and
  description. Keep widget-specific components there; move components to `packages/ui`
  only when they are reusable across widgets.
- For new widgets, ship the required SDK functionality as part of the widget. Discuss
  the implementation, package exports and any migration from
  [GoodSDKs](https://github.com/GoodDollar/GoodSDKs) with the bounty lead or maintainer
  before implementing; keep SDK logic modular within the agreed package structure.
- All widgets must support both injected-wallet connection and Reown connection using
  `DefaultAppKitProvider` from `@goodwidget/embed/appkit-provider`. Follow the
  [wallet integration guidance](docs/widget-author-instructions.md#wallet-connections-and-rpc-clients).
  Report unsupported host/platform cases to the maintainer for a decision; do not silently
  omit either flow or claim all existing widgets already comply.
- Use `createViemFallbackClient` from `@goodwidget/core/viemFallbackClient` for RPC-backed
  reads where fallback endpoints are appropriate; see the [core guide](packages/core/README.md).
  It is an RPC client helper, not a wallet-connection provider. Preserve the connected
  wallet's signing transport.
- Split large components and hooks by responsibility. Avoid trivial single-line helpers
  that only add indirection. Document new components and significant changes, and preserve
  existing code comments unless their removal is explicitly requested.
- Use [packages/ui/src/presets.ts](packages/ui/src/presets.ts) as the leading current
  design-system reference. Use tokens for static values and themes for semantic values.
  Keep Tamagui config assembly in `packages/ui`; derive themes from the effective
  token source before creating the config.
- Keep provider/context behavior in `packages/core` and Web Component bridging in
  `packages/embed`. Do not author base tokens/themes in core, deep-merge already-created
  Tamagui objects as the main override model, or bypass the provider-first runtime path.
- Treat public component names and theme targets as API. Get maintainer agreement before
  adding public theme targets, changing override precedence, moving logic across package
  boundaries, or adding wallet/provider abstractions or dependencies. Existing approval
  covering the change is sufficient.
- Do not import directly from `react-native`. Check Tamagui's available components and
  APIs first, then the reviewed GoodWidget components; discuss missing capabilities with
  the maintainer instead of adding a direct import.
- Components in [packages/ui/src/components-test](packages/ui/src/components-test) are
  unreviewed and not aligned with the design system. Never use them in production-ready
  widgets or flows, including through barrel exports or shared-component dependencies.
  Inspect [UI exports](packages/ui/src/index.ts); report inherited usage and agree its
  migration with the maintainer before calling the affected flow production-ready.
- When a UX flow recurs, ask the maintainer whether it should become a generic shared
  flow. Use [Stepper.tsx](packages/ui/src/components/Stepper.tsx) as an example of shared
  flow structure, not as proof that its current dependencies meet the production rules.
- Keep single-widget styling local. For a shared UI change, explain the shared bug or
  requirement, identify affected widgets, and update their relevant regression coverage.
- Render `<WidgetVersion name="..." version={version} />` from `@goodwidget/ui` in every
  widget as described in the author guide.

## Verification and evidence

Use pnpm (the version is pinned in `package.json`). Run the issue's verification commands
and always include relevant tests for behavior changes; documentation-only work needs
link and consistency checks rather than unrelated UI tests.

| Command | Purpose |
| --- | --- |
| `pnpm install --frozen-lockfile` | Install workspace dependencies |
| `pnpm build` | Build workspace packages |
| `pnpm lint` | Run workspace lint scripts |
| `pnpm storybook` | Start Storybook on `http://localhost:6006` |
| `pnpm test:storybook` | Run story interactions; requires running Storybook |
| `pnpm test:demo` | Run Playwright; starts or reuses Storybook |
| `pnpm test:demo tests/widgets/<widget-folder>` | Run one widget's Playwright tests |

- For new widgets, components and UI changes, add or update Storybook examples and
  Playwright smoke tests for affected flows, including error and empty states. Cover
  both injected-wallet and Reown connection flows for every widget, plus custodial flows
  where supported or required. Report missing configuration or platform gaps as blocked;
  fixture coverage alone does not prove a real Reown session.
- Put widget stories in `examples/storybook/src/stories/<widget-name>/`, shared stories
  in `examples/storybook/src/stories/design-system/`, and corresponding tests under
  `tests/widgets/<widget-name>/` or `tests/design-system/`. Fixture helpers live in
  `examples/storybook/src/fixtures/`; see the demo guide for their use and limitations.
- Generate accurate test images with the repository's Playwright setup. Assert the
  intended state before capturing page or locator screenshots; inspect the output and
  use descriptive flow/state filenames. Do not substitute edited or fabricated images,
  or relabel old captures as a new run. Keep current curated screenshots
  under `tests/widgets/<widget-name>/test-results/` or `tests/design-system/test-results/`.
  Refresh affected captures after visual changes and remove superseded captures for the
  changed flow. Preserve the anchored `/test-results/` ignore rule for temporary artifacts.
- Inspect the rendered UI against design references in light/dark and mobile/desktop
  states as applicable. Screenshots alone do not establish a visual review.
- When human or live QA is required, follow the QA guide: a human must explore the
  experience, and required live flows must be tested in the agreed environment. Automated
  tests, fixtures and agent exploration do not fulfill human QA. Report remaining work.
- Record the tested commit/build and any local changes, commands, results and evidence.
  Distinguish human, automated and agent-assisted checks and mocked, simulated and live
  behavior. Mark checks not performed as **Blocked** or **Not run**, with the reason.
- Do not remove or disable existing tests unless explicitly authorized by the issue.

## Review handoff

- Open the current [organization PR template](https://github.com/GoodDollar/.github/blob/master/.github/PULL_REQUEST_TEMPLATE.md)
  when preparing an authorized PR; use it alongside the repository requirements below.
- Link the issue in the PR title and description; mirror its acceptance criteria as a
  checklist. Explain the change, evidence, failures, omissions and remaining risks.
- Link current UI screenshots or video in the PR description. Identify the tested
  revision; do not present evidence from an older implementation as current verification.
- Agents must have their human operator's authorization before opening a PR. Discovering
  work or receiving planning permission does not authorize an unsolicited PR.
- Follow the task's assigned review route. Maintainer acceptance, merge, deployment and
  bounty payment are separate from completing implementation or QA.
