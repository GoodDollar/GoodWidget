import type { Meta, StoryObj } from '@storybook/react'
import { StakingMigrationWidget } from '@goodwidget/staking-migration-widget'
import { InjectedWalletStory } from '../helpers/stakingMigrationWidgetStories'
import { BRAND_PRESET_OPTIONS, brandPresetOverrides, type BrandPreset } from '../helpers/themeOverridePresets'

interface StakingMigrationWidgetStoryArgs {
  defaultTheme: 'light' | 'dark'
  brandPreset: BrandPreset
}

const meta: Meta<StakingMigrationWidgetStoryArgs> = {
  title: 'Widgets/StakingMigrationWidget/Showcase',
  component: StakingMigrationWidget,
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
type Story = StoryObj<StakingMigrationWidgetStoryArgs>

export const InjectedWallet: Story = {
  parameters: {
    goodWidgetProvider: {
      useShell: false,
    },
  },
  render: ({ defaultTheme, brandPreset }) => (
    <InjectedWalletStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}
