import type { Meta, StoryObj } from '@storybook/react'
import { StakingMigrationWidget } from '@goodwidget/staking-migration-widget'
import {
  ApprovalPendingStory,
  EmptyBalanceStory,
  ErrorStateStory,
  LightThemeReadyStory,
  MigratingStory,
  ReadyStory,
  SuccessStory,
  WrongNetworkStory,
} from '../helpers/stakingMigrationWidgetStories'

const meta: Meta<typeof StakingMigrationWidget> = {
  title: 'QA/StakingMigrationWidget/Runtime Fixtures',
  component: StakingMigrationWidget,
  tags: ['autodocs', 'qa'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

export const EmptyBalance: Story = {
  render: () => <EmptyBalanceStory />,
}

export const Ready: Story = {
  render: () => <ReadyStory />,
}

export const WrongNetwork: Story = {
  render: () => <WrongNetworkStory />,
}

export const ApprovalPending: Story = {
  render: () => <ApprovalPendingStory />,
}

export const Migrating: Story = {
  render: () => <MigratingStory />,
}

export const Success: Story = {
  render: () => <SuccessStory />,
}

export const ErrorState: Story = {
  render: () => <ErrorStateStory />,
}

export const LightThemeReady: Story = {
  parameters: {
    goodWidgetProvider: {
      useShell: false,
    },
  },
  render: () => <LightThemeReadyStory />,
}
