import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import {
  STREAMING_CHAINS,
  StreamingWidget,
  StreamingWidgetPreview,
  type PoolMembershipItem,
  type SetStreamFormState,
  type StreamingWidgetAdapterActions,
  type StreamingWidgetAdapterResult,
  type StreamingWidgetAdapterState,
  type StreamingWidgetTab,
  type StreamListItem,
} from '@goodwidget/streaming-widget'
import { YStack } from '@goodwidget/ui'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'

const DEMO_ADDRESS = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
const DEMO_RECEIVER = '0x1111111111111111111111111111111111111111'
const DEMO_SENDER = '0x2222222222222222222222222222222222222222'
const DEMO_TOKEN = '0x3333333333333333333333333333333333333333'
const DEMO_POOL = '0x4444444444444444444444444444444444444444'
const DEMO_RESERVE_LOCKER = '0x8888888888888888888888888888888888888888'

const defaultForm: SetStreamFormState = {
  receiver: '',
  amount: '',
  timeUnit: 'month',
  flowRate: null,
  validationError: null,
}

const validForm: SetStreamFormState = {
  receiver: DEMO_RECEIVER,
  amount: '42',
  timeUnit: 'month',
  flowRate: 16203703703703n,
  validationError: null,
}

const invalidForm: SetStreamFormState = {
  receiver: '0x123',
  amount: '0',
  timeUnit: 'month',
  flowRate: null,
  validationError: 'Recipient must be a valid Ethereum address (0x...).',
}

const sampleStreams: StreamListItem[] = [
  {
    id: 'outgoing-demo-stream',
    sender: DEMO_ADDRESS,
    receiver: DEMO_RECEIVER,
    token: DEMO_TOKEN,
    flowRate: 38580246913580n,
    streamedSoFar: 15000000000000000000n,
    createdAtTimestamp: 1767225600,
    updatedAtTimestamp: 1767312000,
    direction: 'outgoing',
  },
  {
    id: 'incoming-demo-stream',
    sender: DEMO_SENDER,
    receiver: DEMO_ADDRESS,
    token: DEMO_TOKEN,
    flowRate: 19290123456790n,
    streamedSoFar: 7800000000000000000n,
    createdAtTimestamp: 1767139200,
    updatedAtTimestamp: 1767312000,
    direction: 'incoming',
  },
]

// Mirrors the current SDK-backed adapter; diverge this once past-stream history is fetched separately.
const sampleStreamHistory: StreamListItem[] = [
  ...sampleStreams,
  {
    id: 'history-outgoing-demo-stream-2',
    sender: DEMO_ADDRESS,
    receiver: '0x5555555555555555555555555555555555555555',
    token: DEMO_TOKEN,
    flowRate: 9645061728395n,
    streamedSoFar: 4300000000000000000n,
    createdAtTimestamp: 1767052800,
    updatedAtTimestamp: 1767139200,
    direction: 'outgoing',
  },
  {
    id: 'history-incoming-demo-stream-2',
    sender: '0x6666666666666666666666666666666666666666',
    receiver: DEMO_ADDRESS,
    token: DEMO_TOKEN,
    flowRate: 5787037037037n,
    streamedSoFar: 2200000000000000000n,
    createdAtTimestamp: 1766966400,
    updatedAtTimestamp: 1767052800,
    direction: 'incoming',
  },
  {
    id: 'history-outgoing-demo-stream-3',
    sender: DEMO_ADDRESS,
    receiver: '0x7777777777777777777777777777777777777777',
    token: DEMO_TOKEN,
    flowRate: 3858024691358n,
    streamedSoFar: 1400000000000000000n,
    createdAtTimestamp: 1766880000,
    updatedAtTimestamp: 1766966400,
    direction: 'outgoing',
  },
]

const samplePools: PoolMembershipItem[] = [
  {
    poolId: DEMO_POOL,
    poolToken: DEMO_TOKEN,
    totalUnits: 250000000000000000000n,
    claimableAmount: 12500000000000000000n,
    claimableAmountError: false,
    totalAmountClaimed: 48000000000000000000n,
    isConnected: false,
  },
]

