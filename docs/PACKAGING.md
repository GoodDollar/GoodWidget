# Packaging Your Widget for Distribution

This guide explains how to build a GoodWidget mini app and publish it as an npm
package that consumers can use in **React (web)**, **React Native**, and
**plain HTML** (Web Component).

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Step 1 — Build your widget as a React component](#step-1--build-your-widget-as-a-react-component)
3. [Step 2 — Add a Web Component entry point](#step-2--add-a-web-component-entry-point)
4. [Step 3 — Configure the build](#step-3--configure-the-build)
5. [Step 4 — Configure package.json exports](#step-4--configure-packagejson-exports)
6. [Step 5 — Build & publish](#step-5--build--publish)
7. [Consumer guides](#consumer-guides)
   - [React (web) consumer](#react-web-consumer)
   - [React Native consumer](#react-native-consumer)
   - [Plain HTML consumer](#plain-html-consumer)
   - [Next.js consumer](#nextjs-consumer)
8. [Theme overridability checklist](#theme-overridability-checklist)
9. [Reference: full example package](#reference-full-example-package)

---

## Project Structure

A publishable GoodWidget package has three entry points:

```
my-widget/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── src/
    ├── index.ts          # React component + types (main entry)
    ├── element.ts         # Web Component class (optional entry)
    └── register.ts        # Auto-registration side effect (optional entry)
    └── MyWidget.tsx       # The actual widget implementation
```

| Entry | Purpose | Who imports it |
|-------|---------|---------------|
| `index.ts` | Exports the React component, types, and the Web Component class | React & React Native consumers |
| `element.ts` | Exports only the Custom Element class | Consumers who want to register it themselves |
| `register.ts` | Side-effect import that calls `customElements.define()` | HTML consumers (`<script>` tag) |

---

## Step 1 — Build your widget as a React component

Use `@goodwidget/core` for wallet/host context and `@goodwidget/ui` for
components. Wrap everything in `GoodWidgetProvider` so the widget is
self-contained.

```tsx
// src/MyWidget.tsx
import React from 'react'
import { GoodWidgetProvider, useWallet } from '@goodwidget/core'
import type { EIP1193Provider, GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/core'
import {
  Card, Heading, Text, Button, ButtonText, YStack,
} from '@goodwidget/ui'

function Inner() {
  const { address, connect } = useWallet()
  return (
    <YStack gap="$3" padding="$2">
      <Card>
        <Heading level={5}>My Widget</Heading>
        <Text secondary>{address ?? 'Not connected'}</Text>
        <Button fullWidth onPress={address ? undefined : connect}>
          <ButtonText>{address ? 'Do Something' : 'Connect'}</ButtonText>
        </Button>
      </Card>
    </YStack>
  )
}

export interface MyWidgetProps {
  provider?: EIP1193Provider
  config?: GoodWidgetConfig
  themeOverrides?: GoodWidgetThemeOverrides
  defaultTheme?: 'light' | 'dark'
}

export function MyWidget({ provider, config, themeOverrides, defaultTheme = 'light' }: MyWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <Inner />
    </GoodWidgetProvider>
  )
}
```

### Key points

- **Self-contained provider**: Each widget wraps itself in `GoodWidgetProvider`.
  This lets hosts pass `themeOverrides` and `provider` from outside.
- **Use `createComponent()`** for any custom styled components so they get a
  `name` and are registered in the theme manifest for host overridability.
- **Don't import `@goodwidget/embed` here** — that's only for the Web Component
  entry point.

---

## Step 2 — Add a Web Component entry point

```ts
// src/element.ts
import { createMiniAppElement } from '@goodwidget/embed'
import { MyWidget } from './MyWidget'

export const MyWidgetElement = createMiniAppElement(
  MyWidget as React.ComponentType<Record<string, unknown>>,
  {
    shadow: true,           // Shadow DOM for style isolation
    defaultTheme: 'light',
    events: ['action'],     // Custom events the widget emits
  },
)
```

```ts
// src/register.ts
import { MyWidgetElement } from './element'

const TAG = 'my-widget'

export function register(tagName: string = TAG): string {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, MyWidgetElement)
  }
  return tagName
}

// Auto-register on import
register()
```

```ts
// src/index.ts
export { MyWidget } from './MyWidget'
export type { MyWidgetProps } from './MyWidget'
export { MyWidgetElement } from './element'
export { register } from './register'
```

---

## Step 3 — Configure the build

Use **tsup** to produce ESM + CJS bundles with TypeScript declarations.

```ts
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    element: 'src/element.ts',
    register: 'src/register.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Keep React as a peer dep — don't bundle it
  external: ['react', 'react-dom', 'react-native', 'react-native-web'],
})
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "paths": {
      "react-native": ["./node_modules/react-native-web"]
    }
  },
  "include": ["src"]
}
```

---

## Step 4 — Configure package.json exports

The `exports` field tells bundlers how to resolve your package for different
entry points and module systems.

```json
{
  "name": "@myscope/my-widget",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./element": {
      "types": "./dist/element.d.ts",
      "import": "./dist/element.js",
      "require": "./dist/element.cjs"
    },
    "./register": {
      "types": "./dist/register.d.ts",
      "import": "./dist/register.js",
      "require": "./dist/register.cjs"
    }
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "dependencies": {
    "@goodwidget/core": "^0.1.0",
    "@goodwidget/ui": "^0.1.0",
    "@goodwidget/embed": "^0.1.0"
  }
}
```

> **Important**: Always put `"types"` before `"import"` and `"require"` in each
> export condition. TypeScript resolves them in order.

---

## Step 5 — Build & publish

```bash
# Build
npm run build

# Check the output
ls dist/
#  index.js  index.cjs  index.d.ts
#  element.js  element.cjs  element.d.ts
#  register.js  register.cjs  register.d.ts

# Publish (replace with your scope)
npm publish --access public
```

---

## Consumer Guides

### React (web) consumer

Install and use directly as a React component.

```bash
npm install @myscope/my-widget
```

```tsx
// App.tsx
import { MyWidget } from '@myscope/my-widget'

function App() {
  return (
    <MyWidget
      provider={window.ethereum}
      themeOverrides={{
        tokens: { color: { primary: '#7B61FF' } },
      }}
    />
  )
}
```

#### Vite configuration

Add these to your `vite.config.ts` to ensure Tamagui works correctly:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.TAMAGUI_TARGET': JSON.stringify('web'),
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
  },
})
```

---

### React Native consumer

The same React component works natively — no `@goodwidget/embed` needed.

```bash
npm install @myscope/my-widget tamagui @tamagui/core
```

```tsx
// App.tsx
import { MyWidget } from '@myscope/my-widget'

export default function App() {
  return (
    <MyWidget
      provider={walletConnectProvider}
      defaultTheme="light"
      themeOverrides={{
        tokens: { color: { primary: '#E91E63' } },
      }}
    />
  )
}
```

#### Expo setup

1. Add the Tamagui babel plugin to `babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@tamagui/babel-plugin', {
        components: ['tamagui'],
        config: './tamagui.config.ts',
      }],
    ],
  }
}
```

2. Create a `tamagui.config.ts` that re-exports the GoodWidget config:

```ts
import { createGoodWidgetConfig } from '@goodwidget/ui'

const config = createGoodWidgetConfig()

export type AppConfig = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
```

#### Bare React Native (no Expo)

Same as above, but configure Metro's `resolver.resolveRequest` to handle
workspace packages if using a monorepo, and add `@tamagui/babel-plugin` to
your Babel config.

---

### Plain HTML consumer

For pages with no React or build toolchain. You need a bundled version that
includes React and all dependencies.

#### Option A: Use a CDN / pre-built bundle

If you publish a UMD/IIFE bundle (see [Building a standalone bundle](#building-a-standalone-bundle) below):

```html
<script src="https://cdn.example.com/my-widget.iife.js"></script>
<my-widget></my-widget>

<script>
  // Pass wallet provider
  document.querySelector('my-widget').provider = window.ethereum

  // Override theme via CSS custom properties
</script>
```

#### Option B: Use a bundler just for the registration script

Create a small HTML app that imports the `register` entry:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
  <style>
    /* Theme via CSS custom properties — no JS needed */
    .branded {
      --gw-token-color-primary: #E91E63;
    }
  </style>
</head>
<body>
  <!-- Default theme -->
  <my-widget></my-widget>

  <!-- Branded via CSS -->
  <my-widget class="branded"></my-widget>

  <!-- Register the element -->
  <script type="module">
    import '@myscope/my-widget/register'
  </script>
</body>
</html>
```

#### CSS Custom Property Convention

GoodWidget reads `--gw-*` CSS custom properties from the host element and
maps them to theme token overrides. The naming convention:

```
--gw-token-{category}-{name}
```

| CSS Property | Maps to |
|---|---|
| `--gw-token-color-primary` | `tokens.color.primary` |
| `--gw-token-color-primaryDark` | `tokens.color.primaryDark` |
| `--gw-token-space-4` | `tokens.space.4` |
| `--gw-token-radius-2` | `tokens.radius.2` |

```css
gw-claim-widget {
  --gw-token-color-primary: #E91E63;
  --gw-token-color-primaryDark: #AD1457;
}
```

#### JavaScript property overrides

For full control (component themes, complex overrides), set properties via JS:

```js
const el = document.querySelector('my-widget')

el.provider = window.ethereum

el.themeOverrides = {
  tokens: {
    color: { primary: '#7B61FF' },
  },
  themes: {
    light_Card: { background: '#F3E5F5' },
    light_Button: { background: '#7B61FF' },
  },
}
```

#### Building a standalone bundle

To produce a single `.js` file that includes React and can be dropped into
any HTML page, create a small bundler project:

```ts
// bundle-entry.ts
import '@myscope/my-widget/register'
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.TAMAGUI_TARGET': JSON.stringify('web'),
  },
  resolve: {
    alias: { 'react-native': 'react-native-web' },
  },
  build: {
    lib: {
      entry: 'bundle-entry.ts',
      formats: ['iife'],
      name: 'MyWidget',
      fileName: 'my-widget',
    },
  },
})
```

```bash
vite build
# Output: dist/my-widget.iife.js
```

---

### Next.js consumer

```tsx
// app/page.tsx  (App Router)
'use client'

import dynamic from 'next/dynamic'

const MyWidget = dynamic(
  () => import('@myscope/my-widget').then(m => m.MyWidget),
  { ssr: false },
)

export default function Page() {
  return <MyWidget defaultTheme="light" />
}
```

Add to `next.config.js`:

```js
const nextConfig = {
  transpilePackages: [
    '@myscope/my-widget',
    '@goodwidget/core',
    '@goodwidget/ui',
    'tamagui',
    '@tamagui/core',
    'react-native-web',
  ],
}
```

---

## Theme Overridability Checklist

Before publishing, verify your widget is fully overridable:

- [ ] Every custom styled component uses `createComponent()` with a unique `name`
- [ ] The widget wraps itself in `GoodWidgetProvider` and accepts `config`,
      `themeOverrides`, `provider`, and `defaultTheme` props
- [ ] The Web Component entry uses `createMiniAppElement()` with `shadow: true`
- [ ] The `register` entry auto-registers with a `gw-` prefixed tag name
- [ ] `peerDependencies` lists `react` and `react-dom` (not regular deps)
- [ ] The `exports` field has all three entry points with `types` first
- [ ] `tsup.config.ts` marks `react`, `react-dom`, `react-native` as external

Run `getThemeManifest()` in the browser console to verify all your components
appear in the manifest:

```js
import { getThemeManifest } from '@goodwidget/ui'
console.log(getThemeManifest())
// { components: { Card: {...}, Button: {...}, MyCustomCard: {...} }, tokens: [...] }
```

---

## Reference: Full Example Package

See `packages/claim-widget/` in this repository for a complete, working example
that demonstrates all of the above:

```
packages/claim-widget/
├── package.json         # Three exports: ., ./element, ./register
├── tsconfig.json
├── tsup.config.ts       # Builds all three entry points
└── src/
    ├── index.ts         # Barrel: component + element + register
    ├── ClaimWidget.tsx  # React component with GoodWidgetProvider
    ├── element.ts       # createMiniAppElement() wrapper
    └── register.ts      # Auto-registration side effect
```

Consumers of this package:

| Consumer | How to use |
|---|---|
| `examples/react-web/` | React web app importing `ClaimWidget` component |
| `examples/html/` | Plain HTML page using `<gw-claim-widget>` element |
| `examples/expo/` | Expo React Native app importing GoodWidget components |

---

## Enabling Iframe/WebView Embedding

If your widget will be loaded inside an iframe or WebView by a host app, you need to
opt in to bridge communication so the host's wallet provider is accessible.

### 1. Add `@goodwidget/bridge` as a dependency

```bash
pnpm add @goodwidget/bridge
```

### 2. Call `enableIframeBridge()` in your entrypoint

```ts
// src/main.ts or src/index.ts
import { enableIframeBridge } from '@goodwidget/bridge/child'

const bridge = await enableIframeBridge({
  allowedParents: ['https://host1.app', 'https://host2.app'],
  appId: 'my-widget',
})

if (bridge) {
  // Running in an iframe — bridge.provider is a full EIP-1193 provider
  // Also injected as window.ethereum and announced via EIP-6963
  console.log('Connected to host, session:', bridge.sessionId)
}

// Then render your app as normal — GoodWidgetProvider will auto-detect the provider
```

### 3. Security considerations

- Always specify `allowedParents` — don't use `['*']` in production.
- The bridge only exposes JSON-RPC request/response envelopes; private keys never
  leave the host wallet.
- The host controls which origins can communicate; both sides must agree.

### 4. EIP-6963 compatibility

The bridge provider is announced via EIP-6963 with `rdns: 'org.gooddollar.goodwidget.bridge'`.
This means any dapp that uses the standard multi-provider discovery flow (e.g. wagmi, web3-onboard)
will automatically detect it, even without reading `window.ethereum` directly.
