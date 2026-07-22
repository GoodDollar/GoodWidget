import type { Meta, StoryObj } from '@storybook/react'
import { CitizenClaimWidget } from '@goodwidget/citizen-claim-widget'
import {
  CustodialLocalFixtureStory,
  InviteCollectableStory,
  InviteErrorStory,
  InvitePendingStory,
  InviteReadyStory,
  InviteSuccessStory,
} from '../helpers/citizenClaimWidgetStories'

const meta: Meta<typeof CitizenClaimWidget> = {
  title: 'QA/CitizenClaimWidget/Runtime Fixtures',
  component: CitizenClaimWidget,
  tags: ['autodocs', 'qa'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

export const CustodialLocalFixture: Story = {
  render: () => <CustodialLocalFixtureStory />,
}

export const InviteReady: Story = {
  render: () => <InviteReadyStory />,
}

export const InvitePending: Story = {
  render: () => <InvitePendingStory />,
}

export const InviteCollectable: Story = {
  render: () => <InviteCollectableStory />,
}

export const InviteSuccess: Story = {
  render: () => <InviteSuccessStory />,
}

export const InviteError: Story = {
  render: () => <InviteErrorStory />,
}
