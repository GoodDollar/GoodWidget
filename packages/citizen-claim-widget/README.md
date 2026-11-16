# Citizen Claim Widget

Migration target for turning `@goodsdks/citizen-sdk` claim and identity capabilities into
a real GoodWidget package.

This package currently contains only the migration piping:

- selected SDK capabilities for the citizen claim widget
- adapter state/action contracts
- host-facing props/events expected by the future widget

The existing `@goodwidget/claim-widget` package remains the theme/demo widget and should
not be changed for this migration.

For an embedding shell that supplies its own header, pass `hideHeader={true}` to hide the
GoodDollar heading and network badge. The widget tabs and claim flow remain available.
The default is `false`; custom elements also accept the `hideHeader` JavaScript property.

Run the scoped header regression tests from the repository root with
`pnpm exec playwright test --config packages/ai-credits-widget/tests/playwright.config.ts`.
