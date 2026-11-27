import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { ThemedConnectAWalletStory } from '../helpers/connectAWalletWidgetStories'
import { ButtonThemePlayground, buttonThemeControls, type ButtonThemeArgs } from '../helpers/buttonThemePlayground'

const meta: Meta<ButtonThemeArgs> = {
  ...buttonThemeControls,
  title: 'Widgets/ConnectAWalletWidget/Theme overrides',
}

export default meta
type Story = StoryObj<ButtonThemeArgs>

export const Playground: Story = {
  render: (args) => (
    <ButtonThemePlayground
      widgetName="ConnectAWalletWidget"
      args={args}
      renderWidget={(themeOverrides) => (
        <ThemedConnectAWalletStory defaultTheme={args.defaultTheme} themeOverrides={themeOverrides} />
      )}
    />
  ),
}
