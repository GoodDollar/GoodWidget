# GoodWidget Contributor Bounty Guidance

For an assigned task preparing a contributor bounty around an existing AI-generated PR,
open the current [organization contributor bounty template](https://github.com/GoodDollar/.github/blob/master/.github/ISSUE_TEMPLATE/contributor-bounty-template.md).
Use the published template rather than copying an older local version. Proposed changes
in an organization PR are not published requirements; report any conflict before use.
Follow the [central contribution guide](https://github.com/GoodDollar/.github/blob/master/CONTRIBUTING.md)
and [AGENTS.md](../AGENTS.md) for approval, scope and review rules.

Add the GoodWidget-specific context:

- Link the PR, original issue and approved plan when one exists; identify the branch/build.
- Define the concrete implementation gaps, expected flows and acceptance criteria.
- Include relevant commands from [AGENTS.md](../AGENTS.md#verification-and-evidence),
  including `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm lint` and
  `pnpm test:demo tests/widgets/<widget-folder>` for widget implementation work.
- Require current Storybook/Playwright coverage and screenshots for affected UI, plus
  the human or live checks specified by the task. See the [QA guide](qa-guide.md).
- Request a handoff identifying the contributor, PR and tested commit, fixes, actual
  verification results, evidence and remaining risks. Explain commands not run.

Keep common roles and submission structure in the central template; maintain only these
repository-specific references here. A bounty template does not authorize starting work.
