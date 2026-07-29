import type { Meta, StoryObj } from '@storybook/react'
import { SuperfluidCampaignWidget } from '@goodwidget/superfluid-campaign-widget'
import { InjectedWalletStory } from '../helpers/superfluidCampaignWidgetStories'

const meta: Meta<typeof SuperfluidCampaignWidget> = {
  title: 'Widgets/SuperfluidCampaignWidget/Showcase',
  component: SuperfluidCampaignWidget,
  tags: ['integrator', 'manual', 'showcase'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

export const InjectedWallet: Story = {
  render: () => <InjectedWalletStory />,
}
