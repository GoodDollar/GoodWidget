# Demo Environment

This document describes the GoodWidget demo lab (`examples/react-web`) — a
route-based Vite + React + RN-web SPA that serves as the canonical review
environment for verified GoodWidget UI components and widget flows.

> **Component demo scope:** Only components from `packages/ui/src/components/`
> have dedicated demo pages.  Components still in `packages/ui/src/components-test/`
> are not yet promoted and do not appear in the `/components/:name` routes.

---

## Quick start

```sh
# 1. Install all monorepo dependencies
pnpm install

# 2. Build all packages (so examples can import them)
pnpm build

# 3. Start the demo server
pnpm --filter @goodwidget/example-react-web dev
```

The server starts at **http://localhost:3000**.  
Open the index page for a link grid to every available demo route.

---

## Running Playwright smoke tests

Playwright tests live in `tests/demo/smoke.spec.ts` and can be run with:

```sh
# Start the server first (or let Playwright start it automatically)
pnpm --filter @goodwidget/example-react-web dev &

# Run smoke tests (Playwright uses reuseExistingServer: true)
pnpm test:demo
```

Test artifacts (screenshots, traces, optional video) are written to
`test-results/` (gitignored) and an HTML report to `playwright-report/`.

To inspect a trace after a failure:

```sh
npx playwright show-trace test-results/<test-name>/trace.zip
```

---

## Route map

| Route | Description |
|-------|-------------|
| `/` | Index page — link grid to all demo routes |
| `/components/:name` | Per-primitive demo page (verified components only — see table below) |
| `/widget/claim` | ClaimWidget full-flow demo with three override examples |
| `/theme-overrides` | Original OverrideShowcase with all 5 tabs |

### Component routes (verified components only)

Only components from `packages/ui/src/components/` have dedicated demo pages:

| Route | Component |
|-------|-----------|
| `/components/card` | Card |
| `/components/glowcard` | GlowCard |
| `/components/drawer` | Drawer |
| `/components/tokenamount` | TokenAmount |

Components in `packages/ui/src/components-test/` (Button, Input, Alert, Badge, etc.) are
not yet promoted and do not have demo pages at this time.

---

## `data-testid` naming convention

```
ComponentName-variant   →  e.g. Card-default, GlowCard-default, ClaimWidget-default
tab-<key>               →  e.g. tab-default, tab-tokens  (theme override tabs)
nav-<Name>              →  e.g. nav-Card, nav-ClaimWidget  (index nav links)
```

Rules:

- `ComponentName` matches the exported React component name exactly.
- `variant` describes the visual state being demonstrated.
- Tab selectors use `tab-` prefix to avoid collision with component testids.
- Navigation selectors use `nav-` prefix for the same reason.

---

## wagmi mock connector

The `/widget/claim` page uses a lightweight mock EIP-1193 provider defined in:

```
examples/react-web/src/mock/mockEip1193.ts
```

The mock always reports:

| Property | Value |
|----------|-------|
| Address | `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` |
| Chain ID | `42220` (Celo mainnet) |

The mock is passed as the `provider` prop to `GoodWidgetProvider`.  
`detectHost()` in `@goodwidget/core` treats an explicit provider as `host: 'custom'`
and skips browser wallet detection entirely.

**Scope:** scoped to the `/widget/claim` route only.  
**Determinism:** hardcoded values make Playwright screenshots repeatable.

---

## Cloud agent quick-start

After running the `copilot-setup-steps.yml` bootstrap:

```sh
# Start the demo server in the background
pnpm --filter @goodwidget/example-react-web dev &

# Wait a moment for Vite to finish bundling, then run tests
sleep 5
pnpm test:demo
```

Or navigate directly with Playwright MCP:

```
http://localhost:3000/                  → index
http://localhost:3000/components/card   → Card demo
http://localhost:3000/widget/claim      → ClaimWidget demo
http://localhost:3000/theme-overrides   → OverrideShowcase
```

---

## Adding a new component demo page

A component must be in `packages/ui/src/components/` (not `components-test/`)
before adding a demo page for it.

1. Confirm the component lives in `packages/ui/src/components/`.
2. Create `examples/react-web/src/pages/components/MyComponentPage.tsx`.
3. Export a single component named `MyComponentPage`.
4. Add a `data-testid="MyComponent-default"` to the primary rendered element.
5. Register it in `App.tsx` → `COMPONENT_PAGES` map.
6. Add a nav link in `IndexPage.tsx` → `COMPONENT_ROUTES`.
7. Add a smoke test case in `tests/demo/smoke.spec.ts`.

---

## Architecture notes

The demo app deliberately does **not** change `packages/ui`, `packages/core`,
`packages/claim-widget`, or `packages/embed`.  It is a consumer of those
packages, not a contributor to their design system.

See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full GoodWidget architecture.
