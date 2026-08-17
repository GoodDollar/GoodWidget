import type { Meta, StoryObj } from '@storybook/react'
import { SuperfluidCampaignWidget, type SuperfluidCampaignView } from '@goodwidget/superfluid-campaign-widget'
import { InjectedWalletStory, LiveDataNoWalletStory } from '../helpers/superfluidCampaignWidgetStories'
import { BRAND_PRESET_OPTIONS, brandPresetOverrides, type BrandPreset } from '../helpers/themeOverridePresets'

interface SuperfluidCampaignWidgetStoryArgs {
  defaultTheme: 'light' | 'dark'
  brandPreset: BrandPreset
  initialView: SuperfluidCampaignView
}

const meta: Meta<SuperfluidCampaignWidgetStoryArgs> = {
  title: 'Widgets/SuperfluidCampaignWidget/Showcase',
  component: SuperfluidCampaignWidget,
  tags: ['integrator', 'manual', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    defaultTheme: {
      control: 'radio',
      options: ['dark', 'light'],
      description: "Base theme applied via the widget's own defaultTheme prop.",
    },
    brandPreset: {
      control: 'select',
      options: BRAND_PRESET_OPTIONS,
      description: 'Sample host-branding themeOverrides preset.',
    },
    initialView: {
      control: 'radio',
      options: ['content', 'leaderboard'],
      description: 'View shown on first render.',
    },
  },
  args: {
    defaultTheme: 'dark',
    brandPreset: 'None',
    initialView: 'content',
  },
}

export default meta
type Story = StoryObj<SuperfluidCampaignWidgetStoryArgs>

export const InjectedWallet: Story = {
  render: ({ defaultTheme, brandPreset, initialView }) => (
    <InjectedWalletStory
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
      initialView={initialView}
    />
  ),
}

export const NoWallet: Story = {
  render: ({ defaultTheme, brandPreset, initialView }) => (
    <LiveDataNoWalletStory
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
      initialView={initialView}
    />
  ),
}
