import type { Meta, StoryObj } from '@storybook/react'
import { ConnectAWalletWidget } from '@goodwidget/connect-a-wallet-widget'
import {
  CheckingAddressStory,
  ConnectedNoInputStory,
  ConnectingStory,
  NotConnectedStory,
  ReadyMixedRowStatusesStory,
  TopLevelErrorWithRetryStory,
  UnsupportedNetworkStory,
} from '../helpers/connectAWalletWidgetStories'

const meta: Meta<typeof ConnectAWalletWidget> = {
  title: 'QA/ConnectAWalletWidget/Runtime Fixtures',
  component: ConnectAWalletWidget,
  tags: ['autodocs', 'qa'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

export const NotConnected: Story = {
  render: () => <NotConnectedStory />,
}

export const Connecting: Story = {
  render: () => <ConnectingStory />,
}

export const ConnectedNoInput: Story = {
  render: () => <ConnectedNoInputStory />,
}

export const CheckingAddress: Story = {
  render: () => <CheckingAddressStory />,
}

export const ReadyMixedRowStatuses: Story = {
  render: () => <ReadyMixedRowStatusesStory />,
}

export const UnsupportedNetwork: Story = {
  render: () => <UnsupportedNetworkStory />,
}

export const TopLevelErrorWithRetry: Story = {
  render: () => <TopLevelErrorWithRetryStory />,
}
