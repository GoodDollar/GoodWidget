import type { GoodWidgetThemeOverrides } from '@goodwidget/core'
import {
  GovernanceWidget,
  type GovernanceWidgetAdapterFactory,
  type GovernanceWidgetAdapterState,
  type GovernanceWidgetStatus,
} from '@goodwidget/governance-widget'

const connectedAddress = '0x4E5B2D7a45C2e31a8F0d09b4bE1fA11aD3aC9F08' as const
export const alignmentRecipients = [
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222',
  '0x3333333333333333333333333333333333333333',
] as const

export function createDashboard(
  overrides: Partial<GovernanceWidgetAdapterState['dashboard']> = {},
): GovernanceWidgetAdapterState['dashboard'] {
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
        { id: alignmentRecipients[0], label: 'Local Food Chain', percentage: 42 },
        { id: alignmentRecipients[1], label: 'Web3 Literacy', percentage: 31 },
        { id: alignmentRecipients[2], label: 'Civic Onboarding', percentage: 27 },
      ],
      recipients: [...alignmentRecipients],
      allocationsBps: {
        [alignmentRecipients[0]]: 4200,
        [alignmentRecipients[1]]: 3100,
        [alignmentRecipients[2]]: 2700,
      },
      allocationTotalBps: 10000,
      canVote: false,
      hasVoted: false,
      isVotingOpen: true,
      executed: false,
      finalizedUnits: {},
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

export function createState(
  status: GovernanceWidgetStatus,
  overrides: Partial<GovernanceWidgetAdapterState> = {},
): GovernanceWidgetAdapterState {
  const isConnected = status !== 'disconnected'
  const member: GovernanceWidgetAdapterState['member'] =
    status === 'active_citizenship' || status === 'active_alignment' || status === 'revoked'
      ? {
          house: status === 'active_alignment' ? 'alignment' : 'citizenship',
          status: status === 'revoked' ? 'revoked' : 'active',
          stakedAmount: 250000000000000000000n,
          joinedAt: Date.UTC(2026, 0, 10),
          updatedAt: Date.UTC(2026, 2, 1),
          unstakedAt: null,
          memberIndex: 0n,
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
    onboardingStepId: undefined,
    profileDraft: {},
    stakeAmountLabel: '250 G$',
    minimumStakeAmounts: { citizenship: 250000000000000000000n, alignment: 500000000000000000000n },
    transactionSteps: [
      { id: 'prepare', title: 'Prepare wallet balance', status: 'completed' },
      { id: 'approve', title: 'Approve governance stake', status: 'active' },
      { id: 'stake', title: 'Lock the membership stake', status: 'pending' },
      { id: 'finalize', title: 'Finalize governance access', status: 'pending' },
    ],
    registrationHash: null,
    transaction: { kind: null, status: 'idle', hash: null, error: null },
    unstakeAvailability: {
      canUnstake: false,
      unlockAt: Date.UTC(2026, 8, 1, 12),
      disabledReason: 'Membership remains locked until the current governance term has passed.',
    },
    lifecycleNotice: null,
    error: null,
    ...overrides,
  }
}

export function createAdapterFactory(state: GovernanceWidgetAdapterState): GovernanceWidgetAdapterFactory {
  return () => ({
    state,
    actions: {
      connect: async () => {},
      switchToCelo: async () => {},
      refresh: async () => {},
      retry: async () => {},
      selectHouse: () => {},
      register: async () => {},
      unstake: async () => {},
      openVote: () => {},
      closeVote: () => {},
      setVoteAllocation: () => {},
      submitVote: async () => {},
      startIdentityVerification: async () => {},
    },
  })
}

// A single fully-populated dashboard state (active alignment member, open vote, live funding
// distribution) used by the theme-overrides Playground so every themeable governance surface
// (GovernanceWrapper, ImpactCard, ImpactCardAction, the shared BalanceCard/Button) renders at
// once behind a mocked adapterFactory — no wallet or network required.
export function ThemedDashboardStory({
  themeOverrides,
  defaultTheme = 'dark',
}: {
  themeOverrides?: GoodWidgetThemeOverrides
  defaultTheme?: 'light' | 'dark'
}) {
  const state = createState('active_alignment', {
    dashboard: createDashboard({
      alignmentVoting: {
        ...createDashboard().alignmentVoting,
        canVote: true,
        disabledReason: undefined,
      },
    }),
  })

  return (
    <GovernanceWidget
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
      adapterFactory={createAdapterFactory(state)}
      testId="GovernanceWidget-theme-overrides-playground"
    />
  )
}
