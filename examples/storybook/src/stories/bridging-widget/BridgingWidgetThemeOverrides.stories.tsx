import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { ThemedBridgeStory } from '../helpers/bridgingWidgetStories'
import { ButtonThemePlayground, buttonThemeControls, type ButtonThemeArgs } from '../helpers/buttonThemePlayground'

const meta: Meta<ButtonThemeArgs> = {
  ...buttonThemeControls,
  title: 'Widgets/BridgingWidget/Theme overrides',
}

export default meta
type Story = StoryObj<ButtonThemeArgs>

export const Playground: Story = {
  render: (args) => (
    <ButtonThemePlayground
      widgetName="BridgingWidget"
      args={args}
      renderWidget={(themeOverrides) => (
        <ThemedBridgeStory defaultTheme={args.defaultTheme} themeOverrides={themeOverrides} />
      )}
    />
  ),
}
