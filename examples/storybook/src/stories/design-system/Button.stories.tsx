/**
 * Button — interactive primitive.
 *
 * Every variant must keep a readable label in both themes. The variants grid below
 * is the regression fixture for the label-contrast smoke test in
 * tests/design-system/smoke.spec.ts.
 */
import React from 'react'
import type { Decorator, Meta, StoryObj } from '@storybook/react'
import { GoodWidgetProvider } from '@goodwidget/core'
import { Button, ButtonText, XStack, YStack } from '@goodwidget/ui'

/** Button variants that render a text label on a non-brand background. */
const LABELLED_VARIANTS = ['primary', 'secondary', 'outline', 'ghost', 'text'] as const

type ThemeMode = 'light' | 'dark'

/** Renders the story inside the real provider using the theme chosen by the story parameters. */
const withThemeModeProvider: Decorator = (Story, context) => {
  const themeMode = (context.parameters.themeMode as ThemeMode | undefined) ?? 'light'
  return (
    <GoodWidgetProvider defaultTheme={themeMode}>
      <YStack padding="$4" backgroundColor="$background">
        <Story />
      </YStack>
    </GoodWidgetProvider>
  )
}

const meta: Meta<typeof Button> = {
  title: 'Design System/Primitives/Button',
  component: Button,
  tags: ['autodocs', 'showcase'],
  parameters: { layout: 'padded' },
  decorators: [withThemeModeProvider],
}
export default meta
type Story = StoryObj<typeof Button>

/** One button per labelled variant so label color can be asserted per variant. */
function renderVariantsGrid() {
  return (
    <XStack gap="$3" flexWrap="wrap" data-testid="Button-variants">
      {LABELLED_VARIANTS.map((variant) => (
        <Button key={variant} variant={variant} data-testid={`Button-${variant}`}>
          <ButtonText data-testid={`ButtonText-${variant}`}>{variant}</ButtonText>
        </Button>
      ))}
    </XStack>
  )
}

/** All labelled variants on the light theme. */
export const VariantsLight: Story = {
  parameters: { themeMode: 'light' },
  render: renderVariantsGrid,
}

/** All labelled variants on the dark theme. */
export const VariantsDark: Story = {
  parameters: { themeMode: 'dark' },
  render: renderVariantsGrid,
}
