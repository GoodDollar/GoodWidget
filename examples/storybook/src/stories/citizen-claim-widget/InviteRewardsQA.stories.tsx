import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import { InviteRewardsFixtureStory } from '../helpers/inviteRewardsStories'

const meta: Meta<typeof InviteRewardsFixtureStory> = {
  title: 'QA/CitizenClaimWidget/Invite Rewards Fixtures',
  component: InviteRewardsFixtureStory,
  tags: ['autodocs', 'qa'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Static states ─────────────────────────────────────────────────────────

export const Loading: Story = {
  render: () => <InviteRewardsFixtureStory fixture="loading" dataTestId="InviteRewards-loading" />,
}

export const Disconnected: Story = {
  render: () => <InviteRewardsFixtureStory fixture="disconnected" dataTestId="InviteRewards-disconnected" />,
}

export const UnsupportedNetwork: Story = {
  render: () => <InviteRewardsFixtureStory fixture="unsupported" dataTestId="InviteRewards-unsupported" />,
}

export const ErrorNoData: Story = {
  render: () => <InviteRewardsFixtureStory fixture="errorNoData" dataTestId="InviteRewards-error" />,
}

export const Empty: Story = {
  render: () => <InviteRewardsFixtureStory fixture="empty" dataTestId="InviteRewards-empty" />,
}

export const PendingOnly: Story = {
  render: () => <InviteRewardsFixtureStory fixture="pendingOnly" dataTestId="InviteRewards-pending" />,
}

export const Collectable: Story = {
  render: () => <InviteRewardsFixtureStory fixture="collectable" dataTestId="InviteRewards-collectable" />,
}

export const JoinSuccessAfterCardHidden: Story = {
  render: () => <InviteRewardsFixtureStory fixture="joinSuccess" dataTestId="InviteRewards-join-success" />,
}

export const CollectSuccess: Story = {
  render: () => <InviteRewardsFixtureStory fixture="collectSuccess" dataTestId="InviteRewards-collect-success" />,
}

export const CollectError: Story = {
  render: () => <InviteRewardsFixtureStory fixture="collectError" dataTestId="InviteRewards-collect-error" />,
}

// ─── Interactive flows — demonstrate the deferred-inviter and ───────────────
// collection-ready paths end-to-end without a live wallet/contract.

export const DeferredInviterJoinFlow: Story = {
  render: () => (
    <InviteRewardsFixtureStory fixture="collectable" dataTestId="InviteRewards-deferred-join-flow" />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // The join card is offered because invitedBy is empty and the bounty is unpaid.
    await expect(canvas.getByText('Have an invite code?')).toBeVisible()

    const input = canvas.getByPlaceholderText('Invite code')
    await userEvent.type(input, 'friendcode123')
    await userEvent.click(canvas.getByRole('button', { name: /join with code/i }))

    // Success is shown, and reusing the same runtime, the join card disappears
    // once an inviter is attached — yet the success banner must remain visible.
    // The mock action resolves asynchronously, so use findByText (auto-retrying)
    // rather than getByText (synchronous) to avoid a race with the state update.
    await expect(await canvas.findByText('Joined inviter successfully.')).toBeVisible()
    await expect(canvas.queryByText('Have an invite code?')).not.toBeInTheDocument()
  },
}

export const CollectionReadyFlow: Story = {
  render: () => (
    <InviteRewardsFixtureStory fixture="collectable" dataTestId="InviteRewards-collection-ready-flow" />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const collectButton = canvas.getByRole('button', { name: /collect eligible rewards/i })
    await expect(collectButton).toBeEnabled()
    await expect(canvas.getByText('Ready to collect')).toBeVisible()

    await userEvent.click(collectButton)

    // The mock action resolves asynchronously, so use findByText (auto-retrying)
    // rather than getByText (synchronous) to avoid a race with the state update.
    await expect(await canvas.findByText('Invite rewards collected successfully.')).toBeVisible()
    // Once collected, the same button is disabled again until a new invitee is ready.
    await expect(canvas.getByRole('button', { name: /collect eligible rewards/i })).toBeDisabled()
  },
}

export const CollectionNotReadyFlow: Story = {
  render: () => <InviteRewardsFixtureStory fixture="pendingOnly" dataTestId="InviteRewards-not-ready-flow" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // No collectable invitees — the collect action must stay disabled.
    await expect(canvas.getByRole('button', { name: /collect eligible rewards/i })).toBeDisabled()
    await expect(canvas.queryByText('Ready to collect')).not.toBeInTheDocument()
  },
}
