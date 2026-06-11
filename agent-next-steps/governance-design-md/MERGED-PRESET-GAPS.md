# Merged Light Preset Gaps

This note compares `local-reference-assets/governance-ui/DESIGN.md` against the current merged light path in `packages/ui/src/presets.ts`.

The goal is not to restate everything that is already implemented. The goal is to call out the parts of the governance design direction that are still only partially represented, approximated, or not yet encoded as first-class preset values.

## What the merged light preset already reflects

- `background`, `surface`, `surfaceAlt`, `border`, `primary`, `success`, `warning`, and the primary text colors are broadly aligned to the civic palette.
- `DM Sans` is already represented in the governance preset typography direction.
- The general visual language is present: white cards, pale-blue secondary surfaces, soft shadows, and a blue primary action.
- The current `ClaimWidget` screenshot path now renders in a light civic direction rather than the legacy dark wallet look.

## Likely missing or only partially encoded

- The full surface ladder from `DESIGN.md` is not yet encoded as distinct preset values.
- `surface-dim`, `surface-bright`, `surface-container-lowest`, `surface-container-low`, `surface-container`, `surface-container-high`, and `surface-container-highest` are still mostly collapsed into a smaller set of equivalent light surfaces.
- The semantic `on-*` palette is not fully represented as theme-level tokens.
- `on-surface`, `on-surface-variant`, `on-primary`, `on-primary-container`, `on-secondary`, `on-secondary-container`, `on-tertiary`, `on-tertiary-container`, `on-error`, and the fixed-color variants are not fully modeled as first-class preset keys.
- `inverse-surface`, `inverse-on-surface`, and `inverse-primary` are not yet explicitly encoded in the merged light branch.
- `secondary-container`, `tertiary`, `tertiary-container`, `error-container`, and the fixed accent colors from the design reference are not mapped as a complete semantic system.
- `text-primary`, `text-secondary`, and `text-muted` exist conceptually in the merged light direction, but the preset still does not expose every naming variant from the design reference as a dedicated semantic alias.
- The merged preset still uses a smaller typography contract than the design document’s full role set.
- The design reference defines `headline-xl`, `headline-lg`, `headline-md`, `headline-sm`, `body-lg`, `body-md`, `label-md`, `label-sm`, and a mobile headline variant, while the merged preset currently exposes only the base body and heading scales.
- The design reference’s spacing language is more explicit than the current preset contract.
- `gap-xs`, `gap-sm`, `gap-md`, `gap-lg`, `gap-xl`, and `margin-page` are not exposed as named design tokens.
- `max-width-content: 1200px` from the design reference is not mirrored as a dedicated governance-specific content width token.
- The shape system is only partially aligned.
- `rounded-sm`, `rounded`, `rounded-md`, `rounded-lg`, `rounded-xl`, and `full` are not modeled as the full governance shape vocabulary from the design reference.
- Component-specific design directions like proposal hero layout, voting steppers, eligibility banners, and results progress bars are still widget-structure guidance rather than preset-level primitives.

## Interpretation

- The merged light preset is good enough for current widget rendering and review.
- It is not yet a complete mechanical transcription of `DESIGN.md`.
- In practice, that means the governance preset is still a useful reference target even if the merged preset now covers the main visual path.
- The remaining work is mostly about semantic completeness, not about redoing the current screenshot path.

## Suggested follow-up

- Add the missing semantic surface aliases only if current or upcoming widgets actually consume them.
- Keep the design document as the source of truth for brand direction, and use this gap list as the implementation checklist for the preset contract.
