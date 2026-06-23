import type { Meta, StoryObj } from '@storybook/react'
import { StreamingWidget } from '@goodwidget/streaming-widget'
import {
  BaseSupBalanceAndReserveStory,
  CreateUpdateFailureStory,
  CreateUpdateFormStory,
  CreateUpdateInvalidInputStory,
  CreateUpdatePendingStory,
  CreateUpdateSuccessStory,
  CustodialLocalFixtureStory,
  EmptyStateStory,
  ErrorStateStory,
  LoadingStateStory,
  NoWalletStory,
  NonBaseSupReserveDisabledStory,
  PoolClaimableAmountErrorStory,
  PoolClaimErrorStory,
  PoolClaimPendingStory,
  PoolClaimStateStory,
  PoolClaimSuccessStory,
  PoolConnectedStateStory,
  PopulatedStateStory,
  WrongChainStory,
} from '../helpers/streamingWidgetStories'

const meta: Meta<typeof StreamingWidget> = {
  title: 'QA/StreamingWidget/Runtime Fixtures',
  component: StreamingWidget,
  tags: ['autodocs', 'qa'],
  parameters: {
    layout: 'padded',
    goodWidgetProvider: {
      defaultTheme: 'light',
      useShell: false,
    },
  },
  argTypes: {
    apiKey: {
      control: 'text',
      name: 'TheGraph API key',
      description:
        'Optional TheGraph key passed to the SDK-backed streaming adapter for Base SUP reserve queries.',
    },
  },
  args: {
    apiKey: '',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const CustodialLocalFixture: Story = {
  render: ({ apiKey }) => <CustodialLocalFixtureStory apiKey={apiKey} />,
}

export const NoWallet: Story = {
  render: () => <NoWalletStory />,
}

export const WrongChain: Story = {
  render: () => <WrongChainStory />,
}

export const LoadingState: Story = {
  render: () => <LoadingStateStory />,
}

export const EmptyState: Story = {
  render: () => <EmptyStateStory />,
}

export const ErrorState: Story = {
  render: () => <ErrorStateStory />,
}

export const PopulatedState: Story = {
  render: () => <PopulatedStateStory />,
}

export const CreateUpdateForm: Story = {
  render: () => <CreateUpdateFormStory />,
}

export const CreateUpdateInvalidInput: Story = {
  render: () => <CreateUpdateInvalidInputStory />,
}

export const CreateUpdatePending: Story = {
  render: () => <CreateUpdatePendingStory />,
}

export const CreateUpdateSuccess: Story = {
  render: () => <CreateUpdateSuccessStory />,
}

export const CreateUpdateFailure: Story = {
  render: () => <CreateUpdateFailureStory />,
}

export const PoolClaimState: Story = {
  render: () => <PoolClaimStateStory />,
}

export const PoolConnectedState: Story = {
  render: () => <PoolConnectedStateStory />,
}

export const PoolClaimPending: Story = {
  render: () => <PoolClaimPendingStory />,
}

export const PoolClaimSuccess: Story = {
  render: () => <PoolClaimSuccessStory />,
}

export const PoolClaimError: Story = {
  render: () => <PoolClaimErrorStory />,
}

export const PoolClaimableAmountError: Story = {
  render: () => <PoolClaimableAmountErrorStory />,
}

export const BaseSupBalanceAndReserve: Story = {
  render: () => <BaseSupBalanceAndReserveStory />,
}

export const NonBaseSupReserveDisabled: Story = {
  render: () => <NonBaseSupReserveDisabledStory />,
}
