# Demo Environment

This document describes the GoodWidget demo and documentation environment — a
Storybook-first setup in `examples/storybook/` that serves as the canonical review
environment for GoodWidget UI primitives, widget flows, and integrator-facing live docs.

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

## Deploying Storybook to Vercel

The repository includes a root-level `vercel.json` and GitHub Actions workflow for
deploying the Storybook app as a static Vercel site.

Local CLI flow:

```sh
# Preview deployment
pnpm vercel:deploy:preview

# Production deployment
pnpm vercel:deploy:production
```

Notes:

- Vercel must be linked to the repository root so `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`
  resolve correctly.
- The Vercel build runs `pnpm build && pnpm build-storybook` because the Storybook app
  consumes built workspace packages.
- Static output is published from `examples/storybook/storybook-static`.

GitHub Actions workflow:

- Pull requests from branches inside this repository create preview deployments.
- Pushes to `main` or `master` create production deployments.
- Required GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

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
http://localhost:6006/?path=/story/design-system-primitives-card--default
http://localhost:6006/?path=/story/widgets-claimwidget-theme-demo-showcase--default
http://localhost:6006/?path=/story/design-system-theming-override-playground--default-preset
```

## Storybook structure

The sidebar is organized by audience and intent:

- `Start Here`: orientation and contribution rules.
- `Integrators`: embedding and theming guides written in MDX.
- `Design System`: primitives plus theming references.
- `Widgets`: widget showcase stories and widget-specific guides.
- `QA`: deterministic fixtures and automation-focused states.

Story files and MDX docs live in `examples/storybook/src/stories/`.

### MDX docs expectations

MDX pages are the authored documentation layer. They should:

- lead with a clear title, intent, and short explanation before showing stories
- explain what the reader is looking at and why it matters
- include copy-paste integration examples where useful
- reuse CSF stories instead of recreating widget rendering logic in the page

Storybook docs render embedded stories in isolated docs iframes so pages can show
multiple themed widget examples without provider/theme collisions between canvases.

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
3. Set `title: 'Design System/Primitives/MyComponent'` in the meta.
4. Add `tags: ['autodocs', 'showcase']` for automatic docs generation and classification.
5. Add a `data-testid="MyComponent-default"` to the primary rendered element.
6. Add a smoke test case in `tests/design-system/smoke.spec.ts`.

Example skeleton:

```tsx
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { MyComponent } from '@goodwidget/ui'

const meta: Meta<typeof MyComponent> = {
  title: 'Design System/Primitives/MyComponent',
  component: MyComponent,
  tags: ['autodocs', 'showcase'],
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

1. Create a reference story file under `examples/storybook/src/stories/<widget-name>/`.
2. Set a showcase title such as `Widgets/MyWidget/Showcase` in the meta.
3. Import `createMockEip1193Provider` from `../fixtures/mockEip1193` if wallet context is needed.
4. Pass the mock provider to your widget.
5. Create separate `QA/...` stories for fixture-heavy or automation-only states instead of mixing them into the widget showcase.
6. Add a widget test under `tests/widgets/<widget-name>/` (and update `tests/design-system/smoke.spec.ts` only if shared design-system coverage also changed).

## Writing MDX guides

Use MDX pages for narrative docs that reuse existing stories:

- `Start Here/...` for orientation pages
- `Integrators/...` for host integration and theming guidance
- widget-local `*.mdx` files for widget guides attached to showcase stories

Prefer embedding CSF stories with Storybook Doc Blocks instead of recreating example renders inside the MDX page.

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
