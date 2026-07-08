import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Card, Text, YStack } from '@goodwidget/ui'
import {
  GovernanceWidget,
  type GovernanceWidgetAdapterFactory,
  type GovernanceWidgetAdapterState,
  type GovernanceWidgetStatus,
} from '@goodwidget/governance-widget'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'

const meta: Meta<typeof GovernanceWidget> = {
  title: 'QA/GovernanceWidget Runtime Fixtures',
  component: GovernanceWidget,
  parameters: {
    layout: 'padded',
    goodWidgetProvider: { useShell: false, useProvider: false },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const connectedAddress = '0x4E5B2D7a45C2e31a8F0d09b4bE1fA11aD3aC9F08' as const

function createDashboard(overrides: Partial<GovernanceWidgetAdapterState['dashboard']> = {}) {
  return {
    impact: {
      title: 'Distributed',
      metrics: [
        { label: 'UBI Pool', amount: { value: 12400000, token: 'G$' } },
        {
          label: 'Impact Pool',
          amount: { value: 5234891, token: 'G$', isStreaming: true, streamLabel: 'Live stream active' },
        },
      ],
      description:
        'Empowering 640k+ people worldwide through transparent, decentralized funding for public goods.',
      ctaLabel: 'View Impact Report Q3',
    },
    activeMembers: {
      icon: 'check' as const,
      title: 'Active Members',
      amount: 12402,
      amountType: 'raw' as const,
      metadataType: 'time-window' as const,
      metadata: { label: 'Active members only', tone: 'muted' as const, icon: 'info' as const },
    },
    alignmentVoting: {
      voteId: 'alignment-current',
      title: 'Q3 House Of Alignment Funding Allocation',
      summaryLabel: 'Current top 3 voted',
      options: [
        { id: 'food-chain', label: 'Local Food Chain', percentage: 42 },
        { id: 'web3-literacy', label: 'Web3 Literacy', percentage: 31 },
        { id: 'civic-onboarding', label: 'Civic Onboarding', percentage: 27 },
      ],
      recipients: [],
      allocationsBps: { 'food-chain': 4200, 'web3-literacy': 3100, 'civic-onboarding': 2700 },
      allocationTotalBps: 10000,
      canVote: false,
      hasVoted: false,
      isVotingOpen: true,
      executed: false,
      disabledReason: 'Only active House of Alignment members can vote.',
    },
    fundingDistribution: {
      title: 'Funding distribution',
      centerLabel: 'Mocked pool total',
      totalAmount: { value: 450000, token: 'G$', isStreaming: true, streamLabel: 'Mock pool data' },
      projects: [
        { id: 'education', name: 'Education Hubs', amount: { value: 157500, token: 'G$' }, percentage: 35 },
        { id: 'merchant', name: 'Merchant Onboard', amount: { value: 112500, token: 'G$' }, percentage: 25 },
        { id: 'grants', name: 'Dev Grants', amount: { value: 90000, token: 'G$' }, percentage: 20 },
        { id: 'creator', name: 'Creator Fund', amount: { value: 90000, token: 'G$' }, percentage: 20 },
      ],
      isStreaming: true,
      emptyStateLabel: 'No active funding distribution yet.',
    },
    ...overrides,
  }
}

function createState(
  status: GovernanceWidgetStatus,
  overrides: Partial<GovernanceWidgetAdapterState> = {},
): GovernanceWidgetAdapterState {
  const isConnected = status !== 'disconnected'
  const member =
    status === 'active_citizenship' || status === 'active_alignment' || status === 'restake_required'
      ? {
          house: status === 'active_alignment' ? 'alignment' : 'citizenship',
          status: status === 'restake_required' ? 'unstaked' : 'active',
          stakedAmount: 250000000000000000000n,
          joinedAt: Date.UTC(2026, 0, 10),
          updatedAt: Date.UTC(2026, 2, 1),
          unstakedAt: status === 'restake_required' ? Date.UTC(2026, 5, 1) : null,
          name: status === 'active_alignment' ? 'Solar Commons' : 'Maya Citizen',
          socialLinks: 'https://twitter.com/gooddollar',
          projectWebpage: 'https://solar.example',
          missionStatement: 'Expand regenerative local access.',
          distributionStrategy: 'Allocate quarterly grants through community review.',
        }
      : null

  return {
    status,
    address: isConnected ? connectedAddress : null,
    chainId: status === 'unsupported_chain' ? 1 : 42220,
    identityStatus: status === 'onboarding_required' ? 'unverified' : 'verified',
    identityVerificationUrl: null,
    member,
    dashboard: createDashboard(),
    selectedHouse: 'citizenship',
    disabledHouseOptions: status === 'onboarding_required' ? ['alignment'] : [],
    onboardingStepId: undefined,
    profileDraft: {},
    stakeAmountLabel: '250 G$',
    transactionSteps: [
      { id: 'prepare', title: 'Prepare wallet balance', status: 'completed' },
      { id: 'approve', title: 'Approve governance stake', status: 'active' },
      { id: 'stake', title: 'Lock the membership stake', status: 'pending' },
      { id: 'finalize', title: 'Finalize governance access', status: 'pending' },
    ],
    registrationHash: null,
    error: null,
    ...overrides,
  }
}

function createAdapterFactory(state: GovernanceWidgetAdapterState): GovernanceWidgetAdapterFactory {
  return () => ({
    state,
    actions: {
      connect: async () => {},
      switchToCelo: async () => {},
      refresh: async () => {},
      retry: async () => {},
      selectHouse: () => {},
      register: async () => {},
      restake: async () => {},
      openVote: () => {},
      closeVote: () => {},
      setVoteAllocation: () => {},
      submitVote: async () => {},
      startIdentityVerification: async () => {},
    },
  })
}

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

export const DisconnectedDashboard: Story = {
  render: () => <RuntimeStory state={createState('disconnected')} />,
}

export const LoadingConnected: Story = {
  render: () => <RuntimeStory state={createState('loading')} />,
}

export const OnboardingRequiredHoaUnavailable: Story = {
  render: () => (
    <RuntimeStory
      state={createState('onboarding_required', {
        onboardingStepId: 'house',
        disabledHouseOptions: ['alignment'],
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
            disabledReason: 'No active Alignment recipients are available for this vote.',
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
            centerLabel: 'Mock pool unavailable',
            totalAmount: { value: 0, token: 'G$', streamLabel: 'Using mocked pool address' },
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

export const RestakeRequired: Story = {
  render: () => <RuntimeStory state={createState('restake_required')} />,
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
