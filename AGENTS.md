# GoodWidget agent instructions

Before exploring code, running commands, or preparing changes, read the [GoodDollar contribution guidelines](https://github.com/GoodDollar/.github/blob/master/CONTRIBUTING.md) in full. Then read [README.md](README.md) for the repository overview and instructions. Follow the relevant issue and scoped repository instructions. If a required reference is unavailable, stop and report it.

## Building widgets

- Read [ARCHITECTURE.md](ARCHITECTURE.md) and [the widget author instructions](docs/widget-author-instructions.md) before building a widget. Use the [theming contract](docs/architecture/theming-contract.md) for changes to tokens, themes, primitives, or override behavior.
- Put each new widget and its widget-specific components in its own `packages/` package. Add components to `packages/ui` only when they are reusable across widgets. Keep provider/runtime logic in `packages/core` and the web-component bridge in `packages/embed`.
- Use existing design-system primitives first. Use tokens for static values and themes for semantic values. Keep Tamagui configuration in `packages/ui`; derive themes from the effective tokens before creating the configuration. Do not put base tokens or themes in `packages/core`, deep-merge created Tamagui objects as the main override model, or bypass the provider-first runtime.
- Treat public component names and theme targets as API. Ask before adding public theme targets, changing override precedence, moving logic across package boundaries, or adding wallet/provider abstractions or dependencies.
- Render `<WidgetVersion name="..." version={version} />` from `@goodwidget/ui` in every widget. Document significant changes, modularize large components and hooks where useful, and preserve existing comments when refactoring unless asked otherwise.

## Widget stories and tests

- For new widgets, components, and UI changes, add Storybook examples and Playwright smoke tests in widget-specific folders. Cover main flows and states, including empty and error states. Use the custodial and non-custodial fixtures in `examples/storybook/src/fixtures/` where applicable.
- Use `pnpm test:storybook` for story interaction tests and `pnpm test:demo` for Playwright. See [demo environment](docs/demo-environment.md) and the [QA guide](docs/qa-guide.md) for setup, fixtures, and evidence.
- Capture relevant UI states with Playwright `page.screenshot()` calls, name screenshots by flow and state, and keep the evidence current. Curated widget screenshots belong in `tests/widgets/<widget-name>/test-results/`; transient Playwright artifacts belong in the root `/test-results/`. Preserve the anchored root ignore rule and nested tracked evidence.

## Planning a widget issue

When asked to create or refine a widget plan, follow the **Create the plan** section of the [spec template](.github/ISSUE_TEMPLATE/goodwidget-spec-template.yml). Ask for missing details. Create the plan as a new `[DRAFT][PLAN]` Task sub-issue without changing the parent; request review rather than implementing it. Only an assigned `[PLAN]` issue without `[DRAFT]` may be executed. If an assigned issue is marked `[DRAFT]`, ask for clarification before changing code.

For widget PRs, mirror the issue acceptance criteria in a checklist. For packaging and distribution, see [docs/PACKAGING.md](docs/PACKAGING.md).
