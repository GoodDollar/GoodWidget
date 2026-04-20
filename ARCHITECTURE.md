# GoodWidget Architecture

This document is the authoritative reference for the current GoodWidget codebase.
It is aligned to the `basic-tests` branch and the current Tamagui architecture used in
`packages/ui`, `packages/core`, `packages/embed`, and `packages/claim-widget`.

---

## Purpose

GoodWidget is a framework for building cross-platform mini apps that can render as:

- a React web application
- a React Native / Expo application
- a Web Component embeddable in a host page

The framework provides:

- an EIP-1193 wallet integration layer
- a Tamagui-based UI system
- a preset-driven design system with constrained token/theme overrides
- widget-level and host-level theming boundaries

---

## Monorepo Layout

```text
GoodWidget/
  ARCHITECTURE.md
  AGENTS.md
  package.json
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json

  packages/
    core/           # GoodWidgetProvider, hooks, host detection, wallet context
    ui/             # Tamagui tokens, preset, themes, config assembly, manifest, primitives
    embed/          # Web Component wrapper + CSS custom property bridge
    claim-widget/   # Example widget package using core + ui + embed

  examples/
    react-web/      # override and theming demo
    html/           # web component demo
    expo/           # Expo demo app

  agent-next-steps/
    theme-propagation-consistency-task.md
    use-tamagui-primitives.md
```

### Dependency graph

```text
@goodwidget/ui
      ^
      |
@goodwidget/core
      ^
      |
@goodwidget/embed

@goodwidget/claim-widget -> depends on core + ui + embed
```

`@goodwidget/ui` is still the leaf design-system package and must not depend on `@goodwidget/core`.

---

## Design-System Ownership

### `packages/ui` owns

- plain token seed values in [theme.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/theme.ts)
- the GoodWalletV2 preset in [presets.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/presets.ts)
- theme derivation from effective token values
- `createTamagui()` assembly in [config.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/config.ts)
- `createComponent()` and the runtime theme manifest
- exported primitives and composite UI building blocks

### `packages/core` owns

- [GoodWidgetProvider](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/core/src/provider.tsx)
- host/provider detection
- wallet and host React context
- author `config` + host `themeOverrides` plumbing into `TamaguiProvider`

### `packages/embed` owns

- the Web Component shell
- Shadow DOM style setup
- CSS custom property reading and observation
- merging JS `themeOverrides` with CSS-derived overrides before rendering the provider

This separation is important: `packages/core` does not author tokens or themes, and
`packages/ui` does not own runtime host detection.

---

## Current Theming Pipeline

GoodWidget no longer treats the provider as the authoring layer for Tamagui config objects.
The current flow is:

1. Start from plain token seed values in `defaultTokenValues`.
2. Layer preset token overrides on top.
3. Layer author token overrides on top.
4. Layer host token overrides on top.
5. Derive the full semantic theme map from the effective token set.
6. Apply preset, author, and host theme overrides by theme name.
7. Build one Tamagui config from that single effective source.

The implementation lives in:

- [packages/ui/src/theme.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/theme.ts)
- [packages/ui/src/presets.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/presets.ts)
- [packages/ui/src/config.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/config.ts)

### Important correction from older architecture

The system is not doing a deep merge of already-created Tamagui token/theme objects.

Instead:

- token seeds remain plain objects until config creation
- `createThemeValues()` derives semantic themes from the effective token set
- `createGoodWidgetConfig()` calls `createTamagui()` once for that effective config

This is the core architectural guardrail for keeping token overrides and theme derivation aligned.

---

## Override Layers

There are three main override inputs in the runtime pipeline:

1. preset defaults from `packages/ui`
2. author configuration via `config`
3. host overrides via `themeOverrides`

For the Web Component path there is an additional web-only host layer:

4. CSS custom properties read by `packages/embed`

And finally there are local component-instance props:

5. one-off inline style props on JSX usage

### Effective precedence

```text
1. GoodWidget preset defaults
2. Author config (`config`)
3. Host theme overrides (`themeOverrides`)
4. Host CSS custom properties (`--gw-*`, web component path only)
5. Inline instance props
```

`packages/embed` merges JS host overrides with CSS-derived overrides before rendering
`GoodWidgetProvider`, so CSS wins over the host JS prop in that path.

---

## Package: `@goodwidget/ui`

### Key files

| File | Responsibility |
|------|----------------|
| [configTypes.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/configTypes.ts) | Public config, token, theme, preset, typography, animation types |
| [theme.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/theme.ts) | Plain token seeds + `createGoodWidgetTokens()` + `createThemeValues()` |
| [presets.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/presets.ts) | GoodWalletV2 preset tokens and partial theme overrides |
| [config.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/config.ts) | Config resolution, token override merge, theme derivation, `createGoodWidgetConfig()` |
| [createComponent.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/createComponent.ts) | Named styled-component wrapper + manifest registration |
| [manifest.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/manifest.ts) | Runtime manifest for named override targets |
| [index.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/index.ts) | Public exports |

### Theme model

- tokens are static primitives and scales
- themes are semantic/contextual values
- named components opt into `light_Component` / `dark_Component` sub-themes through `name`
- `$foo` resolves theme-first, token-second

Examples:

- `backgroundColor="$background"` means semantic theme usage
- `borderRadius="$3"` means shared token-scale usage
- `light_Card` and `dark_Card` are component sub-themes for the `Card` component

### `createComponent()`

`createComponent()` wraps Tamagui `styled()` and does two things:

1. requires a stable `name`
2. registers the component in the runtime manifest

That `name` is the contract Tamagui uses for component sub-themes and the contract
GoodWidget uses for host-facing manifest discovery.

### Current component layout

The public UI surface is exported from [packages/ui/src/index.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/ui/src/index.ts).

