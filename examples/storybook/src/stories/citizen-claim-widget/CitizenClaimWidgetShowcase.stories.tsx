import type { Meta, StoryObj } from '@storybook/react'
import { CitizenClaimWidget } from '@goodwidget/citizen-claim-widget'
import { InjectedWalletStory } from '../helpers/citizenClaimWidgetStories'
import { BRAND_PRESET_OPTIONS, brandPresetOverrides, type BrandPreset } from '../helpers/themeOverridePresets'

interface CitizenClaimWidgetStoryArgs {
  defaultTheme: 'light' | 'dark'
  brandPreset: BrandPreset
}

const meta: Meta<CitizenClaimWidgetStoryArgs> = {
  title: 'Widgets/CitizenClaimWidget/Showcase',
  component: CitizenClaimWidget,
  tags: ['integrator', 'manual', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    defaultTheme: {
      control: 'radio',
      options: ['dark', 'light'],
      description: 'Base theme applied via the widget’s own defaultTheme prop.',
    },
    brandPreset: {
      control: 'select',
      options: BRAND_PRESET_OPTIONS,
      description: 'Sample host-branding themeOverrides preset.',
    },
  },
  args: {
    defaultTheme: 'dark',
    brandPreset: 'None',
  },
}

export default meta
type Story = StoryObj<CitizenClaimWidgetStoryArgs>

export const InjectedWallet: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <InjectedWalletStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}
