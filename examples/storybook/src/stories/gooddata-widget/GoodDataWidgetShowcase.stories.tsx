import type { Meta, StoryObj } from '@storybook/react'
import { AiCreditsDashboard } from '@goodwidget/gooddata-widget'
import { AiCreditsDashboardLiveConnectorStory } from '../helpers/goodDataWidgetStories'

const meta: Meta<typeof AiCreditsDashboard> = {
  title: 'Widgets/GoodDataWidget/Showcase',
  component: AiCreditsDashboard,
  tags: ['integrator', 'manual', 'showcase'],
  args: {},
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<typeof AiCreditsDashboard>

/** Real `aiCredits` connector — fetches live analytics from the AntSeed Worker, not a fixture. */
export const LiveConnector: Story = {
  name: 'Live Connector',
  render: () => <AiCreditsDashboardLiveConnectorStory />,
}
