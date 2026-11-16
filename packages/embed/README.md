# AppKit session bridge

`useAppKitSession` from `@goodwidget/embed/appkit-provider` maps an AppKit
session to GoodWidget's `provider`, `addressOverride`, `chainIdOverride`,
`availableChainIdsOverride`, `connectOverride`, and `switchChainOverride`
props. Call it inside an active AppKit provider:

```tsx
const { open, ...walletProps } = useAppKitSession()
return <MyWidget {...walletProps} />
```

`open` is AppKit's modal action, for example to open its Account view. Disconnect
policy remains with the caller; use `useDisconnect` for a direct disconnect.
Unresolved or restoring accounts leave address and chain overrides `undefined`;
a resolved missing value is `null`. By default, a connected account remains
unresolved until its EIP-1193 provider is available. For compatibility with
hosts that already treat a connected account as resolved without a provider, use
`requireProviderForConnected: false`. Unknown approved networks map to `null`
and an empty approved list stays empty.

The bridge uses `DEFAULT_APPKIT_NETWORKS` for programmatic switches. If the
provider has custom networks, pass the same descriptors as `{ networks }`.
Unknown or rejected switches open AppKit's network selector and reject, since
opening the selector does not establish that a switch succeeded. A cancelled
connect rejects with `wallet_connect_cancelled`.