function createAdapter(
  stateOverrides: Partial<StreamingWidgetAdapterState> = {},
  actionOverrides: Partial<StreamingWidgetAdapterActions> = {},
): StreamingWidgetAdapterResult {
  const baseState: StreamingWidgetAdapterState = {
    isConnected: true,
    address: DEMO_ADDRESS,
    chainId: STREAMING_CHAINS.CELO,
    isWrongChain: false,
    streams: sampleStreams,
    streamsLoading: false,
    streamsError: null,
    streamHistory: sampleStreamHistory,
    streamHistoryLoading: false,
    streamHistoryError: null,
    pools: samplePools,
    poolsLoading: false,
    poolsError: null,
    superTokenBalance: '128.50',
    balanceLoading: false,
    balanceError: null,
    supReserveBalance: null,
    supReserveLockers: [],
    supReserveLoading: false,
    supReserveError: null,
    setStreamForm: defaultForm,
    setStreamStatus: 'idle',
    setStreamError: null,
    setStreamTxHash: null,
    poolConnectStatus: {},
    poolConnectError: {},
    poolClaimStatus: {},
    poolClaimError: {},
  }

  const actions: StreamingWidgetAdapterActions = {
    connect: async () => {},
    switchChain: async () => {},
    refreshStreams: async () => {},
    refreshStreamHistory: async () => {},
    refreshPools: async () => {},
    refreshBalance: async () => {},
    updateSetStreamForm: () => {},
    submitSetStream: async () => {},
    resetSetStream: () => {},
    connectToPool: async () => {},
    disconnectFromPool: async () => {},
    claimFromPool: async () => {},
    ...actionOverrides,
  }

  return {
    state: { ...baseState, ...stateOverrides },
    actions,
  }
}

function PreviewStoryShell({
  adapter,
  dataTestId,
  initialTab = 'streams',
  initialStreamsFormOpen = false,
}: {
  adapter: StreamingWidgetAdapterResult
  dataTestId: string
  initialTab?: StreamingWidgetTab
  initialStreamsFormOpen?: boolean
}) {
  return (
    <YStack
      data-testid={dataTestId}
      style={{
        width: '100%',
        maxWidth: 400,
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      <StreamingWidgetPreview
        adapter={adapter}
        initialTab={initialTab}
        initialStreamsFormOpen={initialStreamsFormOpen}
      />
    </YStack>
  )
}

function StreamingWidgetStoryShell({
  provider,
  dataTestId,
}: {
  provider: unknown
  dataTestId: string
}) {
  return (
    <YStack
      data-testid={dataTestId}
      style={{
        width: '100%',
        maxWidth: 400,
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      <StreamingWidget provider={provider} environment="development" />
    </YStack>
  )
}

const meta: Meta<typeof StreamingWidget> = {
  title: 'Widgets/StreamingWidget',
  component: StreamingWidget,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

function InjectedWalletStory() {
  const injectedProvider = getInjectedEip1193Provider()
  const usableProvider = isInjectedProviderUsable(injectedProvider)

  if (!usableProvider) {
    return (
      <PreviewStoryShell
        adapter={createAdapter({
          isConnected: false,
          address: null,
          chainId: null,
          streams: [],
          streamHistory: [],
          pools: [],
          superTokenBalance: null,
        })}
        dataTestId="StreamingWidget-no-injected-wallet"
      />
    )
  }

  return (
    <StreamingWidgetStoryShell
      provider={injectedProvider}
      dataTestId="StreamingWidget-injected-wallet"
    />
  )
}

function CustodialLocalFixtureStory() {
  try {
    const provider = createCustodialEip1193Provider()
    return (
      <StreamingWidgetStoryShell
        provider={provider}
        dataTestId="StreamingWidget-custodial-wallet"
      />
    )
  } catch (error: unknown) {
    return (
      <YStack
        data-testid="StreamingWidget-custodial-config-error"
        style={{ width: 'min(400px, 100vw)' }}
      >
        <strong>Custodial fixture not configured</strong>
        <span>
          {error instanceof Error
            ? error.message
            : 'Set a local private key in custodialEip1193.ts'}
        </span>
      </YStack>
    )
  }
}

function PoolClaimableAmountErrorStory() {
  const [retrying, setRetrying] = React.useState(false)

  return (
    <PreviewStoryShell
      adapter={createAdapter(
        {
          pools: retrying
            ? []
            : [
                {
                  ...samplePools[0],
                  isConnected: false,
                  claimableAmount: 0n,
                  claimableAmountError: true,
                },
              ],
          poolsLoading: retrying,
        },
        {
          refreshPools: async () => {
            setRetrying(true)
          },
        },
      )}
      dataTestId="StreamingWidget-pool-claimable-amount-error"
      initialTab="pools"
    />
  )
}

export const InjectedWallet: Story = {
  render: () => <InjectedWalletStory />,
}

export const CustodialLocalFixture: Story = {
  render: () => <CustodialLocalFixtureStory />,
}

export const NoWallet: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter({
        isConnected: false,
        address: null,
        chainId: null,
        streams: [],
        streamHistory: [],
        pools: [],
        superTokenBalance: null,
      })}
      dataTestId="StreamingWidget-no-wallet"
    />
  ),
}

export const WrongChain: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter({
        chainId: 1,
        isWrongChain: true,
      })}
      dataTestId="StreamingWidget-wrong-chain"
    />
  ),
}

