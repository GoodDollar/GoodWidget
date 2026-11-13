# Streaming widget embedding

`StreamingWidget` accepts `hideHeader?: boolean` (default `false`) to hide its title and network badge while retaining its tabs and wallet/network recovery states. `StreamingWidgetPreview` also accepts `hideHeader` for deterministic previews.

Hosts can pass `addressOverride?: string | null`, `chainIdOverride?: number | null`, `connectOverride?: () => Promise<void>`, `switchChainOverride?: (chainId: number) => Promise<void>`, and `availableChainIdsOverride?: number[] | null` along with `provider`. These are forwarded to the widget's `GoodWidgetProvider`. `null` address/chain overrides explicitly clear the corresponding value; `undefined` uses provider tracking. Network switching tries the provider first and uses the override as core's fallback.

The available-chain list is forwarded to core; this widget does not independently gate writes using that list.
