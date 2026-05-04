# GoodWidget — Expo (React Native) Example

This is a standalone Expo app that demonstrates using `@goodwidget/claim-widget-theme-demo` in a React Native environment — importing the widget as an npm package and overriding its theme.

## Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

## Setup

```bash
npm install
npx expo start
```

## What this demonstrates

### Importing and using an existing widget

Both screens import `ClaimWidget` from `@goodwidget/claim-widget-theme-demo`:

```tsx
import { ClaimWidget } from '@goodwidget/claim-widget-theme-demo'
```

The widget is a self-contained mini app with its own `GoodWidgetProvider`. The host app just renders it and passes override props.

### Theme overrides

The app shows four override strategies applied to the **same** ClaimWidget:

1. **Default** — no overrides, GoodDollar blue theme
2. **Token override** — `config={{ tokens: { color: { primary: '#7B61FF' } } }}` changes the primary color to purple globally inside the widget
3. **Component theme override** — `config={{ themes: { light_Card: {...}, light_Button: {...} } }}` targets the basic Card and Button elements with amber/orange styling
4. **Host override** — `themeOverrides={{ themes: { light_ClaimCard: {...}, light_Card: {...} } }}` targets both the widget's custom `ClaimCard` component AND the basic `Card` element. This is the key scenario: overriding a third-party widget's theme without touching its source.

### Screens

- **`app/index.tsx`** — Main screen showing all four override levels vertically
- **`app/theme-demo.tsx`** — Side-by-side comparison of the same widget with different themes

## Notes

- This example does NOT use `@goodwidget/embed` — that package is only for Web Component output.
- For a real app, you'd configure a wallet provider (e.g. WalletConnect) and pass it to `<ClaimWidget provider={...} />`.
- Tamagui's babel plugin is configured in `babel.config.js` for optimal native performance.
