import type { Meta, StoryObj } from '@storybook/react'
import { AiCreditsWidget } from '@goodwidget/ai-credits-widget'
import { InjectedWalletStory } from '../helpers/aiCreditsWidgetStories'

const meta: Meta<typeof AiCreditsWidget> = {
  title: 'Widgets/AiCreditsWidget/Showcase',
  component: AiCreditsWidget,
  tags: ['integrator', 'manual', 'showcase'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

/** Live wallet integration showcase — requires an injected EIP-1193 wallet */
export const InjectedWallet: Story = {
  render: () => <InjectedWalletStory />,
}
