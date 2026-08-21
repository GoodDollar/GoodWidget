import type { Meta, StoryObj } from '@storybook/react'
import { AiCreditsDashboard } from '@goodwidget/gooddata-widget'
import {
  AiCreditsDashboardLoadingStory,
  AiCreditsDashboardLiveStory,
  AiCreditsDashboardDemoStory,
  AiCreditsDashboardLiveUnavailableStory,
  AiCreditsDashboardEmptyStory,
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

export const LiveUnavailable: Story = {
  render: () => <AiCreditsDashboardLiveUnavailableStory />,
}

export const Empty: Story = {
  render: () => <AiCreditsDashboardEmptyStory />,
}
