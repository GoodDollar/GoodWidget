# Demo Environment

This document describes the GoodWidget demo lab (`examples/react-web`) — a
route-based Vite + React + RN-web SPA that serves as the canonical review
environment for all GoodWidget UI components and widget flows.

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
| `/components/:name` | Per-primitive demo page (see table below) |
| `/widget/claim` | ClaimWidget full-flow demo with three override examples |
| `/theme-overrides` | Original OverrideShowcase with all 5 tabs |

### Component routes

| Route | Component | Mock wallet? |
|-------|-----------|:------------:|
| `/components/button` | Button | |
| `/components/input` | Input | |
| `/components/alert` | Alert | |
| `/components/badge` | Badge | |
| `/components/spinner` | Spinner | |
| `/components/select` | Select | |
| `/components/checkbox` | Checkbox | |
| `/components/switch` | Switch | |
| `/components/separator` | Separator | |
| `/components/card` | Card | |
| `/components/glowcard` | GlowCard | |
| `/components/heading` | Heading | |
| `/components/text` | Text | |
| `/components/walletinfo` | WalletInfo | ✅ |
| `/components/tokenamount` | TokenAmount | |
| `/components/addressdisplay` | AddressDisplay | ✅ |
| `/components/chainbadge` | ChainBadge | ✅ |
| `/components/toast` | Toast | |
| `/components/actionsheet` | ActionSheet | |
| `/components/drawer` | Drawer | |

---

## `data-testid` naming convention

```
ComponentName-variant   →  e.g. Button-primary, Alert-error, WalletInfo-connected
tab-<key>               →  e.g. tab-default, tab-tokens  (theme override tabs)
nav-<Name>              →  e.g. nav-Button, nav-ClaimWidget  (index nav links)
```

Rules:

- `ComponentName` matches the exported React component name exactly.
- `variant` describes the visual state being demonstrated.
- Tab selectors use `tab-` prefix to avoid collision with component testids.
- Navigation selectors use `nav-` prefix for the same reason.

---

## wagmi mock connector

Wallet-aware components (`WalletInfo`, `AddressDisplay`, `ChainBadge`,
`ClaimWidget`) need a connected wallet state to be useful in a demo.

Rather than requiring a real browser wallet, those pages use a lightweight mock
EIP-1193 provider defined in:

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

**Scope:** the mock is instantiated once per page file and passed to a route-local
`GoodWidgetProvider`.  It does not affect other routes.

**Determinism:** because the address and chain ID are hardcoded, Playwright
screenshots of wallet-aware pages are repeatable across runs.

---

## Which routes use the wagmi mock and why

| Route | Reason |
|-------|--------|
| `/components/walletinfo` | WalletInfo shows address + chain — meaningless without a connected wallet |
| `/components/addressdisplay` | AddressDisplay formats an Ethereum address — needs a real-looking address |
| `/components/chainbadge` | ChainBadge maps chain ID to a label — the mock supplies the chain ID |
| `/widget/claim` | ClaimWidget's UX is primarily about claiming — renders correctly only when connected |

Pages without a mock (Button, Input, Alert, etc.) have no wallet dependency and
work fine with no provider context.

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
http://localhost:3000/components/button → Button demo
http://localhost:3000/widget/claim      → ClaimWidget demo
http://localhost:3000/theme-overrides   → OverrideShowcase
```

---

## Adding a new component demo page

1. Create `examples/react-web/src/pages/components/MyComponentPage.tsx`.
2. Export a single component named `MyComponentPage`.
3. Add a `data-testid="MyComponent-default"` to the primary rendered element.
4. Register it in `App.tsx` → `COMPONENT_PAGES` map.
5. Add a nav link in `IndexPage.tsx` → `COMPONENT_ROUTES`.
6. Add a smoke test case in `tests/demo/smoke.spec.ts`.

---

## Architecture notes

The demo app deliberately does **not** change `packages/ui`, `packages/core`,
`packages/claim-widget`, or `packages/embed`.  It is a consumer of those
packages, not a contributor to their design system.

See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full GoodWidget architecture.
