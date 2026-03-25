# GoodWidget Architecture

This document is the authoritative reference for agents and developers working on GoodWidget.
It covers the project purpose, design decisions, package structure, data flow, and conventions.

---

## Purpose

GoodWidget is a framework for building **mini apps** (small web3 widgets) that run inside
wallets and dapps. Think Farcaster mini apps, MiniPay apps, or Worldcoin mini apps, but
cross-platform. A mini app built with GoodWidget can render as:

- A **React web** application
- A **React Native** application (via react-native-web compatibility)
- A **Web Component** (`<good-miniapp>` custom element) embeddable in any HTML page

The framework provides an EIP-1193 wallet adapter, a fully themeable component library,
and a host-override system so that anyone embedding a third-party mini app can restyle it
without touching the source.

---

## Monorepo Layout

```
GoodWidget/
  package.json              # Root workspace (pnpm + Turborepo)
  pnpm-workspace.yaml       # Declares packages/* and examples/* as workspaces
  turbo.json                # Build task graph (build depends on ^build)
  tsconfig.base.json        # Shared TS config extended by all packages

  packages/
    core/                   # @goodwidget/core  — provider, hooks, EIP-1193, host detection
    ui/                     # @goodwidget/ui    — Tamagui component library, theme system
    embed/                  # @goodwidget/embed — Web Component wrapper + CSS bridge
    claim-widget/           # @goodwidget/claim-widget — sample publishable widget (React + Web Component)

  examples/
    react-web/              # Vite + React demo showing all override levels
    html/                   # Plain HTML page consuming a widget as a Web Component
    expo/                   # Expo (React Native) app (standalone, not in workspace)

  templates/
    mini-app/               # Scaffolding template for new mini apps

  docs/
    PACKAGING.md            # Guide: package your widget for React, RN, and HTML
```

### Dependency graph

```
@goodwidget/ui          (no internal deps — leaf package)
      ^
      |
@goodwidget/core        (depends on @goodwidget/ui for createGoodWidgetConfig, mergeThemeOverrides)
      ^
      |
@goodwidget/embed       (depends on core + ui, plus @r2wc/react-to-web-component)
```

**Important:** `@goodwidget/ui` must NOT depend on `@goodwidget/core` (would create a cycle).
Any shared types between them live in `ui/src/configTypes.ts` and are re-exported by both.

---

## Package: `@goodwidget/core`

**NPM name:** `@goodwidget/core`
**Entry points:** `index.ts`, `wagmi.ts` (secondary export `@goodwidget/core/wagmi`)
**Build:** tsup -> ESM + CJS + `.d.ts`

### Key files

| File | Responsibility |
|------|----------------|
| `src/eip1193.ts` | `EIP1193Provider` interface, `RequestArguments`, event map, error codes |
| `src/types.ts` | `HostEnvironment`, `HostCapabilities`, `GoodWidgetProviderProps`, `GoodWidgetConfig`, `GoodWidgetThemeOverrides` |
| `src/detect.ts` | `detectHost()` — auto-detects Farcaster / World App / MiniPay / injected and returns a resolved EIP-1193 provider |
| `src/provider.tsx` | `GoodWidgetProvider` — the root component. Wraps `TamaguiProvider`, provides wallet context, performs the 3-layer theme merge |
| `src/hooks.ts` | `useWallet()`, `useHost()`, `useGoodWidget()` |
| `src/wagmi.ts` | `goodWidgetConnector()` — a wagmi-compatible connector descriptor |

### Host detection priority

1. Explicit `provider` prop (highest — type becomes `'custom'`)
2. Farcaster: `window.farcaster?.sdk?.wallet` -> `getEthereumProvider()`
3. World App: `window.MiniKit?.isInWorldApp()` -> `window.ethereum`
4. MiniPay: `window.ethereum?.isMiniPay` -> `window.ethereum`
5. Generic injected: `window.ethereum`

### Theme merge chain

`GoodWidgetProvider` accepts three theme-related props and merges them in this order
(each layer wins over the previous):

```
Layer 1: GoodWidget defaults          (built-in tokens + light/dark themes)
Layer 2: config prop                   (mini app author's createGoodWidgetConfig overrides)
Layer 3: themeOverrides prop           (host's overrides — always wins)
```

The merge happens in `provider.tsx` via:

```ts
const finalConfig = mergeThemeOverrides(authorConfig, themeOverrides)
const tamaguiConfig = createGoodWidgetConfig(finalConfig)
```

Both `mergeThemeOverrides` and `createGoodWidgetConfig` live in `@goodwidget/ui` and do
recursive deep-merge of tokens and theme objects.

---

## Package: `@goodwidget/ui`

**NPM name:** `@goodwidget/ui`
**Build:** tsup -> ESM + CJS + `.d.ts`

### Key files