At the moment there are two implementation areas:

- `packages/ui/src/components/`
  - current production-aligned components such as `Card`, `GlowCard`, `Drawer`, `TokenAmount`
- `packages/ui/src/components-test/`
  - many still-exported primitives and composites such as `Button`, `Input`, `Checkbox`, `Switch`, `Select`, `Alert`, `Badge`, `Text`, `MiniAppShell`

This split is real and intentional for the current branch state. The next-step documents
cover how to reduce that transitional surface.

---

## Package: `@goodwidget/core`

### Key files

| File | Responsibility |
|------|----------------|
| [eip1193.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/core/src/eip1193.ts) | EIP-1193 types |
| [detect.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/core/src/detect.ts) | Host/provider detection |
| [types.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/core/src/types.ts) | Provider props and host/wallet state types |
| [provider.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/core/src/provider.tsx) | `GoodWidgetProvider` |
| [hooks.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/core/src/hooks.ts) | `useWallet()`, `useHost()`, `useGoodWidget()` |
| [wagmi.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/core/src/wagmi.ts) | wagmi integration surface |

### Provider flow

`GoodWidgetProvider`:

1. resolves the wallet provider
2. subscribes to account and chain changes
3. merges author `config` with host `themeOverrides`
4. rebuilds the effective Tamagui config through `createGoodWidgetConfig()`
5. renders `TamaguiProvider`

This means per-instance widget theming is a first-class runtime behavior at the provider boundary.

---

## Package: `@goodwidget/embed`

### Key files

| File | Responsibility |
|------|----------------|
| [createMiniAppElement.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/embed/src/createMiniAppElement.tsx) | Web Component factory |
| [cssPropertyBridge.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/embed/src/cssPropertyBridge.ts) | Reads `--gw-*` overrides from the host |
| [shadowStyles.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/embed/src/shadowStyles.ts) | Shadow DOM reset and runtime style syncing |
| [bridge.ts](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/embed/src/bridge.ts) | attribute/prop/event bridging |

### Web Component behavior

The custom element:

1. creates a shadow root
2. injects reset/runtime styles
3. reads CSS custom property overrides from the host element
4. merges those CSS overrides with any JS `themeOverrides`
5. renders `GoodWidgetProvider`

### CSS custom property convention

- token overrides: `--gw-{category}-{tokenName}`
- component theme overrides: `--gw-{ComponentName}-{themeKey}`

Examples:

- `--gw-color-primary`
- `--gw-Card-borderColor`

The manifest exposed on the custom element constructor is generated from the runtime
component registry in `packages/ui`.

---

## Package: `@goodwidget/claim-widget`

`packages/claim-widget` is the example publishable widget package and the best current
reference for how a widget author is expected to use the system.

Key patterns in [ClaimWidget.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/packages/claim-widget/src/ClaimWidget.tsx):

- widget-local named components such as `ClaimCard` and `ClaimActionButton`
- `extends` relationships for manifest lineage
- author-level `config` support
- host-level `themeOverrides` support
- direct use of shared primitives from `@goodwidget/ui`

---

## Current Examples

### React web demo

[examples/react-web/src/App.tsx](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/examples/react-web/src/App.tsx) demonstrates:

- preset baseline rendering
- token overrides
- component theme overrides
- host `themeOverrides`
- local inline overrides

This is the most useful reference for understanding actual current override behavior.

### Expo demo

The Expo example is a real consumer of the current packages and validates the current
Expo 52 / React 18 / React Native 0.76 / Tamagui 1.121 compatibility set.

---

## Conventions

### Creating new themed primitives

Use `createComponent()` when the component owns a theme contract or should be discoverable
as a named override target.

Use plain React composition when the component is mostly orchestration or state.

### Styling rules

- prefer semantic theme keys for reusable visual styling
- use token scale references for spacing, sizing, and radius
- avoid hardcoded colors in shared primitives unless they are deliberate exceptions
- treat component names and sub-theme names as API surface once exposed to hosts

### File placement

- `packages/ui/src/components/` should hold stable production-aligned primitives
- `packages/ui/src/components-test/` currently still contains many exported primitives in transition

That second point is not ideal, but it is the current truth and the docs should reflect it honestly.

---

## Data Flow

```text
Host / wallet / app
  |
  |-- provider
  |-- config
  |-- themeOverrides
  |-- CSS custom properties (web component path)
  |
  v
Web Component shell (optional)
  |
  |-- read CSS overrides
  |-- merge CSS overrides with JS host overrides
  |
  v
GoodWidgetProvider
  |
  |-- detect host/provider
  |-- merge author config with host overrides
  |-- createGoodWidgetConfig()
  |
  v
TamaguiProvider
  |
  v
Named GoodWidget components
  |
  v
Wallet / chain interactions
```

---

## Known Limitations

- Many exported primitives still live under `packages/ui/src/components-test/`.
- `Checkbox`, `Switch`, `Select`, `Input`, `Button`, `Alert`, and several composites still use custom `Stack`-based behavior rather than Tamagui-native primitives.
- The runtime manifest is generated in memory rather than from a build-time extracted artifact.
- `createComponent()` still returns `any` because Tamagui variant generics do not survive the current wrapper cleanly.
- Multi-widget theming is supported through provider boundaries, but broad token overrides are still broad design-system inputs and should not be described as narrowly targeted styling.

---

## Related docs

- [AGENTS.md](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/AGENTS.md)
- [agent-next-steps/theme-propagation-consistency-task.md](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/agent-next-steps/theme-propagation-consistency-task.md)
- [agent-next-steps/use-tamagui-primitives.md](/home/lewisb/active_repos/gd-ecosystem/GoodWidget/agent-next-steps/use-tamagui-primitives.md)
