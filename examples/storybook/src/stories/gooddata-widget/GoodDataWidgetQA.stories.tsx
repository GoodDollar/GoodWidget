import type { Meta, StoryObj } from '@storybook/react'
import { AiCreditsDashboard } from '@goodwidget/gooddata-widget'
import {
  AiCreditsDashboardLoadingStory,
  AiCreditsDashboardLiveStory,
  AiCreditsDashboardDemoStory,
  AiCreditsDashboardLiveUnavailableStory,
  AiCreditsDashboardEmptyStory,
  AiCreditsDashboardRealisticVolumeStory,
} from '../helpers/goodDataWidgetStories'

const meta: Meta<typeof AiCreditsDashboard> = {
  title: 'QA/AiCreditsDashboard/Runtime Fixtures',
  component: AiCreditsDashboard,
  tags: ['autodocs', 'qa'],
  args: {},
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof AiCreditsDashboard>

export const Loading: Story = {
  render: () => <AiCreditsDashboardLoadingStory />,
}

export const Live: Story = {
  render: () => <AiCreditsDashboardLiveStory />,
}

export const Demo: Story = {
  render: () => <AiCreditsDashboardDemoStory />,
}

/** 30-day fixture shaped after real production magnitudes (sparse large deposit spikes vs a narrow, independently-moving streamed band) — exercises the G$ Volume chart's secondaryYAxis beyond the smooth demo ramp. */
export const RealisticVolume: Story = {
  render: () => <AiCreditsDashboardRealisticVolumeStory />,
}

export const LiveUnavailable: Story = {
  render: () => <AiCreditsDashboardLiveUnavailableStory />,
}

export const Empty: Story = {
  render: () => <AiCreditsDashboardEmptyStory />,
}