| File | Responsibility |
|------|----------------|
| `src/configTypes.ts` | `GoodWidgetConfig`, `GoodWidgetThemeOverrides` interfaces (shared with core) |
| `src/theme.ts` | `tokens` (createTokens), `lightTheme`, `darkTheme`, component themes (`light_Button`, `light_Card`, `light_Input` + dark variants) |
| `src/config.ts` | `createGoodWidgetConfig()`, `mergeThemeOverrides()`, `defaultConfig` |
| `src/createComponent.ts` | `createComponent()` — wraps Tamagui `styled()`, enforces `name`, auto-registers in manifest |
| `src/manifest.ts` | Runtime component registry, `getThemeManifest()`, `registerComponent()` |
| `src/components/` | One file per component |

### Theme architecture

Tamagui themes are the foundation. Every style value in a component references a **theme key**
(e.g. `$background`, `$borderColor`). Tamagui resolves these from the nearest `<Theme>` ancestor,
walking: component theme segment -> parent theme -> tokens.

**Component theme segments** are the key mechanism for host overrides. When a component is created
with `name: 'Card'`, Tamagui looks for themes named `light_Card`, `dark_Card`, etc. Hosts can
inject overrides into these segments via `themeOverrides: { themes: { light_Card: { ... } } }`.

### `createComponent()` design decision

We wrap `styled()` to **require** a `name` prop. Without a name, Tamagui cannot create
component-level theme segments, making the component un-targetable by hosts. The wrapper
also auto-registers the component in a runtime `Map<string, ComponentManifestEntry>` for
discoverability via `getThemeManifest()`.

The function returns `any` because Tamagui's `styled()` encodes variant information via deep
conditional generics that cannot be preserved through a generic wrapper function. The trade-off:
consumers don't get false "property does not exist" type errors for variant props, but lose
autocomplete on custom variants. Components with complex prop interfaces (Button, Input) define
explicit `interface ButtonProps` / `interface InputProps` types for better DX.

### Component inventory

**Layout:** Container, Card, XStack/YStack/ZStack (re-export), Separator, ScrollArea
**Typography:** Heading (level 1-6), Text (body/caption/label/large variants)
**Inputs:** Button + ButtonText, Input + InputLabel + InputError, Select, Checkbox, Switch
**Feedback:** Spinner, Toast, Alert, Badge + BadgeText
**Web3:** AddressDisplay, TokenAmount, TransactionButton, ChainBadge, WalletInfo
**Composites:** MiniAppShell, ActionSheet, TokenInput

### Token reference

Default primary color: `#00AEFF` (GoodDollar blue).
Token categories: `color` (28 values), `size` (0-14 + true), `space` (0-10 + true),
`radius` (0-6 + true), `zIndex` (0-5).

---

## Package: `@goodwidget/embed`

**NPM name:** `@goodwidget/embed`
**Build:** tsup -> ESM + CJS + `.d.ts`

### Key files

| File | Responsibility |
|------|----------------|
| `src/createMiniAppElement.tsx` | `createMiniAppElement()` — Web Component factory. Returns an `HTMLElement` subclass |
| `src/shadowStyles.ts` | `injectStylesIntoShadow()`, `getResetCSS()` — inject Tamagui CSS into Shadow DOM |
| `src/cssPropertyBridge.ts` | `readCSSOverrides()`, `observeCSSChanges()` — read `--gw-*` CSS custom properties from host, convert to `GoodWidgetThemeOverrides` |
| `src/bridge.ts` | `normalizePropDefs()`, `toKebabCase()`, `toCamelCase()`, `emitEvent()` |

### How the Web Component works

1. `connectedCallback()` creates a Shadow DOM, injects reset CSS, creates a React root
2. Reads CSS custom properties from the host element via `readCSSOverrides()`
3. Sets up a MutationObserver to re-read CSS vars when `style` or `class` changes
4. Renders `<GoodWidgetProvider>` inside the shadow root with merged overrides
5. Public setters (`provider`, `themeOverrides`, `config`) trigger re-render

### CSS custom property naming convention

- Global tokens: `--gw-{category}-{tokenName}` (e.g. `--gw-color-primary`)
- Component themes: `--gw-{ComponentName}-{themeKey}` (e.g. `--gw-Card-background`, `--gw-GlassCard-borderColor`)

CSS custom properties cascade into Shadow DOM (one of few things that cross the boundary),
making them the most powerful zero-JS override mechanism for web hosts.

### Theme manifest

Every Web Component class exposes `static themeManifest` so hosts can discover what is
overridable at runtime:

```js
document.querySelector('good-miniapp').constructor.themeManifest
// => { components: { Card: { themeKeys: [...], variants: [...] }, ... }, tokens: { ... } }
```

---

## Override Precedence (full stack, lowest to highest)

```
1. GoodWidget framework defaults (theme.ts)
2. Mini app author's createGoodWidgetConfig() (config prop)
3. Mini app author's styled()/createComponent() inline defaults
4. Host's themeOverrides (JS prop on provider or Web Component)
5. Host's CSS custom properties (--gw-*, web only, cascades into Shadow DOM)
6. Inline style props on individual JSX elements (only if host owns the JSX)
```

For the embed path (Web Component), layers 4 and 5 are read and merged inside the
custom element before being passed to `GoodWidgetProvider`.

---

## Build System

