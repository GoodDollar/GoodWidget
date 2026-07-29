import type { Meta, StoryObj } from '@storybook/react'
import { SuperfluidCampaignWidget } from '@goodwidget/superfluid-campaign-widget'
import { CustodialLocalFixtureStory, NoWalletStory } from '../helpers/superfluidCampaignWidgetStories'

const meta: Meta<typeof SuperfluidCampaignWidget> = {
  title: 'QA/SuperfluidCampaignWidget/Runtime Fixtures',
  component: SuperfluidCampaignWidget,
  tags: ['autodocs', 'qa'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

export const NoWalletContent: Story = {
  render: () => <NoWalletStory initialView="content" />,
}

export const NoWalletLeaderboard: Story = {
  render: () => <NoWalletStory initialView="leaderboard" />,
}

export const CustodialLocalFixtureContent: Story = {
  render: () => <CustodialLocalFixtureStory initialView="content" />,
}

export const CustodialLocalFixtureLeaderboard: Story = {
  render: () => <CustodialLocalFixtureStory initialView="leaderboard" />,
}
