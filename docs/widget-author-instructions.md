# Widget Author Instructions

Use this when building a new widget or adding widget-specific components.

The goal is consistency. A new widget should look like it belongs to GoodWidget by default,
while still giving widget authors and hosts clear places to customize styling.

For the full architecture, see
[`docs/architecture/theming-contract.md`](architecture/theming-contract.md). This file is the
practical authoring version.

---

## Start Here

Before writing component code:

1. Read the issue and design reference.
2. Find the closest existing widget or `@goodwidget/ui` primitive.
3. Use the design system first. Add new styling surface only when the existing one cannot express the design.
4. Check the output manually against the design reference in light/dark and mobile states before asking for review.

Screenshot evidence is useful and required, but it is not a substitute for looking at the actual Storybook output.

---

## The Styling Hierarchy

GoodWidget styling should move from broad to narrow:

1. `packages/ui` preset defaults.
2. Widget author config for one widget package.
3. Host `themeOverrides`.
4. Local component props for one-off layout or isolated exceptions.

Inside the design system, values have different jobs:

| Level            | Use For                           | Example                                         |
| ---------------- | --------------------------------- | ----------------------------------------------- |
| Tokens           | Static primitives and scales      | spacing, radius, raw brand colors, size steps   |
| Base themes      | Semantic light/dark values        | `$background`, `$color`, `$borderColor`         |
| Component themes | Targeted component skins          | `light_Button`, `dark_ProfileCard`              |
| Local props      | One-off layout or state placement | `gap="$3"`, `paddingTop="$2"`, `maxWidth={390}` |

Rule of thumb:

- If it should affect many widgets, consider tokens or base themes.
- If it belongs to one reusable component surface, use a named component theme.
- If it is just local layout, use local props.
- If you are unsure whether a shared token or preset should change, ask before editing `packages/ui/src/presets.ts`.

The shared preset is for cross-widget decisions. A full widget package can still have its own
localized default styling by passing widget-local `config` into its internal
`GoodWidgetProvider`.

---

## Use The Preset First

Start with existing primitives and semantic values:

```tsx
import { Card, Text, Button, ButtonText, YStack } from '@goodwidget/ui'

export function EmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <YStack gap="$3">
        <Text variant="title">No active proposals</Text>
        <Text secondary>Check back later.</Text>
        <Button onPress={onRetry}>
          <ButtonText>Retry</ButtonText>
        </Button>
      </YStack>
    </Card>
  )
}
```

This is the default path. `Card`, `Text`, `Button`, and other UI package components already
know how to read the active theme and preset.

Avoid starting here:

```tsx
<YStack backgroundColor="#ffffff" borderColor="#D9E2F1" borderRadius={18} padding={22}>
  <Text color="#172033" fontSize={19}>
    No active proposals
  </Text>
</YStack>
```

That bypasses the shared visual language. It also makes the component harder for widget
authors and hosts to theme later.

---

## When To Change Each Level

Use this table while implementing a design:

| Need                                                               | Expected Change                                                               |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| The whole product needs a new brand color or scale                 | Discuss and update token/preset values in `packages/ui`                       |
| Light mode or dark mode needs a different default semantic surface | Update base `light` / `dark` theme values                                     |
| A reusable component needs a distinct skin                         | Add or update `light_ComponentName` / `dark_ComponentName`                    |
| A widget-local card, banner, or field repeats across screens       | Create a named component in the widget package and add component theme values |
| A one-off screen needs spacing or layout tuning                    | Use local props with token values like `$2`, `$4`, `$radius`                  |
| A single design asks for a hardcoded value once                    | Keep it local only if it is truly isolated and explain it if it looks unusual |

Do not edit shared tokens or the base preset to make one widget screen match a design. That
changes the system for every widget.

Use `packages/ui/src/presets.ts` when the design decision should affect shared primitives or
multiple widgets. Use widget-local `config.themes` when the design decision belongs to one
complete widget package.

---

## How `createComponent()` Helps

`createComponent()` wraps Tamagui `styled()` and gives the component a stable `name`.

That name matters because Tamagui resolves component themes by name:

- `name: 'ProfileCard'`
- `light_ProfileCard`
- `dark_ProfileCard`

It also registers the component in the GoodWidget theme manifest so supported override targets
can be discovered.

Use `createComponent()` when a component owns a visual contract:

```tsx
import { Card, createComponent } from '@goodwidget/ui'

export const ProfileCard = createComponent(Card, {
  name: 'ProfileCard',
  backgroundColor: '$background',
  borderColor: '$borderColor',
  borderRadius: '$4',
  padding: '$4',
  gap: '$3',
})
```

Then define targeted theme values at the appropriate authoring layer:

