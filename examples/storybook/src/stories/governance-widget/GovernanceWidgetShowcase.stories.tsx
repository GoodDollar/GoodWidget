import { useCallback, useMemo, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Card, Text, YStack } from '@goodwidget/ui'
import {
  GovernanceWidget,
  type GovernanceWidgetAdapterActions,
  type GovernanceWidgetAdapterState,
} from '@goodwidget/governance-widget'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import {
  alignmentRecipients,
  createDashboard,
  createState,
} from '../helpers/governanceWidgetStories'

// The GoodDaoHouses contract is not yet on the production Celo deployment — this is the
// `development-celo` address recorded in GoodProtocol PR #300 (GoodProtocol PR #299 has the
// final contract build this widget targets). FlowSplitter isn't wired to this deployment yet,
// so the funding-distribution chart is expected to render its empty state here.
const DEV_CELO_HOUSES_ADDRESS = '0x4Bc3Cdc036f21b68E034C0f1d90775fc3D725735' as const

interface GovernanceWidgetStoryArgs {
  defaultTheme: 'light' | 'dark'
}

const meta: Meta<GovernanceWidgetStoryArgs> = {
  title: 'Widgets/GovernanceWidget/Showcase',
  component: GovernanceWidget,
  tags: ['integrator', 'manual', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    defaultTheme: {
      control: 'radio',
      options: ['dark', 'light'],
      description: 'Base theme applied via the widget’s own defaultTheme prop.',
    },
  },
  args: {
    defaultTheme: 'light',
  },
}

export default meta
type Story = StoryObj<GovernanceWidgetStoryArgs>

function InjectedWalletStory({ defaultTheme }: GovernanceWidgetStoryArgs) {
  const injectedProvider = getInjectedEip1193Provider()

  if (!isInjectedProviderUsable(injectedProvider)) {
    return (
      <YStack width={440} gap="$3" data-testid="GovernanceWidget-showcase-no-wallet">
        <Card>
          <Text bold>No injected wallet found</Text>
          <Text tone="secondary">
            Install or enable an injected EIP-1193 wallet on Celo, then refresh Storybook.
          </Text>
        </Card>
      </YStack>
    )
  }

  return (
    <GovernanceWidget
      provider={injectedProvider}
      defaultTheme={defaultTheme}
      addresses={{ housesAddress: DEV_CELO_HOUSES_ADDRESS }}
      testId="GovernanceWidget-showcase-injected"
    />
  )
}

function CustodialWalletStory({ defaultTheme }: GovernanceWidgetStoryArgs) {
  try {
    const provider = createCustodialEip1193Provider()

    return (
      <GovernanceWidget
        provider={provider}
        defaultTheme={defaultTheme}
        addresses={{ housesAddress: DEV_CELO_HOUSES_ADDRESS }}
        testId="GovernanceWidget-showcase-custodial"
      />
    )
  } catch (error: unknown) {
    return (
      <YStack width={440} gap="$3" data-testid="GovernanceWidget-showcase-custodial-config-error">
        <Card>
          <Text bold>Custodial fixture not configured</Text>
          <Text tone="secondary">
            {error instanceof Error ? error.message : 'Set a local private key in custodialEip1193.ts'}
          </Text>
        </Card>
      </YStack>
    )
  }
}

const activeDemoVote: GovernanceWidgetAdapterState['dashboard']['alignmentVoting'] = {
  ...createDashboard().alignmentVoting,
  voteId: 'alignment-active-demo',
  title: 'House of Alignment Community Grants',
  summaryLabel: 'Voting open · 2 days remaining',
  options: [
    { id: alignmentRecipients[0], label: 'Local Food Chain', percentage: 42 },
    { id: alignmentRecipients[1], label: 'Web3 Literacy', percentage: 31 },
    { id: alignmentRecipients[2], label: 'Civic Onboarding', percentage: 27 },
  ],
  recipients: [...alignmentRecipients],
  allocationsBps: {
    [alignmentRecipients[0]]: 4200,
    [alignmentRecipients[1]]: 3000,
    [alignmentRecipients[2]]: 2000,
  },
  allocationTotalBps: 9200,
  canVote: true,
  hasVoted: false,
  isVotingOpen: true,
  executed: false,
  finalizedUnits: {},
  disabledReason: undefined,
}

