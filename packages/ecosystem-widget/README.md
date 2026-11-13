# Ecosystem Widget

Compose existing GoodWidget widgets inside one wallet-aware shell.

```tsx
import { EcosystemWidget } from '@goodwidget/ecosystem-widget'

<EcosystemWidget
  widgets={['citizen-claim', 'goodreserve', 'streaming', 'ai-credits']}
  provider={walletProvider}
  widgetProps={{ 'ai-credits': { backendUrl: 'https://example.com' } }}
/>
```

Only the selected enabled widget is imported and mounted. Changing selection
unmounts the previous widget; returning to it starts a new instance. In-progress
state and transaction progress are not guaranteed to be recovered on remount.
Switching does not itself cancel or resubmit a transaction. A transaction started
before switching can still complete, but its widget callback may not fire after
unmount. Check its status before submitting another transaction.

`provider`, `config`, `themeOverrides`, `defaultTheme`, and the wallet
`addressOverride`, `chainIdOverride`, `connectOverride`, `disconnectOverride`,
`switchChainOverride`, and `availableChainIdsOverride` follow
`GoodWidgetProvider`. `supportedChains` optionally narrows a widget's supported
chain IDs; it cannot add support for chains the widget does not support.
For custodial Citizen Claim, it restricts the configured per-chain clients
and client factory independently of the active wallet network and its available
chains. Changing the supported chain set remounts Citizen Claim.
`widgetProps` supplies widget-specific callbacks and configuration, including
AI Credits' `baseRpcUrl` and `celoRpcUrl`. Other widgets use their existing RPC
configuration; this wrapper does not replace their RPC clients.

Set `nativeMode` for a host-owned native wallet. The wrapper waits for its
provider's account and presents neither connect nor disconnect controls. For
other hosts, the wallet chip uses the existing wallet controls: if no
`disconnectOverride` is supplied, it explains how to disconnect in the wallet.
For AppKit, use `useAppKitSession` from `@goodwidget/embed/appkit-provider` to
pass the existing session and supply a `disconnectOverride` that opens the
network settings with `disconnectLabel="Network settings"`.

The web component exposes the same configuration as JavaScript properties:

```html
<gw-ecosystem-widget></gw-ecosystem-widget>
<script type="module">
  import '@goodwidget/ecosystem-widget/register'
  const widget = document.querySelector('gw-ecosystem-widget')
  widget.widgets = ['citizen-claim', 'goodreserve']
  widget.provider = window.ethereum
  widget.defaultTheme = 'light'
</script>
```

Widget-specific callbacks are supplied through `widgetProps`. The custom
element also accepts `themeOverrides` and `config`, including the shared CSS
custom-property bridge from `@goodwidget/embed`.