```ts
const governanceWidgetConfig = {
  themes: {
    light_ProfileCard: {
      background: '#FFFFFF',
      borderColor: '#D8E4F2',
      shadowColor: 'rgba(26, 44, 74, 0.12)',
    },
    dark_ProfileCard: {
      background: '#151A24',
      borderColor: '#2D3442',
      shadowColor: 'rgba(0, 0, 0, 0.4)',
    },
  },
}
```

Prefer semantic keys like `background`, `color`, `borderColor`, and `shadowColor`. Keep random
component props out of theme objects.

---

## Widget-Local Defaults

A complete widget package should own its package-specific default component themes.

That means the widget can provide named components and default theme values without adding
those names to the shared UI preset:

```tsx
import { GoodWidgetProvider } from '@goodwidget/core'
import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/core'

const governanceWidgetConfig: GoodWidgetConfig = {
  themes: {
    light_GovernanceImpactCard: {
      background: '#00B0FF',
      color: '#FFFFFF',
      borderColor: 'rgba(255, 255, 255, 0.12)',
      shadowColor: 'rgba(0, 176, 255, 0.14)',
    },
    dark_GovernanceImpactCard: {
      background: '#1A85FF',
      color: '#FFFFFF',
      borderColor: 'rgba(255, 255, 255, 0.12)',
      shadowColor: 'rgba(3, 7, 18, 0.9)',
    },
  },
}

export function GovernanceWidget({
  themeOverrides,
}: {
  themeOverrides?: GoodWidgetThemeOverrides
}) {
  return (
    <GoodWidgetProvider config={governanceWidgetConfig} themeOverrides={themeOverrides}>
      <GovernanceWidgetContent />
    </GoodWidgetProvider>
  )
}
```

This keeps the override order intact:

1. shared `@goodwidget/ui` preset
2. governance widget defaults from `config`
3. host `themeOverrides`

Integrators can still override package-owned targets:

```tsx
<GovernanceWidget
  themeOverrides={{
    themes: {
      light_GovernanceImpactCard: {
        background: '#0F766E',
        shadowColor: 'rgba(15, 118, 110, 0.24)',
      },
    },
  }}
/>
```

Only move a widget component theme into `packages/ui` when that component or visual decision is
intended to be shared across widgets.

---

## When Not To Use `createComponent()`

Do not create a named component just to avoid local props.

This is fine as local composition:

```tsx
<YStack gap="$3" padding="$4" maxWidth={390}>
  <Text variant="title">Choose your house</Text>
  <Text secondary>Pick the governance track you want to join.</Text>
</YStack>
```

It does not need a new `light_ChooseYourHousePanel` theme unless it becomes a reusable visual
surface that authors or hosts should be able to target.

Before adding a named component, answer:

- Will this visual surface repeat?
- Should this surface be independently themeable?
- Is this name stable enough to become an override target?
- Is this a design-system primitive, a widget public surface, or an internal helper?

If the answer is unclear, keep composition local and ask before expanding the theme surface.

---

## Practical Component Workflow

When creating widget UI, work in this order:

1. Compose the screen from existing `@goodwidget/ui` primitives.
2. Replace repeated visual surfaces with small widget components.
3. For each repeated surface, decide whether it needs a named theme target.
4. Add `createComponent()` only for surfaces that own a visual contract.
5. Add light and dark stories for the states affected by the component.
6. Run the screenshot tests, then manually compare the Storybook output to the design reference.

Good component boundaries usually look like this:

```text
GovernanceWidget.tsx
  renders provider/state wiring

ProposalList.tsx
  maps proposal data

ProposalCard.tsx
  reusable visual surface, likely named with createComponent()

ProposalStatusBadge.tsx
  reusable visual surface if it appears across screens

format.ts
  pure formatting helpers
```

Avoid one large component that handles all states, all copy, all formatting, and all styling
inline. It becomes hard to review and hard to theme correctly.

---

## Review Checklist

Before requesting review:

- The widget uses existing `@goodwidget/ui` primitives where possible.
- Repeated visual surfaces either reuse existing primitives or have intentional named components.
- New `createComponent()` names are stable and intentionally themeable.
- Styling uses `$background`, `$color`, `$borderColor`, `$shadowColor`, and token scale values where possible.
- Shared tokens or presets were not changed for widget-local styling.
- Light and dark states were checked when the component supports both.
- Mobile width was checked against the design reference.
- Storybook screenshots were refreshed when visual states changed.
- Manual visual review was done against Figma/Stitch/reference screenshots.

If a design seems impossible to express through the current system, do not work around it by
rewriting shared preset values for one widget. Note the gap and ask how the design-system
surface should evolve.
