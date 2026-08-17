import React, { useEffect, useRef } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Card, Text, YStack } from '@goodwidget/ui'
import { GovernanceWidget, type GovernanceWidgetAdapterState } from '@goodwidget/governance-widget'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'
import {
  createInteractiveGovernanceEnvironment,
  type InteractiveGovernanceEnvironment,
} from '../../fixtures/governanceInteractiveMock'
import {
  alignmentRecipients,
  createAdapterFactory,
  createDashboard,
  createState,
} from '../helpers/governanceWidgetStories'

const meta: Meta<typeof GovernanceWidget> = {
  title: 'QA/GovernanceWidget/Runtime Fixtures',
  component: GovernanceWidget,
  tags: ['autodocs', 'qa'],
  parameters: {
    layout: 'padded',
    goodWidgetProvider: { useShell: false, useProvider: false },
  },
}

export default meta
type Story = StoryObj<typeof meta>

function RuntimeStory({
  state,
  defaultTheme = 'light',
  useInjectedProvider = false,
}: {
  state: GovernanceWidgetAdapterState
  defaultTheme?: 'light' | 'dark'
  useInjectedProvider?: boolean
}) {
  const injectedProvider = getInjectedEip1193Provider()

  if (useInjectedProvider && !isInjectedProviderUsable(injectedProvider)) {
    return (
      <YStack width={440} gap="$3" data-testid="GovernanceWidget-injected-provider-missing">
        <Card>
          <Text bold>No injected wallet found</Text>
          <Text tone="secondary">Install or enable an injected EIP-1193 wallet, then refresh Storybook.</Text>
        </Card>
      </YStack>
    )
  }

  const provider = useInjectedProvider ? injectedProvider : createCustodialEip1193Provider()

  return (
    <GovernanceWidget
      provider={provider}
      defaultTheme={defaultTheme}
      adapterFactory={createAdapterFactory(state)}
      testId={`GovernanceWidget-${state.status}`}
    />
  )
}

// Uses the real useGovernanceAdapter runtime (no adapterFactory override) against a
// browser-native mocked Celo RPC + Superfluid subgraph, so a human can drive the full
// onboarding -> vote -> unstake flow directly in Storybook, not just under Playwright.
function LiveMockedDataFlowStory() {
  const environmentRef = useRef<InteractiveGovernanceEnvironment | null>(null)
  if (!environmentRef.current) environmentRef.current = createInteractiveGovernanceEnvironment()

  useEffect(() => {
    const environment = environmentRef.current
    return () => environment?.teardown()
  }, [])

  const { provider, celoRpcUrl, addresses } = environmentRef.current

  return (
    <GovernanceWidget
      provider={provider}
      celoRpcUrl={celoRpcUrl}
      addresses={addresses}
      testId="GovernanceWidget-live-mocked-flow"
    />
  )
}

export const DisconnectedDashboard: Story = {
  render: () => <RuntimeStory state={createState('disconnected')} />,
}

export const LoadingConnected: Story = {
  render: () => <RuntimeStory state={createState('loading')} />,
}

export const OnboardingHouseSelection: Story = {
  render: () => (
    <RuntimeStory
      state={createState('onboarding_required', {
        onboardingStepId: 'house',
        identityStatus: 'verified',
      })}
    />
  ),
}

export const PendingAlignment: Story = {
  render: () => <RuntimeStory state={createState('pending_alignment')} />,
}

export const ActiveCitizenship: Story = {
  render: () => <RuntimeStory state={createState('active_citizenship')} />,
}

export const UpcomingVote: Story = {
  render: () => (
    <RuntimeStory
      state={createState('active_citizenship', {
        dashboard: createDashboard({
          alignmentVoting: {
            ...createDashboard().alignmentVoting,
            title: 'Upcoming Alignment vote',
            summaryLabel: 'Next window starts Aug 1, 2026',
            isVotingOpen: false,
            canVote: false,
            disabledReason: 'Voting is currently closed.',
          },
        }),
      })}
    />
  ),
}

export const ActiveAlignmentInjected: Story = {
  render: () => (
    <RuntimeStory
      useInjectedProvider
      defaultTheme="dark"
      state={createState('active_alignment', {
        dashboard: createDashboard({
          alignmentVoting: {
            ...createDashboard().alignmentVoting,
            canVote: true,
            disabledReason: undefined,
          },
        }),
      })}
    />
  ),
}

export const VoteDetailOpen: Story = {
  render: () => (
    <RuntimeStory
      state={createState('vote_detail', {
        member: createState('active_alignment').member,
        dashboard: createDashboard({
          alignmentVoting: {
            ...createDashboard().alignmentVoting,
            canVote: true,
            disabledReason: undefined,
          },
        }),
      })}
    />
  ),
}

export const AlreadyVoted: Story = {
  render: () => (
    <RuntimeStory
      state={createState('active_alignment', {
        dashboard: createDashboard({
          alignmentVoting: {
            ...createDashboard().alignmentVoting,
            hasVoted: true,
            canVote: false,
            disabledReason: 'You already voted in this allocation cycle.',
          },
        }),
      })}
    />
  ),
}

