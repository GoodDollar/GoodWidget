# Demo Environment

This document describes the GoodWidget demo and documentation environment — a
Storybook-first setup in `examples/storybook/` that serves as the canonical review
environment for GoodWidget UI primitives and widget flows.

For the reviewer workflow, fixture meanings, and a short reporting template, see
[`docs/qa-guide.md`](qa-guide.md).

---

## Quick start

```sh
# 1. Install all monorepo dependencies
pnpm install

# 2. Build all packages (so Storybook can import them)
pnpm build

# 3. Start Storybook
pnpm storybook
```

Storybook starts at **http://localhost:6006**.

---

## Running in a Copilot cloud agent

After the `copilot-setup-steps.yml` bootstrap runs (install + build + Playwright install):

```sh
# Start Storybook in the background
pnpm storybook &

# Wait for Storybook to finish bundling, then run tests
sleep 10
pnpm test:storybook
```

Or navigate directly with Playwright MCP:

```
http://localhost:6006/?path=/story/primitives-card--default
http://localhost:6006/?path=/story/widgets-claimwidget--default
http://localhost:6006/?path=/story/theme-themeplayground--default-preset
```

---

## Story map

| Story | What it shows |
|-------|--------------|
| `Primitives/Card` | Card primitive — Default, WithAction, InlineStyled |
| `Primitives/GlowCard` | GlowCard with animated glow border |
| `Primitives/Drawer` | Drawer with interaction test (play function) |
| `Primitives/TokenAmount` | Token amount display with args/controls |
| `Widgets/ClaimWidget` | ClaimWidget: Default, CobaltBrand, TealBrand |
| `Theme/ThemePlayground` | Override layer exploration: DefaultPreset, TokenOverride, ComponentThemeOverride, HostOverrideCobalt, HostOverrideTeal |

Story files live in `examples/storybook/src/stories/`.

---

## Running interaction + play function tests

```sh
# Requires Storybook to be running first
pnpm storybook &
pnpm test:storybook
```

The `@storybook/test-runner` runs all stories including any `play` functions
(see `Drawer.stories.tsx` for an example).

---

## Running Playwright screenshot/trace tests

```sh
# Start Storybook first (or let Playwright start it automatically)
pnpm storybook &

# Run Playwright smoke tests
pnpm test:demo
```

Test artifacts are split as follows:

- `test-results/` (gitignored): Playwright traces, videos, and runner attachments.
- `tests/design-system/test-results/`: design-system smoke screenshots.
- `tests/widgets/<widget-name>/test-results/`: widget screenshot evidence and debug screenshots.

To inspect a trace after a failure:

```sh
npx playwright show-trace test-results/<test-name>/trace.zip
```

---

## `data-testid` naming convention

```
ComponentName-variant   →  e.g. Card-default, GlowCard-default, ClaimWidget-cobalt
```

Rules:

- `ComponentName` matches the exported React component name exactly.
- `variant` describes the visual state or override being demonstrated.

---

## Mock EIP-1193 provider

Wallet-aware stories (ClaimWidget, ThemePlayground) use a lightweight mock provider
defined in:

```
examples/storybook/src/fixtures/mockEip1193.ts
```

The mock always reports:

| Property | Value |
|----------|-------|
| Address | `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` |
| Chain ID | `42220` (Celo mainnet) |

The mock is passed as the `provider` prop to `ClaimWidget`.  
**Determinism:** hardcoded values make Playwright screenshots repeatable.

---

## Adding a new primitive story

1. Confirm the component lives in `packages/ui/src/components/`.
2. Create `examples/storybook/src/stories/MyComponent.stories.tsx`.
3. Set `title: 'Primitives/MyComponent'` in the meta.
4. Add `tags: ['autodocs']` for automatic docs generation.
5. Add a `data-testid="MyComponent-default"` to the primary rendered element.
6. Add a smoke test case in `tests/design-system/smoke.spec.ts`.

Example skeleton:

```tsx
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { MyComponent } from '@goodwidget/ui'

const meta: Meta<typeof MyComponent> = {
  title: 'Primitives/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<typeof MyComponent>

export const Default: Story = {
  render: () => <MyComponent data-testid="MyComponent-default" />,
}
```

---

## Adding a new widget story

1. Create `examples/storybook/src/stories/MyWidget.stories.tsx`.
2. Set `title: 'Widgets/MyWidget'` in the meta.
3. Import `createMockEip1193Provider` from `../fixtures/mockEip1193` if wallet context is needed.
4. Pass the mock provider to your widget.
5. Add a widget test under `tests/widgets/<widget-name>/` (and update `tests/design-system/smoke.spec.ts` only if shared design-system coverage also changed).

---

## Writing args/controls

Use `argTypes` in the meta to expose knobs in the Controls panel:

```tsx
argTypes: {
  amount: { control: 'text', description: 'Token amount to display' },
  size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
}
```

Then use `args` in individual stories and a `render` function to consume them.

---

## Adding theme override examples

Theme override stories belong in `ThemePlayground.stories.tsx`. Add a new named
export following the existing pattern — one `ClaimWidget` per story with
`themeOverrides` or `config` props.

See `docs/` and `ARCHITECTURE.md` for the full override precedence model:

1. `packages/ui` base preset
2. Widget package defaults (`config` prop)
3. Host/integrator overrides (`themeOverrides` prop)
4. One-off local styling (inline props)

---

## Adding interaction tests (play functions)

Add a `play` function to any story to run interaction tests via `@storybook/test`:

```tsx
import { expect, within, userEvent } from '@storybook/test'

export const WithInteraction: Story = {
  render: () => <MyComponent />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /submit/i }))
    await expect(canvas.getByText('Success')).toBeVisible()
  },
}
```

Run all play functions with `pnpm test:storybook`.

---

## Architecture notes

The Storybook package (`examples/storybook`) deliberately does **not** change
`packages/ui`, `packages/core`, `packages/claim-widget`, or `packages/embed`.
It is a consumer of those packages, not a contributor to their design system.

See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full GoodWidget architecture.
