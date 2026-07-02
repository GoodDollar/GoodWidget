import type { Meta, StoryObj } from '@storybook/react'
import { AiCreditsWidget } from '@goodwidget/ai-credits-widget'
import { InjectedWalletStory, MockBackendStory } from '../helpers/aiCreditsWidgetStories'

const meta: Meta<typeof AiCreditsWidget> = {
  title: 'Widgets/AiCreditsWidget/Showcase',
  component: AiCreditsWidget,
  tags: ['integrator', 'manual', 'showcase'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

export const MockBackend: Story = {
  name: 'Mock Backend (browser wallet)',
  render: () => <MockBackendStory />,
}

export const InjectedWallet: Story = {
  name: 'Injected Wallet',
  render: () => <InjectedWalletStory />,
}
