import type { Meta, StoryObj } from '@storybook/react'
import { TamaguiProvider } from '@tamagui/core'
import { GoodDataWidget, AiCreditsDashboard, registerDashboard } from '@goodwidget/gooddata-widget'
import { defaultConfig } from '@goodwidget/ui'
import {
  AiCreditsDashboardLoadingStory,
  AiCreditsDashboardLiveStory,
  AiCreditsDashboardDemoStory,
  AiCreditsDashboardLiveUnavailableStory,
  AiCreditsDashboardEmptyStory,
} from '../helpers/goodDataWidgetStories'

registerDashboard({
  id: 'gooddata-version-demo',
  path: 'gooddata-version-demo',
  label: 'AI Credits Analytics',
  component: AiCreditsDashboardDemoStory,
})

const meta: Meta<typeof AiCreditsDashboard> = {
  title: 'QA/GoodDataWidget/Runtime Fixtures',
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

export const GoodDataWidgetVersion: Story = {
  render: () => (
    <TamaguiProvider config={defaultConfig} defaultTheme="dark">
      <GoodDataWidget />
    </TamaguiProvider>
  ),
}