export const VoteClosedExecuted: Story = {
  render: () => (
    <RuntimeStory
      state={createState('active_alignment', {
        dashboard: createDashboard({
          alignmentVoting: {
            ...createDashboard().alignmentVoting,
            isVotingOpen: false,
            executed: true,
            canVote: false,
            summaryLabel: 'Final units executed',
            finalizedUnits: {
              [alignmentRecipients[0]]: '420000',
              [alignmentRecipients[1]]: '310000',
              [alignmentRecipients[2]]: '270000',
            },
            disabledReason: 'Voting has closed and final FlowSplitter units are read-only.',
          },
        }),
      })}
    />
  ),
}

export const EmptyRecipients: Story = {
  render: () => (
    <RuntimeStory
      state={createState('active_alignment', {
        dashboard: createDashboard({
          alignmentVoting: {
            ...createDashboard().alignmentVoting,
            options: [],
            recipients: [],
            canVote: false,
            disabledReason: 'No House of Alignment members have been assigned yet. Voting will open shortly.',
          },
        }),
      })}
    />
  ),
}

export const PoolUnavailableMocked: Story = {
  render: () => (
    <RuntimeStory
      state={createState('active_citizenship', {
        dashboard: createDashboard({
          fundingDistribution: {
            ...createDashboard().fundingDistribution,
            centerLabel: 'Funding unavailable',
            totalAmount: { value: 0, token: 'G$', streamLabel: 'Superfluid fixture unavailable' },
            projects: [],
          },
        }),
      })}
    />
  ),
}

export const UnsupportedChain: Story = {
  render: () => <RuntimeStory state={createState('unsupported_chain')} />,
}

export const ActiveMembershipUnstakeReady: Story = {
  render: () => (
    <RuntimeStory
      state={createState('active_citizenship', {
        unstakeAvailability: {
          canUnstake: true,
          unlockAt: Date.UTC(2026, 3, 1, 12),
        },
      })}
    />
  ),
}

export const UnstakeWalletConfirmation: Story = {
  render: () => (
    <RuntimeStory
      state={createState('active_alignment', {
        transaction: {
          kind: 'unstake',
          status: 'wallet_confirmation',
          hash: null,
          error: null,
        },
        unstakeAvailability: { canUnstake: true, unlockAt: Date.UTC(2026, 3, 1, 12) },
      })}
    />
  ),
}

export const UnstakeSubmitted: Story = {
  render: () => (
    <RuntimeStory
      state={createState('active_alignment', {
        transaction: {
          kind: 'unstake',
          status: 'submitted',
          hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          error: null,
        },
        unstakeAvailability: { canUnstake: true, unlockAt: Date.UTC(2026, 3, 1, 12) },
      })}
    />
  ),
}

export const UnstakeRejected: Story = {
  render: () => (
    <RuntimeStory
      state={createState('active_citizenship', {
        transaction: {
          kind: 'unstake',
          status: 'rejected',
          hash: null,
          error: 'Transaction rejected in the wallet.',
        },
        unstakeAvailability: { canUnstake: true, unlockAt: Date.UTC(2026, 3, 1, 12) },
      })}
    />
  ),
}

export const UnstakeReverted: Story = {
  render: () => (
    <RuntimeStory
      state={createState('active_citizenship', {
        transaction: {
          kind: 'unstake',
          status: 'reverted',
          hash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          error: 'The governance contract rejected this action. Review your details and try again.',
        },
        unstakeAvailability: { canUnstake: true, unlockAt: Date.UTC(2026, 3, 1, 12) },
      })}
    />
  ),
}

export const UnstakedReturnsToOnboarding: Story = {
  render: () => (
    <RuntimeStory
      state={createState('onboarding_required', {
        identityStatus: 'verified',
        lifecycleNotice: 'Membership unstaked successfully. You can now join a governance house again.',
      })}
    />
  ),
}

export const RevokedMembership: Story = {
  render: () => <RuntimeStory state={createState('revoked')} />,
}

export const FriendlyContractError: Story = {
  render: () => (
    <RuntimeStory
      state={createState('friendly_error', {
        error: 'The governance contract rejected this action. Review your details and try again.',
      })}
    />
  ),
}

// Real useGovernanceAdapter runtime (no adapterFactory override), but network mocking is
// left entirely to the caller: Playwright's runtime.spec.ts drives this story via its own
// page.route interception of `/mock-governance-rpc` and injects window.ethereum itself, so
// it can pause/resume reads and receipts mid-test. Kept distinct from LiveMockedDataFlow
// below, which is self-contained and meant for a human to open directly in Storybook.
export const RealAdapterMockedRuntime: Story = {
  render: () => {
    const injectedProvider = getInjectedEip1193Provider()
    const provider = isInjectedProviderUsable(injectedProvider)
      ? injectedProvider
      : createCustodialEip1193Provider()

    return (
      <GovernanceWidget
        provider={provider}
        celoRpcUrl="/mock-governance-rpc"
        addresses={{
          housesAddress: '0x4444444444444444444444444444444444444444',
          goodIdAddress: '0x5555555555555555555555555555555555555555',
        }}
        testId="GovernanceWidget-real-adapter"
      />
    )
  },
}

// The live testable flow with mocked data: separated from GovernanceWidgetShowcase (which
// always uses a real wallet against the real contract), and separated from the static
// fixtures above (which never touch useGovernanceAdapter). Self-contained mocked RPC +
// wallet, so a human can drive it directly in Storybook without Playwright.
export const LiveMockedDataFlow: Story = {
  render: () => <LiveMockedDataFlowStory />,
}
