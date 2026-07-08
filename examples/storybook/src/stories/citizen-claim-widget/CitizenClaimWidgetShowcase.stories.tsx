import type { Meta, StoryObj } from '@storybook/react'
import { CitizenClaimWidget } from '@goodwidget/citizen-claim-widget'
import { InjectedWalletStory } from '../helpers/citizenClaimWidgetStories'

const meta: Meta<typeof CitizenClaimWidget> = {
  title: 'Widgets/CitizenClaimWidget/Showcase',
  component: CitizenClaimWidget,
  tags: ['integrator', 'manual', 'showcase'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

export const InjectedWallet: Story = {
  render: () => <InjectedWalletStory />,
}
