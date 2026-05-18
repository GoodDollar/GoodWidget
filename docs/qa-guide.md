# GoodWidget QA Guide

Use this guide for pre-deployment QA with Storybook being the main review environment.
Follow the [QA-Checklist](#qa-checklist)

## Setup

Make sure you are on the branch where you are QA'ing for.
Most of the time this is the branch where a pull-request is created on.
If not, a specific branch will be defined by the QA bounty

```sh
pnpm install
pnpm build
pnpm storybook
```

Open `http://localhost:6006`.

If you need to refresh the automated evidence:

```sh
pnpm test:storybook
pnpm test:demo <what tests to run>
```

pnpm test:demo tests <-- run all tests
pnpm test:demo tests/design-system <-- run all design system, primitives and theme tests
pnpm test:demo tests/widgets <-- run all widgets tests
pnpm test:demo tests/widgets/<widget specific folder> <-- only run tests for a specific widget.

## Storybook Structure

- `examples/storybook/src/stories/design-system/`: design-system primitives and theme examples.
- `examples/storybook/src/stories/<widget-name>/`: widget stories.

### Fixture / State Meanings

- `InjectedWallet`: uses the browser wallet (`window.ethereum`). Use this to verify real injected-wallet behavior in the browser, human-testing.
- `CustodialLocalFixture`: uses the local test private key fixture. Use this for deterministic manual QA and Playwright coverage.

### Design-system stories

- `Primitives/*`: verify layout, text, spacing, and visible interactions.
- `Theme/ThemePlayground`: verify overrides still apply correctly and do not break readability or hierarchy.

## Playwright Test Structure Alignment

- `tests/design-system/`: tests for stories under `stories/design-system/`.
- `tests/widgets/<widget-name>/`: tests for stories under `stories/<widget-name>/`.
- Screenshot evidence files:
- `tests/design-system/test-results/`
- `tests/widgets/<widget-name>/test-results/`

## QA Checklist

When applying for a QA bounty, make sure the bounty includes well defined test cases/states and flows.
if any of them are not clear, please discuss and ask questions before starting testing.

The expected test flow:

1. Open the PR.
2. Read the issue / acceptance criteria.
3. Confirm the PR includes the latest Playwright screenshots.
4. Confirm the PR includes playwright tests when new widgets are added, or existing widgets are updated with new state and flows.

Automated screenshots alone are just evidence, not a replacement for manual checking.
Therefor, we expect QA as part of the bounty to:

5. load locally the branch of the pull-request and run storybook to test the widget/states and flows.
6. once everything is manually confirmed verify if the tests include accurately the expected flows and states
7. QA role is not fixing things, its producing a report on your findings. [QA Report Template](#qa-report-template)

For manual testing verify sure each changed story/widget:

- Confirm the story opens without console/runtime errors.
- Compare the rendered state to the PR screenshots.
- Verify the expected CTA, copy, and visible state.
- Check basic layout at a narrow (mobile) width and a normal desktop width.
- If the story is interactive, follow the primary action flow and test the different states and confirm the result is sensible.
- Note anything that is visually broken, misleading, stuck, or inconsistent with the PR evidence or original bounty specification.

## QA Report Template

PR: <link or number>
Tester: <github-handle>
Date: <YYYY-MM-DD>

### Findings

- **QA Report**\
  Env: \[Browser / OS / Wallet / Network]\
  Branch: \[name or commit]
- **Tests**
  Scenario's to test are provided by the QA bounty instructions.
  Any additional flows that you think are missing, or bugs you find outside of the scenarios described.
  please follow the [QA bug-report](https://docs.gooddollar.org/for-developers/contributing/open-source1-contributors/qa-role#filing-a-bug-report)

```
| Scenario | Expected | Actual | ✅/❌ |
| -------- | -------- | ------ | --- |
|          |          |        |     |
```

- **Bugs**: \[# / None]
- **Verdict**: Pass / Fail / Minor issues
- **Evidence**: \[links,screenshots,screen-recordings etc]

```

```
