# GoodWidget

A cross-platform mini app framework for building web3 widgets that run inside wallets and dapps.

## Packages

| Package | Description |
|---------|-------------|
| `@goodwidget/core` | EIP-1193 provider normalization, host detection, wallet hooks, React context |
| `@goodwidget/ui` | Tamagui-based themeable component library (React + React Native Web) |
| `@goodwidget/embed` | Web Component wrapper for embedding mini apps in any HTML page |
| `@goodwidget/claim-widget` | Sample publishable widget — React component + Web Component |

## Quick Start

```bash
pnpm install
pnpm run build
```

### Run the examples

```bash
# React web demo with style override showcase
cd examples/react-web && pnpm run dev

# Plain HTML page using the claim widget as a web component
cd examples/html && pnpm run dev

# Expo (React Native) — standalone, see examples/expo/README.md
```

## Building a Mini App

```tsx
import { GoodWidgetProvider, useWallet } from '@goodwidget/core'
import { MiniAppShell, Card, Heading, Text, Button, ButtonText } from '@goodwidget/ui'

function MyApp() {
  const { address, connect } = useWallet()
  return (
    <MiniAppShell title="My Mini App">
      <Card>
        <Heading level={4}>Welcome</Heading>
        <Text>{address ?? 'Not connected'}</Text>
        <Button onPress={connect} fullWidth>
          <ButtonText>Connect</ButtonText>
        </Button>
      </Card>
    </MiniAppShell>
  )
}

export default function App({ provider, themeOverrides }) {
  return (
    <GoodWidgetProvider provider={provider} themeOverrides={themeOverrides}>
      <MyApp />
    </GoodWidgetProvider>
  )
}
```

## Theme Overrides

### As a mini app author

```ts
import { createGoodWidgetConfig } from '@goodwidget/ui'

const config = createGoodWidgetConfig({
  tokens: { color: { primary: '#7B61FF' } },
  themes: { light_Button: { background: '#7B61FF' } },
})

<GoodWidgetProvider config={config}>...</GoodWidgetProvider>
```

### As a host embedding someone else's mini app

```tsx
<ThirdPartyApp
  provider={myWallet}
  themeOverrides={{
    tokens: { color: { primary: '#FF6B00' } },
    themes: { light_GlassCard: { background: '#FFF3E0' } },
  }}
/>
```

### As a host using CSS custom properties (Web Components)

```css
good-miniapp {
  --gw-color-primary: #FF6B00;
  --gw-Card-background: #FFF3E0;
  --gw-Button-background: #FF6B00;
}
```

## Exporting as a Web Component

```ts
import { createMiniAppElement } from '@goodwidget/embed'
import { MyApp } from './MyApp'

const Element = createMiniAppElement(MyApp, {
  shadow: true,
  props: { chainId: 'attribute' },
  events: ['transaction-sent'],
})

customElements.define('my-miniapp', Element)
```

```html
<my-miniapp chain-id="42220"></my-miniapp>
<script>
  const el = document.querySelector('my-miniapp')
  el.provider = window.ethereum
  el.themeOverrides = { tokens: { color: { primary: '#7B61FF' } } }
</script>
```

## Creating Custom Components

Use `createComponent()` to ensure your components are theme-overridable by hosts:

```ts
import { createComponent, Card } from '@goodwidget/ui'

export const GlassCard = createComponent(Card, {
  name: 'GlassCard', // Required — enables theme targeting
  backgroundColor: 'rgba(255,255,255,0.1)',
  variants: {
    elevated: {
      true: { shadowRadius: 20 },
    },
  } as const,
})

// Hosts can now override via:
// themeOverrides: { themes: { light_GlassCard: { background: '...' } } }
// or CSS: --gw-GlassCard-background: ...;
```

## Host Environments

GoodWidget auto-detects and normalizes providers from:

- **Farcaster** — via `sdk.wallet.getEthereumProvider()`
- **MiniPay** (Celo) — via `window.ethereum` with `isMiniPay` flag
- **World App** — via MiniKit bridge
- **Any EIP-1193 wallet** — via `window.ethereum` or explicit provider prop

## Packaging Your Widget

See **[docs/PACKAGING.md](docs/PACKAGING.md)** for the full guide on how to build, bundle,
and publish your widget as an npm package that works in React, React Native, and plain HTML.

## Architecture

```
GoodWidget/
  packages/
    core/           → @goodwidget/core          (provider, hooks, EIP-1193, host detection)
    ui/             → @goodwidget/ui            (component library, theme system)
    embed/          → @goodwidget/embed         (Web Component wrapper)
    claim-widget/   → @goodwidget/claim-widget  (sample publishable widget)
  examples/
    react-web/      → React demo with style override showcase
    html/           → Plain HTML consuming a web component widget
    expo/           → Expo (React Native) app (standalone)
  docs/
    PACKAGING.md    → How to package & distribute your widget
```

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for detailed design decisions and conventions.
