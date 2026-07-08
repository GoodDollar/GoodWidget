import type { Meta, StoryObj } from '@storybook/react'
import { StakingMigrationWidget } from '@goodwidget/staking-migration-widget'
import { InjectedWalletStory } from '../helpers/stakingMigrationWidgetStories'

const meta: Meta<typeof StakingMigrationWidget> = {
  title: 'Widgets/StakingMigrationWidget/Showcase',
  component: StakingMigrationWidget,
  tags: ['integrator', 'manual', 'showcase'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

export const InjectedWallet: Story = {
  parameters: {
    goodWidgetProvider: {
      useShell: false,
    },
  },
  render: () => <InjectedWalletStory />,
}