| Package | Tool | Output |
|---------|------|--------|
| `@goodwidget/core` | tsup | ESM + CJS + `.d.ts` (two entry points: index, wagmi) |
| `@goodwidget/ui` | tsup | ESM + CJS + `.d.ts` |
| `@goodwidget/embed` | tsup | ESM + CJS + `.d.ts` |
| `@goodwidget/claim-widget` | tsup | ESM + CJS + `.d.ts` (three entry points: index, element, register) |
| `examples/react-web` | Vite + @vitejs/plugin-react | Static site |
| `examples/html` | Vite | Static site (bundles widget + React into a single JS file) |

**Platform aliasing:** On web builds, `react-native` is aliased to `react-native-web`
(configured in `vite.config.ts` for apps, and via `tsconfig.json` `paths` for packages).
For native builds, no alias is needed — Tamagui handles `.native.ts` file extensions.

**Turborepo tasks:** `build` depends on `^build` (packages build before dependents).
`dev`, `clean` are not cached.

**External dependencies in tsup:** React, react-dom, react-native, react-native-web,
tamagui, @tamagui/core, wagmi, viem are all marked external — they are peer deps the
consumer provides.

---

## Conventions

### Creating new components

Always use `createComponent()` from `@goodwidget/ui`, never bare `styled()`:

```ts
import { createComponent } from '../createComponent'
import { YStack } from 'tamagui'

export const MyWidget = createComponent(YStack, {
  name: 'MyWidget',               // REQUIRED — enables theme targeting
  extends: 'Card',                // optional — for manifest lineage
  backgroundColor: '$background',  // use theme keys, not raw colors
  variants: { ... } as const,
})
```

### File naming

- Components: `PascalCase.ts` or `PascalCase.tsx` (use `.tsx` only if the file contains JSX)
- Non-component modules: `camelCase.ts`
- One component per file in `packages/ui/src/components/`

### Style values

- Always reference Tamagui theme keys (`$background`, `$color`, `$borderColor`) rather than
  hardcoded colors in component definitions. This is what makes the theme override chain work.
- Use token references (`$3`, `$4`) for spacing and sizing, not raw numbers.

### Avoiding circular deps

`@goodwidget/ui` is the leaf. `@goodwidget/core` depends on it. Never add core as a dep of ui.
Shared types live in `ui/src/configTypes.ts`. The `TransactionButton` component in ui defines
its own minimal `EIP1193Provider` interface rather than importing from core.

### Exports

Every package has a barrel `src/index.ts`. All public API must be re-exported from there.
Types used by other packages should be explicitly exported with `export type`.

---

## Data Flow

```
Host wallet/dapp
  |
  |-- sets .provider (EIP-1193)
  |-- sets .themeOverrides or CSS custom properties
  |
  v
[Web Component shell]  (packages/embed)
  |
  |-- readCSSOverrides() reads --gw-* vars
  |-- deepMergeOverrides(themeOverrides, cssOverrides)
  |
  v
[GoodWidgetProvider]  (packages/core)
  |
  |-- detectHost() resolves wallet provider
  |-- mergeThemeOverrides(authorConfig, hostOverrides)
  |-- createGoodWidgetConfig(merged) -> createTamagui(...)
  |
  v
[TamaguiProvider]  (with merged config)
  |
  v
[UI Components]  (packages/ui)
  |
  |-- useWallet() for address, chainId, connect
  |-- useHost() for host environment, capabilities
  |-- provider.request() for EIP-1193 calls
  |
  v
Blockchain
```

---

## Packaging Widgets for Distribution

See `docs/PACKAGING.md` for the full guide. In summary, a publishable widget has three entry
points:

| Entry | Purpose |
|-------|---------|
| `index.ts` | React component + types (used by React and RN consumers) |
| `element.ts` | Web Component class (for hosts that register it themselves) |
| `register.ts` | Side-effect import that auto-registers the custom element |

See `packages/claim-widget/` for a complete working example.

---

## Known Limitations and Future Work

- **No SSR support yet.** Tamagui CSS injection and Shadow DOM setup are client-only.
- **React Native target is via react-native-web aliasing only.** A true RN build with
  Metro/Expo would need `.native.ts` file variants for components that diverge.
- **`createComponent()` returns `any`.** Tamagui's `styled()` generics encode variant types
  via deep conditional types that can't survive a wrapper function. Explicit prop interfaces
  (see `ButtonProps`, `InputProps`) are the workaround for components with complex APIs.
- **Theme manifest is runtime-only.** A build-time extraction step (e.g. Vite plugin) could
  generate a static JSON manifest for better DX.
- **wagmi connector is a descriptor, not a full createConnector() wrapper.** Consumers need
  to adapt it with wagmi's `createConnector()` for full integration.
- **No Tamagui compiler optimization.** The `@tamagui/vite-plugin` is not yet wired into
  the tsup builds. Adding it would extract static styles to CSS at build time.
- **Peer dependency warnings.** Tamagui pulls in `react-native` 0.84 which expects React 19;
  we use React 18. These are harmless for web-only usage but should be resolved for RN builds.
