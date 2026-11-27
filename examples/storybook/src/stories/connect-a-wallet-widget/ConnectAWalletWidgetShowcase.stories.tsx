import type { Meta, StoryObj } from '@storybook/react'
import { ConnectAWalletWidget } from '@goodwidget/connect-a-wallet-widget'
import { InjectedWalletStory } from '../helpers/connectAWalletWidgetStories'

const meta: Meta<typeof ConnectAWalletWidget> = {
  title: 'Widgets/ConnectAWalletWidget/Showcase',
  component: ConnectAWalletWidget,
  tags: ['integrator', 'manual', 'showcase'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

export const InjectedWallet: Story = {
  render: () => <InjectedWalletStory />,
}
