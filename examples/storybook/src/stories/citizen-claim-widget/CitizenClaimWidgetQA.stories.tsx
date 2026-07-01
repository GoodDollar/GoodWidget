import type { Meta, StoryObj } from '@storybook/react'
import { CitizenClaimWidget } from '@goodwidget/citizen-claim-widget'
import { CustodialLocalFixtureStory } from '../helpers/citizenClaimWidgetStories'
import { BRAND_PRESET_OPTIONS, brandPresetOverrides, type BrandPreset } from '../helpers/themeOverridePresets'

interface CitizenClaimWidgetQAArgs {
  defaultTheme: 'light' | 'dark'
  brandPreset: BrandPreset
}

const meta: Meta<CitizenClaimWidgetQAArgs> = {
  title: 'QA/CitizenClaimWidget/Runtime Fixtures',
  component: CitizenClaimWidget,
  tags: ['autodocs', 'qa'],
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
type Story = StoryObj<CitizenClaimWidgetQAArgs>

export const CustodialLocalFixture: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <CustodialLocalFixtureStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}
