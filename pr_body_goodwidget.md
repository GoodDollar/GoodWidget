Fixes #122
Parent issue: #113 · Plan: #114

## Contributor Handoff & Summary

**Contributor:** @hazzikri
**Target Branch:** `plan/connect-a-wallet-widget`

### Fixed
- **Container overflow bug**: Added `flexWrap: 'wrap'` to `ChainRowCard` in `shared.tsx` so that `ChainLinkRow`'s row (avatar + chain badge + address + status badge + action button) wraps gracefully without pushing content past the widget's 400px container boundary.
- **Button minWidth**: Simplified `ActionButton`'s `minWidth` prop default in `shared.tsx` to allow buttons to size dynamically and align cleanly on narrow/mobile viewports.

### Verified
- Checked layout alignment across 400px fixed width and mobile viewports.
- Confirmed row content wraps cleanly without horizontal overflow.
- No breaking changes to shared `@goodwidget/ui` components (localized fix to `connect-a-wallet-widget`).

### Evidence & Risks
- **Test Evidence**: Checked `ChainRowCard` rendering at 400px Storybook shell width.
- **Remaining Risks**: None.
