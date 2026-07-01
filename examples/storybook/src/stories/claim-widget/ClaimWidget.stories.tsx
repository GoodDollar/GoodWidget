/**
 * ClaimWidget theme demo — a boilerplate claim-flow example used to demonstrate
 * the design-system preset and host override surface.
 *
 * These stories are intentionally stable so docs and screenshot automation can
 * verify the styling contract without depending on the runtime-heavy citizen flow.
 */
import type { Meta, StoryObj } from '@storybook/react'
import { ClaimWidget } from '@goodwidget/claim-widget-theme-demo'
import { ClaimWidgetStoryCanvas } from '../helpers/claimWidgetStories'
import { BRAND_PRESET_OPTIONS, brandPresetOverrides, type BrandPreset } from '../helpers/themeOverridePresets'

interface ClaimWidgetStoryArgs {
  defaultTheme: 'light' | 'dark'
  brandPreset: BrandPreset
}

const meta: Meta<ClaimWidgetStoryArgs> = {
  title: 'Widgets/ClaimWidget Theme Demo/Showcase',
  component: ClaimWidget,
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  goodWidgetProvider: {
    disableProvider: true,
    useShell: false,
  },
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
}
export default meta

type Story = StoryObj<ClaimWidgetStoryArgs>

export const Default: Story = {
  args: { defaultTheme: 'dark', brandPreset: 'None' },
  render: ({ defaultTheme, brandPreset }) => (
    <ClaimWidgetStoryCanvas
      dataTestId="ClaimWidget-default"
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
  ),
}

export const LightTheme: Story = {
  args: { defaultTheme: 'light', brandPreset: 'None' },
  render: ({ defaultTheme, brandPreset }) => (
    <ClaimWidgetStoryCanvas
      dataTestId="ClaimWidget-light"
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
  ),
}

export const CobaltBrand: Story = {
  args: { defaultTheme: 'dark', brandPreset: 'Cobalt' },
  render: ({ defaultTheme, brandPreset }) => (
    <ClaimWidgetStoryCanvas
      dataTestId="ClaimWidget-cobalt"
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
  ),
}

export const TealBrand: Story = {
  args: { defaultTheme: 'dark', brandPreset: 'Teal' },
  render: ({ defaultTheme, brandPreset }) => (
    <ClaimWidgetStoryCanvas
      dataTestId="ClaimWidget-teal"
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
  ),
}