const previousDemoVote: GovernanceWidgetAdapterState['dashboard']['alignmentVoting'] = {
  ...activeDemoVote,
  voteId: 'alignment-previous-demo',
  title: 'Previous Round: Regional Access Grants',
  summaryLabel: 'Final units executed',
  options: [
    { id: alignmentRecipients[0], label: 'Local Food Chain', percentage: 50 },
    { id: alignmentRecipients[1], label: 'Web3 Literacy', percentage: 30 },
    { id: alignmentRecipients[2], label: 'Civic Onboarding', percentage: 20 },
  ],
  allocationsBps: {},
  allocationTotalBps: 0,
  canVote: false,
  hasVoted: true,
  isVotingOpen: false,
  executed: true,
  finalizedUnits: {
    [alignmentRecipients[0]]: '500000',
    [alignmentRecipients[1]]: '300000',
    [alignmentRecipients[2]]: '200000',
  },
  disabledReason: 'This vote has already been executed.',
}

function DemoGovernanceWidget({ defaultTheme }: GovernanceWidgetStoryArgs) {
  const initialState = useMemo(
    () => createState('active_alignment', {
      dashboard: createDashboard({
        alignmentVoting: activeDemoVote,
        alignmentVotingHistory: [previousDemoVote],
      }),
    }),
    [],
  )
  const [state, setState] = useState(initialState)

  const setVoteAllocation = useCallback((recipientId: string, basisPoints: number) => {
    setState((previous) => {
      const voting = previous.dashboard.alignmentVoting
      if (!(recipientId in voting.allocationsBps)) return previous
      const allocationsBps = {
        ...voting.allocationsBps,
        [recipientId]: Math.max(0, Math.min(10_000, Math.trunc(basisPoints))),
      }
      return {
        ...previous,
        dashboard: {
          ...previous.dashboard,
          alignmentVoting: {
            ...voting,
            allocationsBps,
            allocationTotalBps: Object.values(allocationsBps).reduce((total, amount) => total + amount, 0),
          },
        },
      }
    })
  }, [])

  const actions = useMemo<GovernanceWidgetAdapterActions>(() => ({
    connect: async () => {},
    switchToCelo: async () => {},
    refresh: async () => {},
    retry: async () => {},
    selectHouse: () => {},
    register: async () => {},
    unstake: async () => {},
    openVote: () => setState((previous) => ({ ...previous, status: 'vote_detail' })),
    closeVote: () => setState((previous) => ({ ...previous, status: 'active_alignment' })),
    setVoteAllocation,
    submitVote: async () => {},
    startIdentityVerification: async () => {},
  }), [setVoteAllocation])

  const adapterFactory = useCallback(() => ({ state, actions }), [actions, state])

  return <GovernanceWidget defaultTheme={defaultTheme} adapterFactory={adapterFactory} testId="GovernanceWidget-showcase-demo" />
}

// Real wallet, real dev-celo GoodDaoHouses contract, no mocked reads or writes — this is the
// live integrator-facing surface, deliberately kept separate from the QA fixtures/mocked flow.
export const InjectedWallet: Story = {
  render: ({ defaultTheme }) => <InjectedWalletStory defaultTheme={defaultTheme} />,
}

export const CustodialWallet: Story = {
  tags: ['!dev'],
  render: ({ defaultTheme }) => <CustodialWalletStory defaultTheme={defaultTheme} />,
}

export const Demo: Story = {
  render: ({ defaultTheme }) => <DemoGovernanceWidget defaultTheme={defaultTheme} />,
}
