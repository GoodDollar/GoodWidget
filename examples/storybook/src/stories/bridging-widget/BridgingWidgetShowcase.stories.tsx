import type { Meta, StoryObj } from '@storybook/react'
import { BridgingWidget } from '@goodwidget/bridging-widget'
import { CustodialLocalFixtureStory, InjectedWalletStory } from '../helpers/bridgingWidgetStories'
import { BRAND_PRESET_OPTIONS, brandPresetOverrides, type BrandPreset } from '../helpers/themeOverridePresets'

interface ShowcaseArgs {
  defaultTheme: 'light' | 'dark'
  brandPreset: BrandPreset
}

const meta: Meta<ShowcaseArgs> = {
  title: 'Widgets/BridgingWidget/Showcase',
  component: BridgingWidget,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: { defaultTheme: 'dark', brandPreset: 'None' },
  argTypes: {
    defaultTheme: { control: 'radio', options: ['dark', 'light'] },
    brandPreset: { control: 'select', options: BRAND_PRESET_OPTIONS },
  },
}

export default meta
type Story = StoryObj<ShowcaseArgs>

export const InjectedWallet: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <InjectedWalletStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const CustodialLocalFixture: Story = {
  tags: ['manual'],
  render: ({ defaultTheme, brandPreset }) => (
    <CustodialLocalFixtureStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}
