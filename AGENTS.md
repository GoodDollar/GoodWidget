# Agent Operating Guide

This is the always-read operating contract for coding agents working in this repository.
Read this document before writing any code. For deep reference on specific topics, see the
[Reference routing](#reference-routing) section at the bottom.

---

## Quick Start (Read First)

1. Read the GitHub issue body.
2. Confirm required spec inputs are present per
   [`.github/ISSUE_TEMPLATE/goodwidget-spec-template.yml`](.github/ISSUE_TEMPLATE/goodwidget-spec-template.yml).
3. Read [`ARCHITECTURE.md`](ARCHITECTURE.md).
4. Open the task-specific docs from [Reference routing](#reference-routing).
5. If required references are missing or inaccessible, stop and report what is missing before coding.

---

## Executable Commands

```bash
pnpm install          # install all workspace dependencies
pnpm run build        # build all packages (turbo)
pnpm run lint         # lint all packages (turbo)
pnpm run dev          # start dev servers (turbo, persistent)
pnpm run clean        # clean all build outputs
```

---

## Project Structure

```text
GoodWidget/
  AGENTS.md                          # this file — agent operating guide
  ARCHITECTURE.md                    # system overview and package responsibilities
  packages/
    ui/            # design-system: tokens, themes, config, primitives
    core/          # runtime: GoodWidgetProvider, hooks, host detection, wallet context
    embed/         # web-component bridge: Shadow DOM, CSS custom property reading
    claim-widget/  # example publishable widget
  examples/
    react-web/     # React web demo
    html/          # plain HTML web-component demo
    expo/          # Expo / React Native demo
    storybook/
      src/
        stories/
          <widget-name>/          # one subfolder per widget
            *.stories.tsx
          design-system/          # stories not tied to a specific widget
  tests/
    design-system/                # Playwright tests mapped to design-system stories
    widgets/<widget-name>/        # Playwright tests mapped to widget stories
  docs/
    PACKAGING.md                     # packaging and distribution guide
    demo-environment.md              # Storybook, Playwright, demo routes, fixtures
    architecture/
      theming-contract.md            # detailed Tamagui/theming rules
```

### Package boundaries

| Package          | Owns                                                                           |
| ---------------- | ------------------------------------------------------------------------------ |
| `packages/ui`    | UI primitives, tokens, themes, presets, config assembly, design-system exports |
| `packages/core`  | runtime/provider/context, theming boundary wiring                              |
| `packages/embed` | web-component bridge behavior, CSS property reading                            |
| widget packages  | feature-specific UI and SDK-backed flows                                       |

---

## Testing And QA (Summary)

- Story interaction checks: `pnpm test:storybook`.
- Playwright QA/state-flow checks: `pnpm test:demo`.
- Root Playwright runtime artifacts (trace/video/attachments): `/test-results/` (gitignored).
- Committable screenshot evidence: `tests/design-system/test-results/` and
  `tests/widgets/<widget-name>/test-results/`.
- Detailed workflow, fixture behavior, and QA reporting template live in
  [`docs/demo-environment.md`](docs/demo-environment.md) and [`docs/qa-guide.md`](docs/qa-guide.md).

---

## Always / Ask First / Never

### Always

- Use tokens for static design primitives and themes for contextual semantic values.
- Keep Tamagui config assembly in `packages/ui`.
- Derive themes from the effective token source before creating the Tamagui config.
- Treat public component names and theme targets as API surface (renaming is a breaking
  change for integrators).
- Mirror the issue checklist in the PR body.
- Preserve existing code comments when refactoring files unless explicitly asked to remove
  them.

### Ask first

- Adding new public theme targets.
- Changing override precedence.
- Moving logic across package boundaries.
- Adding wallet/provider abstractions or dependencies.
- Expanding the scope of a bounty beyond what the issue body specifies.

### Never

- Author base tokens or base themes in `packages/core`.
- Deep-merge already-created Tamagui token/theme objects as the primary override model.
- Bypass the provider-first runtime path.
- Refactor unrelated primitives or packages while completing a bounty.
- Infer major missing behavior from vague wording in the issue.

---

## PR Requirements

- PR title and description must reference the issue number.
- PR description must include a checklist mirroring the issue's acceptance criteria.
- Do not change code outside the scope described in the issue.
- Do not remove or disable existing tests unless the issue explicitly authorizes it.
- Validate changes against any verification commands listed in the issue.

---

## Reference Routing

Use the right document for each type of task:

| Topic                                                                                            | Reference                                                                        |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| System overview, package responsibilities, data flow                                             | [`ARCHITECTURE.md`](ARCHITECTURE.md)                                             |
| Storybook, Playwright, demo routes, stories, fixtures, test evidence, test folder conventions    | [`docs/demo-environment.md`](docs/demo-environment.md)                           |
| Manual QA flow and reporting template                                                            | [`docs/qa-guide.md`](docs/qa-guide.md)                                           |
| Creating new widgets and widget-local components                                                 | [`docs/widget-author-instructions.md`](docs/widget-author-instructions.md)       |
| Tamagui config, tokens, themes, presets, UI primitives, component names, public override targets | [`docs/architecture/theming-contract.md`](docs/architecture/theming-contract.md) |
| Packaging and distribution                                                                       | [`docs/PACKAGING.md`](docs/PACKAGING.md)                                         |
| Bounty scope, acceptance criteria, verification commands                                         | GitHub issue body                                                                |
