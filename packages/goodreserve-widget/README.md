# GoodReserve widget embedding

`GoodReserveWidget` accepts `hideHeader?: boolean` (default `false`) to hide the title, network badge and subtitle while retaining swap controls and wallet/network recovery states.

Hosts can pass `addressOverride?: string | null`, `chainIdOverride?: number | null`, `connectOverride?: () => Promise<void>`, `switchChainOverride?: (chainId: number) => Promise<void>`, and `availableChainIdsOverride?: number[] | null` along with `provider`. These are forwarded to the widget's `GoodWidgetProvider`. `null` address/chain overrides explicitly clear the corresponding value; `undefined` uses provider tracking. Network switching tries the provider first and uses the override as core's fallback.

The available-chain list is forwarded to core; this widget does not independently gate writes using that list.
