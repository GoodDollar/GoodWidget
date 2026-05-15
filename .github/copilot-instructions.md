## Working with GoodWidget (General)

Repository overview:

- Follow `AGENTS.md` for bounty-spec behavior and document routing.
- Use `ARCHITECTURE.md` for package/runtime boundaries.
- Use `docs/demo-environment.md` for Storybook and Playwright verification expectations.
- Read `docs/architecture/theming-contract.md` only if the spec requires changes to Tamagui config, tokens, themes, presets, primitives, component names, public override targets, or theming behavior.

## How to work in the repository

- New widgets should always have their own package under `packages/` with a clear name and description.
- Follow the existing package structure and conventions for new widget packages.
- For new widgets, new components and UI changes, always include Storybook examples and Playwright smoke tests. organized by widget specific folders.
- For any new component or significant change, include clear comments and documentation.
- Always verify when to modularize large components/hooks and avoid single line helpers.
- Any new widget related components should be added to the widget's own package and not to `packages/ui` unless they are general purpose and reusable across multiple widgets.

## How to work with storybook and playwright

- storybook examples should demonstrate the expected behavior and states of the widget.
  it should include both custodial and non-custodial flows and use the appropriate fixtures for each case.
  fixtures to use: `examples/storybook/fixtures/custodialEip1193.ts` and `examples/storybook/fixtures/injectedEip1193.ts`.
- stories should be organized per widget. For base components from packages/ui it should be part of the 'theme' folder, demonstrating the usage of the component with the theming system.
- Playwright smoke tests should cover the main flows and states of the widget, including error and empty states. They should be organized in the same way as the storybook examples, with separate test files for each widget and for the base components in `packages/ui`.
- Playwright smoke tests should always include page.screenshot() calls to capture the different UI states and flows, and these screenshots should be included in the pull-request description and should always sync with the latest screenshots taken.
- Playwright screenshots should be organized as part of the smoke-test per widget directory, and should be named according to the flow and state they represent for easy reference.

## Define a GoodBounty issue spec

When asked to create or refine a GoodBounty issue make sure to follow the structure from the bounty spec template: `.github/ISSUE_TEMPLATE/bounty-spec-template.yml` and include all the sections and details described there. Always ask for clarification if any of the sections cannot be filled with the available information or if you are not sure about any of the details.
Be as concise as possible while still providing all the necessary information for the implementation and validation of the issue. The more clear and easy to understand the spec is, the easier it will be for the implementer to understand the requirements and for the reviewer to validate the implementation.
