import React from 'react'
import type { Decorator } from '@storybook/react'
import { GoodWidgetProvider } from '@goodwidget/core'
import { YStack } from '@goodwidget/ui'

/**
 * Makes a design-system story render with GoodWidget's shipped visual baseline.
 *
 * It is intentionally scoped to primitive/theming stories and should only be used by ui package components.
 * Full widget stories must be shipped with their own GoodWidgetProvider setup.
 *
 * Two story-level `parameters` let individual stories opt into a different
 * frame without a second, nested `GoodWidgetProvider` (Storybook composes a
 * per-story `decorators` override ON TOP of this meta-level one rather than
 * replacing it, so a second provider would just render inside this one and
 * still be bounded by ITS 480px `contentMaxWidth`):
 * - `contentMaxWidthPx` widens the frame itself, for stories that
 *   intentionally render wider than the default 480px widget (e.g. an
 *   explicit `width={800}` wide-embed chart stress test).
 * - `stretchWrapper` makes the inner `<YStack padding="$4">` take on the
 *   provider's real frame width instead of shrinking to fit its own content
 *   (the default, from `GoodWidgetProvider`'s `alignItems="center"`), so a
 *   component's own internal `overflow: auto` scroll container has a real
 *   width to overflow against.
 * Both default to the original behavior when unset.
 */
export const withDefaultPreset: Decorator = (Story, context) => {
  const contentMaxWidthPx = context.parameters.contentMaxWidthPx as number | undefined
  const stretchWrapper = context.parameters.stretchWrapper as boolean | undefined

  return (
    <GoodWidgetProvider defaultTheme="dark" contentMaxWidth={contentMaxWidthPx}>
      <YStack padding="$4" alignSelf={stretchWrapper ? 'stretch' : undefined}>
        <Story />
      </YStack>
    </GoodWidgetProvider>
  )
}
