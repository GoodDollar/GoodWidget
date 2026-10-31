import type { Meta, StoryObj } from '@storybook/react'
import { CitizenClaimWidget, type CitizenClaimWidgetEnvironment } from '@goodwidget/citizen-claim-widget'
import { InjectedWalletStory } from '../helpers/citizenClaimWidgetStories'
import { BRAND_PRESET_OPTIONS, brandPresetOverrides, type BrandPreset } from '../helpers/themeOverridePresets'
import { ENVIRONMENT_OPTIONS } from '../helpers/environmentOptions'

interface CitizenClaimWidgetStoryArgs {
  defaultTheme: 'light' | 'dark'
  brandPreset: BrandPreset
  environment: CitizenClaimWidgetEnvironment
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
    environment: {
      control: 'radio',
      options: ENVIRONMENT_OPTIONS,
      description: 'Deployed GoodProtocol environment passed to the widget’s environment prop.',
    },
  },
  args: {
    defaultTheme: 'dark',
    brandPreset: 'None',
    environment: 'development',
  },
}

export default meta
type Story = StoryObj<CitizenClaimWidgetStoryArgs>

export const InjectedWallet: Story = {
  render: ({ defaultTheme, brandPreset, environment }) => (
    <InjectedWalletStory
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
      environment={environment}
    />
  ),
}
