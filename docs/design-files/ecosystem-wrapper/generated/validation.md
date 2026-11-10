# ecosystem-wrapper: spec validation

Errors block the check; warnings need a human look.

## Errors (0)

- none

## Warnings (9)

- Absolute child without exported offset: BottomBarItem [State=default] > Indicator
- Absolute child without exported offset: BottomBarItem [State=active] > Indicator
- Absolute child without exported offset: BottomBarItem [State=loading] > Indicator
- Absolute child without exported offset: BottomBarItem [State=disabled] > Indicator
- Absolute child without exported offset: EcosystemHeader [State=connecting] > Row > Right > Spinner
- Absolute child without exported offset: 3 · connecting wallet (Reown modal) > Scrim
- Absolute child without exported offset: 3 · connecting wallet (Reown modal) > WalletModal
- Absolute child without exported offset: 6 · More drawer open > Scrim
- Absolute child without exported offset: 6 · More drawer open > WidgetDrawer

## Inferred token bindings (9 distinct)

Values the designer left unbound that exactly match a scale token. Bind them in Penpot to remove the inference.

- gap=12 -> `$3` (space.3): 6x, first at WalletModal [default]
- padding=20 -> `$5` (space.5): 4x, first at WalletModal [default]
- padding=8 -> `$2` (space.2): 8x, first at WalletModal [default] > WalletRow
- padding=12 -> `$3` (space.3): 9x, first at WalletModal [default] > WalletRow
- gap=8 -> `$2` (space.2): 2x, first at WidgetDrawer [default]
- padding=24 -> `$6` (space.6): 13x, first at WidgetDrawer [default]
- gap=16 -> `$4` (space.4): 7x, first at WidgetUnavailable [default]
- gap=20 -> `$5` (space.5): 13x, first at 1 · claim (default) > Body
- padding=16 -> `$4` (space.4): 56x, first at 1 · claim (default) > Body

## Raw values with no token (3)

- borderRadius [32, 32, 0, 0] is raw (no radius token covers it) at WidgetDrawer [default]
- borderRadius [2, 2, 2, 2] is raw (no radius token covers it) at WidgetDrawer [default] > HandleWrap > Handle
- borderRadius [32, 32, 0, 0] is raw (no radius token covers it) at 6 · More drawer open > WidgetDrawer
