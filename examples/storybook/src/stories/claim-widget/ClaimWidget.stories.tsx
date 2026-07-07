/**
 * ClaimWidget theme demo — a boilerplate claim-flow example used to demonstrate
 * the design-system preset and host override surface.
 *
 * These stories are intentionally stable so docs and screenshot automation can
 * verify the styling contract without depending on the runtime-heavy citizen flow.
 */
import type { Meta, StoryObj } from '@storybook/react'
import { ClaimWidget } from '@goodwidget/claim-widget-theme-demo'
import {
  ClaimWidgetStoryCanvas,
  cobaltOverrides,
  tealOverrides,
} from '../helpers/claimWidgetStories'

const meta: Meta<typeof ClaimWidget> = {
  title: 'Widgets/ClaimWidget Theme Demo/Showcase',
  component: ClaimWidget,
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  goodWidgetProvider: {
    disableProvider: true,
    useShell: false,
  },
}
export default meta

type Story = StoryObj<typeof ClaimWidget>

export const Default: Story = {
  render: () => <ClaimWidgetStoryCanvas dataTestId="ClaimWidget-default" />,
}

export const LightTheme: Story = {
  render: () => <ClaimWidgetStoryCanvas dataTestId="ClaimWidget-light" defaultTheme="light" />,
}

export const CobaltBrand: Story = {
  render: () => (
    <ClaimWidgetStoryCanvas
      dataTestId="ClaimWidget-cobalt"
      themeOverrides={cobaltOverrides}
    />
  ),
}

export const TealBrand: Story = {
  render: () => (
    <ClaimWidgetStoryCanvas
      dataTestId="ClaimWidget-teal"
      themeOverrides={tealOverrides}
    />
  ),
}
