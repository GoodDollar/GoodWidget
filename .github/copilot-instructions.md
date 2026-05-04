## Bounty authoring rule

When asked to create or refine a GoodBounty issue:

- Follow `AGENTS.md` for bounty-spec behavior and document routing.
- Use `ARCHITECTURE.md` for package/runtime boundaries.
- Use `docs/demo-environment.md` for Storybook and Playwright verification expectations.
- Read `docs/architecture/theming-contract.md` only if the spec requires changes to Tamagui config, tokens, themes, presets, primitives, component names, public override targets, or theming behavior.

- Use `.github/ISSUE_TEMPLATE/agent-ready-bounty.yml` as the required structure for bounty specification.
  - Produce a complete issue body.
  - Identify missing references, assumptions, SDK/version gaps, and verification requirements.
  - Stop after the bounty specification is drafted.
  - Do not implement, branch, assign yourself, or open a PR unless explicitly asked in a separate follow-up after human approval.