export const LoadingState: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter({
        streams: [],
        streamsLoading: true,
        streamHistory: [],
        streamHistoryLoading: true,
        pools: [],
        poolsLoading: true,
        balanceLoading: true,
      })}
      dataTestId="StreamingWidget-loading-state"
    />
  ),
}

export const EmptyState: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter({
        streams: [],
        streamHistory: [],
        pools: [],
        superTokenBalance: '0',
      })}
      dataTestId="StreamingWidget-empty-state"
    />
  ),
}

export const ErrorState: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter({
        streams: [],
        streamsError: 'Unable to reach the network. Check your connection and try again.',
        streamHistory: [],
        streamHistoryError: 'Unable to load stream history.',
        pools: [],
        poolsError: 'Unable to load pool memberships.',
        balanceError: 'Unable to load token balance.',
      })}
      dataTestId="StreamingWidget-error-state"
    />
  ),
}

export const PopulatedState: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter()}
      dataTestId="StreamingWidget-populated-state"
    />
  ),
}

export const CreateUpdateForm: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter({ setStreamForm: validForm })}
      dataTestId="StreamingWidget-create-update-form"
      initialStreamsFormOpen
    />
  ),
}

export const CreateUpdateInvalidInput: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter({ setStreamForm: invalidForm })}
      dataTestId="StreamingWidget-create-update-invalid"
      initialStreamsFormOpen
    />
  ),
}

export const CreateUpdatePending: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter({
        setStreamForm: validForm,
        setStreamStatus: 'pending',
      })}
      dataTestId="StreamingWidget-create-update-pending"
      initialStreamsFormOpen
    />
  ),
}

export const CreateUpdateSuccess: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter({
        setStreamForm: validForm,
        setStreamStatus: 'success',
        setStreamTxHash:
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      })}
      dataTestId="StreamingWidget-create-update-success"
      initialStreamsFormOpen
    />
  ),
}

export const CreateUpdateFailure: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter({
        setStreamForm: validForm,
        setStreamStatus: 'error',
        setStreamError: 'Transaction cancelled by wallet.',
      })}
      dataTestId="StreamingWidget-create-update-failure"
      initialStreamsFormOpen
    />
  ),
}

export const PoolClaimState: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter({
        pools: [{ ...samplePools[0], isConnected: false }],
      })}
      dataTestId="StreamingWidget-pool-claim"
      initialTab="pools"
    />
  ),
}

export const PoolClaimPending: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter({
        pools: [{ ...samplePools[0], isConnected: false }],
        poolClaimStatus: { [DEMO_POOL]: 'pending' },
      })}
      dataTestId="StreamingWidget-pool-claim-pending"
      initialTab="pools"
    />
  ),
}

export const PoolClaimSuccess: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter({
        pools: [{ ...samplePools[0], isConnected: false }],
        poolClaimStatus: { [DEMO_POOL]: 'success' },
      })}
      dataTestId="StreamingWidget-pool-claim-success"
      initialTab="pools"
    />
  ),
}

export const PoolClaimError: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter({
        pools: [{ ...samplePools[0], isConnected: false }],
        poolClaimStatus: { [DEMO_POOL]: 'error' },
        poolClaimError: { [DEMO_POOL]: 'Pool claim failed. Please retry.' },
      })}
      dataTestId="StreamingWidget-pool-claim-error"
      initialTab="pools"
    />
  ),
}

export const PoolClaimableAmountError: Story = {
  render: () => <PoolClaimableAmountErrorStory />,
}

export const BaseSupBalanceAndReserve: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter({
        chainId: STREAMING_CHAINS.BASE,
        superTokenBalance: '712.10',
        supReserveBalance: '112.75',
        supReserveLockers: [
          {
            address: DEMO_RESERVE_LOCKER,
            stakedBalance: 95250000000000000000n,
            unstakedBalance: 17500000000000000000n,
            totalBalance: 112750000000000000000n,
          },
        ],
      })}
      dataTestId="StreamingWidget-base-sup-reserve"
      initialTab="balances"
    />
  ),
}

export const NonBaseSupReserveDisabled: Story = {
  render: () => (
    <PreviewStoryShell
      adapter={createAdapter({
        chainId: STREAMING_CHAINS.CELO,
        superTokenBalance: '128.50',
        supReserveBalance: null,
      })}
      dataTestId="StreamingWidget-non-base-reserve"
      initialTab="balances"
    />
  ),
}
