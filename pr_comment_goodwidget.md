Contributor: @hazzikri

Fixed:

- Container overflow bug: Added `flexWrap: 'wrap'` to `ChainRowCard` in `shared.tsx` to prevent content pushing past the 400px widget container width.
- Simplified `ActionButton` default `minWidth` to allow responsive button alignment without overflowing.

Verified:

- Mobile & 400px viewports: Content wraps cleanly without horizontal scroll or clipping.

Evidence:

- Verified `ChainRowCard` row layout at 400px container width.

Remaining risks:

- None.
