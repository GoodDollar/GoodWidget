import type { Meta, StoryObj } from '@storybook/react'
import { SuperfluidCampaignWidget } from '@goodwidget/superfluid-campaign-widget'
import { LiveDataNoWalletStory } from '../helpers/superfluidCampaignWidgetStories'

const meta: Meta<typeof SuperfluidCampaignWidget> = {
  title: 'Widgets/SuperfluidCampaignWidget/API Contracts',
  component: SuperfluidCampaignWidget,
  tags: ['integration'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

/** Production Points runtime; Playwright intercepts responses to validate mapping. */
export const LeaderboardApiContract: Story = {
  render: () => <LiveDataNoWalletStory initialView="leaderboard" />,
}

/** Production programs runtime; Playwright intercepts responses to validate mapping. */
export const SupTotalsProgramsApiContract: Story = {
  render: () => <LiveDataNoWalletStory initialView="content" />,
}
