# GoodWidget QA Guide

Use this guide for GoodWidget QA and reporting. The individual QA bounty defines the
version, required scenarios, environments, live testing, design references and any
additional evidence. Ask the maintainer to clarify missing or inaccessible requirements
before testing; report any remaining gaps rather than assuming they passed.

## Setup

Check out the PR head or other revision named in the bounty, and record the exact commit
SHA (`git rev-parse HEAD`). A branch name alone can move and is not enough to identify
what was tested. If testing a deployed preview, record its URL and the commit or build
identifier it serves.

For local Storybook review:

```sh
pnpm install
pnpm build
pnpm storybook
```

Open `http://localhost:6006`. See the [demo environment guide](demo-environment.md)
for more about stories, fixtures and test artifacts.

To run automated checks when relevant to the bounty:

```sh
pnpm test:storybook
pnpm test:demo                              # all demo tests
pnpm test:demo tests/design-system          # design system and theme tests
pnpm test:demo tests/widgets                # all widget tests
pnpm test:demo tests/widgets/<widget-folder> # one widget's tests
```

## Review environments

- `Start Here/`: orientation pages; `Integrators/`: embedding and theming guides.
- `Design System/`: primitives and theming references. Check visible interactions,
  layout, readability and theme overrides where relevant.
- `Widgets/`: widget showcase stories and guides.
- `QA/`: deterministic fixture stories for automation and hard-to-reach states.
- `InjectedWallet` uses the browser wallet (`window.ethereum`); use an appropriate
  real wallet and network when the bounty calls for live wallet testing.
- `CustodialLocalFixture` uses a local test private-key fixture for deterministic
  manual or automated checks. Fixture behavior is not proof of a live transaction.

Playwright tests are organized under `tests/design-system/` and
`tests/widgets/<widget-name>/`. Curated screenshot evidence lives in the corresponding
nested `test-results/` directories. Root `/test-results/` contains ignored temporary
traces, videos and attachments. Preserve the existing artifact locations.

## How to test

1. Read the bounty, linked PR and original requirements and design references. Identify
   the required flows, states, environments and expected results. Check the PR's existing
   tests and screenshots for coverage and gaps.
2. A human tester should use the widget and explore the experience, including navigation,
   changing inputs and recovery from errors, as well as the specified cases. Inspect
   visible copy, controls, loading and error states, console/runtime errors, and mobile
   and desktop layouts where relevant. Note unexpected or confusing behavior even when
   it is outside the checklist.
3. Compare the implementation with the linked design references and written requirements
   where applicable. Capture material differences in layout, hierarchy, copy or interaction
   with screenshots and the relevant reference. Identify uncertainty or possible inherited
   issues without assuming who must fix them.
4. Run the bounty's required live tests in the specified environment. If a live transaction
   is required, obtain the agreed test funds and route from the team before starting; do
   not assume a fixture, screenshot or developer's proof replaces your own live test.
   The bounty determines whether live transactions are required. Never share private keys
   or seed phrases in reports.
5. Automated checks, screenshots and agent-assisted exploration can support QA, but do
   not establish what a human experienced or prove live behavior by themselves. Record
   who or what performed each check, and distinguish mocked, simulated and live results.

## Report and retest

Post the report on the relevant PR, and link it from the QA bounty issue. Follow any
additional submission instructions in the bounty and the
[GoodBounties QA template](https://github.com/GoodDollar/.github/blob/master/.github/ISSUE_TEMPLATE/GoodBounties-QA-Template.md).
Include:

- PR and bounty links, tester and date; exact tested commit SHA or preview build, plus
  browser/version, OS, viewport, wallet, networks and fixture or live environment as
  applicable. Identify human, automated and agent-assisted checks.
- Every required scenario and its expected and actual result, evidence and status:
  **Pass** (observed as expected), **Fail** (observed contrary to expectation),
  **Blocked** (could not complete because of a stated obstacle), or **Not run**
  (not attempted). Explain blockers and omissions; never mark an unobserved result Pass.
- Reproducible findings with steps, expected versus actual behavior and screenshots,
  recordings, logs or transaction/explorer links as appropriate. Link existing issues
  instead of duplicating known findings. Include the reference and implementation images
  for visual differences, and note whether the cause or scope is uncertain. See the
  [bug-report guidance](https://docs.gooddollar.org/for-developers/contributing/open-source1-contributors/qa-role#filing-a-bug-report).
- A concise overall Ready/Hold assessment for the tested scope, unresolved findings and
  coverage gaps. Finding bugs does not by itself mean the QA work is incomplete.

After fixes, retest affected cases and relevant regressions on the new exact commit or
build. Add the date, version, result and evidence to the report; retain the original
results and identify anything still blocked or not run. The QA tester reports findings
and coverage; the maintainer decides scope, accepts any gaps and determines PR acceptance,
merge and deployment. QA does not itself authorize those actions.
