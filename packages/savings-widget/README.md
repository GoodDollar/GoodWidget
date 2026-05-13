# @goodwidget/savings-widget

A GoodDollar savings widget built for GoodWidget that uses `@goodsdks/savings-sdk` for deposit, withdraw, and reward-claim flows.

## Usage

```tsx
import { SavingsWidget } from '@goodwidget/savings-widget'

export function App({ provider }) {
  return <SavingsWidget provider={provider} />
}
```

## Wallet onboarding

If wallet connection is handled outside the widget, pass `connectWallet`:

```tsx
<SavingsWidget provider={provider} connectWallet={() => appKit.open()} />
```
