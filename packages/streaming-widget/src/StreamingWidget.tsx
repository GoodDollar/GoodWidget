import React, { useState } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  createComponent,
  Card,
  Heading,
  Text,
  Button,
  ButtonText,
  Spinner,
  Separator,
  ToastContainer,
  XStack,
  YStack,
  Input,
  Select,
  Badge,
  BadgeText,
  AddressDisplay,
  TokenAmount,
  WidgetTabs,
} from '@goodwidget/ui'
import type { Address } from 'viem'
import { formatUnits } from 'viem'
import { useStreamingAdapter } from './adapter'
import type {
  StreamingWidgetProps,
  StreamingWidgetTab,
  StreamDirection,
  StreamListItem,
  PoolMembershipItem,
  StreamTimeUnit,
  WriteStatus,
} from './widgetRuntimeContract'
import { STREAMING_CHAINS } from './widgetRuntimeContract'

// ---------------------------------------------------------------------------
// Named styled sub-components — participate in the component sub-theme system.
// Integrators can override via themeOverrides.
// ---------------------------------------------------------------------------

/** Outer shell for each tab's content area */
const StreamingTabContent = createComponent(YStack, {
  name: 'StreamingTabContent',
  flex: 1,
  gap: '$3',
  paddingVertical: '$3',
})

/** Row card for a single stream entry */
const StreamRow = createComponent(Card, {
  name: 'StreamRow',
  padding: '$3',
  gap: '$2',
})

/** Row card for a single pool membership entry */
const PoolRow = createComponent(Card, {
  name: 'PoolRow',
  padding: '$3',
  gap: '$2',
})

/** Card displayed when a list is empty */
const EmptyStateCard = createComponent(Card, {
  name: 'EmptyStateCard',
  padding: '$6',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: '$3',
})

/** Card displayed for inline error states */
const ErrorStateCard = createComponent(Card, {
  name: 'ErrorStateCard',
  padding: '$4',
  gap: '$2',
})

/** Card for the create/update stream form */
const SetStreamFormCard = createComponent(Card, {
  name: 'SetStreamFormCard',
  padding: '$4',
  gap: '$3',
})

/** Card for balance display */
const BalanceCard = createComponent(Card, {
  name: 'BalanceCard',
  padding: '$4',
  gap: '$2',
})

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

const TIME_UNIT_OPTIONS: Array<{ value: StreamTimeUnit; label: string }> = [
  { value: 'second', label: 'per second' },
  { value: 'minute', label: 'per minute' },
  { value: 'hour', label: 'per hour' },
  { value: 'day', label: 'per day' },
  { value: 'week', label: 'per week' },
  { value: 'month', label: 'per month' },
  { value: 'year', label: 'per year' },
]

/** Formats a flow rate bigint (wei/s) into a human-readable per-period amount */
function formatFlowRateDisplay(flowRate: bigint, decimals = 18): string {
  if (flowRate === 0n) return '0'
  // Convert wei/s → per-month amount for display
  const perMonth = flowRate * BigInt(30 * 24 * 60 * 60)
  return formatUnits(perMonth, decimals)
}

/** Formats a unix timestamp (seconds) to a short locale date string */
function formatTimestamp(unixSeconds: number): string {
  if (!unixSeconds) return '—'
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Short-form chain name display */
function chainName(chainId: number): string {
  if (chainId === STREAMING_CHAINS.CELO) return 'Celo'
  if (chainId === STREAMING_CHAINS.BASE) return 'Base'
  return `Chain ${chainId}`
}

// ---------------------------------------------------------------------------
// Write-status badge helper
// ---------------------------------------------------------------------------
function WriteStatusBadge({ status }: { status: WriteStatus }) {
  if (status === 'idle') return null
  if (status === 'pending') return <Spinner size="sm" />
  if (status === 'success')
    return (
      <Badge type="success">
        <BadgeText>Done</BadgeText>
      </Badge>
    )
  return (
    <Badge type="error">
      <BadgeText>Failed</BadgeText>
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Not-connected / wrong-chain prompt
// ---------------------------------------------------------------------------
function WalletGate({
  isConnected,
  isWrongChain,
  onConnect,
  onSwitchChain,
}: {
  isConnected: boolean
  isWrongChain: boolean
  onConnect: () => void
  onSwitchChain: (chainId: number) => void
}) {
  if (!isConnected) {
    return (
      <EmptyStateCard>
        <Heading level={4} textAlign="center">
          Wallet not connected
        </Heading>
        <Text secondary center>
          Connect your wallet to view streams, pools, and balances.
        </Text>
        <Button onPress={onConnect}>
          <ButtonText>Connect Wallet</ButtonText>
        </Button>
      </EmptyStateCard>
    )
  }

  if (isWrongChain) {
    return (
      <EmptyStateCard>
        <Heading level={4} textAlign="center">
          Unsupported network
        </Heading>
        <Text secondary center>
          Switch to Celo or Base to use the streaming widget.
        </Text>
        <XStack gap="$2">
          <Button onPress={() => onSwitchChain(STREAMING_CHAINS.CELO)}>
            <ButtonText>Switch to Celo</ButtonText>
          </Button>
          <Button onPress={() => onSwitchChain(STREAMING_CHAINS.BASE)}>
            <ButtonText>Switch to Base</ButtonText>
          </Button>
        </XStack>
      </EmptyStateCard>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Set-stream form — create or update an outgoing stream
// ---------------------------------------------------------------------------
function SetStreamForm({
  form,
  status,
  error,
  txHash,
  onUpdate,
  onSubmit,
  onReset,
}: {
  form: ReturnType<typeof useStreamingAdapter>['state']['setStreamForm']
  status: WriteStatus
  error: string | null
  txHash: string | null
  onUpdate: (partial: Partial<typeof form>) => void
  onSubmit: () => void
  onReset: () => void
}) {
  const isSubmitting = status === 'pending'

  return (
    <SetStreamFormCard>
      <Heading level={4}>{form.receiver ? 'Update Stream' : 'Create Stream'}</Heading>

      {/* Recipient address */}
      <YStack gap="$1">
        <Text variant="label">Recipient address</Text>
        <Input
          placeholder="0x…"
          value={form.receiver}
          onChangeText={(v: string) => onUpdate({ receiver: v })}
          editable={!isSubmitting}
        />
      </YStack>

      {/* Amount + time unit */}
      <XStack gap="$2" alignItems="flex-end">
        <YStack flex={1} gap="$1">
          <Text variant="label">Amount</Text>
          <Input
            placeholder="100"
            value={form.amount}
            onChangeText={(v: string) => onUpdate({ amount: v })}
            keyboardType="decimal-pad"
            editable={!isSubmitting}
          />
        </YStack>
        <YStack gap="$1" minWidth={130}>
          <Text variant="label">Period</Text>
          <Select
            value={form.timeUnit}
            onValueChange={(v) => onUpdate({ timeUnit: v as StreamTimeUnit })}
            options={TIME_UNIT_OPTIONS}
            disabled={isSubmitting}
          />
        </YStack>
      </XStack>

      {/* Computed flow rate preview */}
      {form.flowRate !== null && form.flowRate > 0n && (
        <XStack gap="$2" alignItems="center">
          <Text variant="caption" secondary>
            ≈ {formatUnits(form.flowRate, 18)} tokens/s
          </Text>
        </XStack>
      )}

      {/* Validation / error feedback */}
      {form.validationError && (
        <Text color="$error" variant="caption">
          {form.validationError}
        </Text>
      )}
      {status === 'error' && error && (
        <Text color="$error" variant="caption">
          {error}
        </Text>
      )}
      {status === 'success' && txHash && (
        <Text color="$success" variant="caption">
          Stream set! Tx: {txHash.slice(0, 10)}…
        </Text>
      )}

      {/* Actions */}
      <XStack gap="$2" alignItems="center">
        <Button
          flex={1}
          disabled={isSubmitting || !!form.validationError || !form.flowRate}
          onPress={onSubmit}
        >
          {isSubmitting ? <Spinner size="sm" /> : <ButtonText>Set Stream</ButtonText>}
        </Button>
        {(status === 'success' || status === 'error') && (
          <Button onPress={onReset}>
            <ButtonText>Reset</ButtonText>
          </Button>
        )}
      </XStack>
    </SetStreamFormCard>
  )
}

// ---------------------------------------------------------------------------
// Single stream row
// ---------------------------------------------------------------------------
function StreamCard({ stream }: { stream: StreamListItem }) {
  const counterparty =
    stream.direction === 'outgoing' ? stream.receiver : stream.sender
  const flowPerMonth = formatFlowRateDisplay(stream.flowRate)

  return (
    <StreamRow>
      <XStack justifyContent="space-between" alignItems="center">
        <Badge type={stream.direction === 'incoming' ? 'success' : 'info'}>
          <BadgeText>{stream.direction === 'incoming' ? '↓ Incoming' : '↑ Outgoing'}</BadgeText>
        </Badge>
        <Text variant="caption" secondary>
          Since {formatTimestamp(stream.createdAtTimestamp)}
        </Text>
      </XStack>

      <AddressDisplay address={counterparty} />

      <XStack justifyContent="space-between" alignItems="center">
        <Text variant="caption" secondary>
          Flow rate
        </Text>
        <Text fontWeight="600">
          {flowPerMonth}/mo
        </Text>
      </XStack>

      {stream.streamedSoFar > 0n && (
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="caption" secondary>
            Streamed so far
          </Text>
          <Text>{formatUnits(stream.streamedSoFar, 18)}</Text>
        </XStack>
      )}
    </StreamRow>
  )
}

/** Maps direction filter IDs to display labels. */
const DIRECTION_LABELS: Record<StreamDirection, string> = {
  all: 'All',
  incoming: 'Incoming',
  outgoing: 'Outgoing',
}
function StreamsTab({
  state,
  actions,
}: {
  state: ReturnType<typeof useStreamingAdapter>['state']
  actions: ReturnType<typeof useStreamingAdapter>['actions']
}) {
  const [direction, setDirection] = useState<StreamDirection>('all')
  const [showForm, setShowForm] = useState(false)

  const filteredStreams = state.streams.filter(
    (s) => direction === 'all' || s.direction === direction,
  )

  return (
    <StreamingTabContent>
      {/* Create stream form toggle */}
      <XStack justifyContent="flex-end">
        <Button onPress={() => setShowForm((v) => !v)}>
          <ButtonText>{showForm ? 'Cancel' : '+ New Stream'}</ButtonText>
        </Button>
      </XStack>

      {showForm && (
        <SetStreamForm
          form={state.setStreamForm}
          status={state.setStreamStatus}
          error={state.setStreamError}
          txHash={state.setStreamTxHash}
          onUpdate={actions.updateSetStreamForm}
          onSubmit={actions.submitSetStream}
          onReset={() => {
            actions.resetSetStream()
            setShowForm(false)
          }}
        />
      )}

      <Separator />

      {/* Direction filter */}
      <XStack gap="$2">
        {(['all', 'incoming', 'outgoing'] as StreamDirection[]).map((d) => (
          <Button
            key={d}
            onPress={() => setDirection(d)}
            variant={direction === d ? 'primary' : 'secondary'}
          >
            <ButtonText>{DIRECTION_LABELS[d]}</ButtonText>
          </Button>
        ))}
      </XStack>

      {/* List states */}
      {state.streamsLoading && (
        <YStack alignItems="center" paddingVertical="$4">
          <Spinner size="lg" />
          <Text secondary>Loading streams…</Text>
        </YStack>
      )}

      {!state.streamsLoading && state.streamsError && (
        <ErrorStateCard>
          <Text color="$error">{state.streamsError}</Text>
          <Button onPress={actions.refreshStreams}>
            <ButtonText>Retry</ButtonText>
          </Button>
        </ErrorStateCard>
      )}

      {!state.streamsLoading && !state.streamsError && filteredStreams.length === 0 && (
        <EmptyStateCard>
          <Text secondary center>
            No {direction === 'all' ? '' : direction} streams found.
          </Text>
          <Button onPress={actions.refreshStreams}>
            <ButtonText>Refresh</ButtonText>
          </Button>
        </EmptyStateCard>
      )}

      {!state.streamsLoading &&
        !state.streamsError &&
        filteredStreams.map((stream) => <StreamCard key={stream.id} stream={stream} />)}
    </StreamingTabContent>
  )
}

// ---------------------------------------------------------------------------
// Single pool row
// ---------------------------------------------------------------------------
function PoolCard({
  pool,
  connectStatus,
  connectError,
  claimStatus,
  claimError,
  onConnect,
  onDisconnect,
  onClaim,
}: {
  pool: PoolMembershipItem
  connectStatus: WriteStatus
  connectError: string | null
  claimStatus: WriteStatus
  claimError: string | null
  onConnect: (poolAddress: Address) => void
  onDisconnect: (poolAddress: Address) => void
  onClaim: (poolAddress: Address) => void
}) {
  const isConnectPending = connectStatus === 'pending'
  const isClaimPending = claimStatus === 'pending'
  const hasClaimable = pool.claimableAmount > 0n

  return (
    <PoolRow>
      <XStack justifyContent="space-between" alignItems="center">
        <AddressDisplay address={pool.poolId} />
        <Badge type={pool.isConnected ? 'success' : 'default'}>
          <BadgeText>{pool.isConnected ? 'Connected' : 'Disconnected'}</BadgeText>
        </Badge>
      </XStack>

      <XStack justifyContent="space-between" alignItems="center">
        <Text variant="caption" secondary>
          Total claimed
        </Text>
        <Text>{formatUnits(pool.totalAmountClaimed, 18)}</Text>
      </XStack>

      {hasClaimable && (
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="caption" secondary>
            Claimable
          </Text>
          <Text fontWeight="600">{formatUnits(pool.claimableAmount, 18)}</Text>
        </XStack>
      )}

      {connectError && (
        <Text color="$error" variant="caption">
          {connectError}
        </Text>
      )}
      {claimError && (
        <Text color="$error" variant="caption">
          {claimError}
        </Text>
      )}

      <XStack gap="$2" alignItems="center" flexWrap="wrap">
        <WriteStatusBadge status={connectStatus} />
        {pool.isConnected ? (
          <Button disabled={isConnectPending} onPress={() => onDisconnect(pool.poolId)}>
            {isConnectPending ? <Spinner size="sm" /> : <ButtonText>Disconnect</ButtonText>}
          </Button>
        ) : (
          <Button disabled={isConnectPending} onPress={() => onConnect(pool.poolId)}>
            {isConnectPending ? <Spinner size="sm" /> : <ButtonText>Connect</ButtonText>}
          </Button>
        )}
        {pool.isConnected && hasClaimable && (
          <>
            <WriteStatusBadge status={claimStatus} />
            <Button
              disabled={isClaimPending}
              onPress={() => onClaim(pool.poolId)}
              variant="secondary"
            >
              {isClaimPending ? <Spinner size="sm" /> : <ButtonText>Claim</ButtonText>}
            </Button>
          </>
        )}
      </XStack>
    </PoolRow>
  )
}

// ---------------------------------------------------------------------------
// Pools tab
// ---------------------------------------------------------------------------
function PoolsTab({
  state,
  actions,
}: {
  state: ReturnType<typeof useStreamingAdapter>['state']
  actions: ReturnType<typeof useStreamingAdapter>['actions']
}) {
  return (
    <StreamingTabContent>
      {state.poolsLoading && (
        <YStack alignItems="center" paddingVertical="$4">
          <Spinner size="lg" />
          <Text secondary>Loading pool memberships…</Text>
        </YStack>
      )}

      {!state.poolsLoading && state.poolsError && (
        <ErrorStateCard>
          <Text color="$error">{state.poolsError}</Text>
          <Button onPress={actions.refreshPools}>
            <ButtonText>Retry</ButtonText>
          </Button>
        </ErrorStateCard>
      )}

      {!state.poolsLoading && !state.poolsError && state.pools.length === 0 && (
        <EmptyStateCard>
          <Text secondary center>
            No GDA pool memberships found for this address.
          </Text>
          <Button onPress={actions.refreshPools}>
            <ButtonText>Refresh</ButtonText>
          </Button>
        </EmptyStateCard>
      )}

      {!state.poolsLoading &&
        !state.poolsError &&
        state.pools.map((pool) => (
          <PoolCard
            key={pool.poolId}
            pool={pool}
            connectStatus={state.poolConnectStatus[pool.poolId] ?? 'idle'}
            connectError={state.poolConnectError[pool.poolId] ?? null}
            claimStatus={state.poolClaimStatus[pool.poolId] ?? 'idle'}
            claimError={state.poolClaimError[pool.poolId] ?? null}
            onConnect={actions.connectToPool}
            onDisconnect={actions.disconnectFromPool}
            onClaim={actions.claimFromPool}
          />
        ))}
    </StreamingTabContent>
  )
}

// ---------------------------------------------------------------------------
// Balances tab
// ---------------------------------------------------------------------------
function BalancesTab({
  state,
  actions,
}: {
  state: ReturnType<typeof useStreamingAdapter>['state']
  actions: ReturnType<typeof useStreamingAdapter>['actions']
}) {
  const isOnBase = state.chainId === STREAMING_CHAINS.BASE

  return (
    <StreamingTabContent>
      {/* Super Token balance */}
      <BalanceCard>
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">Super Token Balance</Text>
          <Button onPress={actions.refreshBalance}>
            <ButtonText>↺ Refresh</ButtonText>
          </Button>
        </XStack>

        {state.balanceLoading && <Spinner size="sm" />}

        {!state.balanceLoading && state.balanceError && (
          <Text color="$error" variant="caption">
            {state.balanceError}
          </Text>
        )}

        {!state.balanceLoading && !state.balanceError && state.superTokenBalance !== null && (
          <TokenAmount
            token={state.chainId === STREAMING_CHAINS.BASE ? 'SUP' : 'G$'}
            amount={state.superTokenBalance}
            size="xl"
          />
        )}

        {state.chainId && (
          <Badge type="info">
            <BadgeText>{chainName(state.chainId)}</BadgeText>
          </Badge>
        )}
      </BalanceCard>

      {/* SUP reserve — Base only */}
      {isOnBase ? (
        <BalanceCard>
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="label">SUP Reserve (Staked)</Text>
            {state.supReserveLoading && <Spinner size="sm" />}
          </XStack>

          {!state.supReserveLoading && state.supReserveError && (
            <Text color="$error" variant="caption">
              {state.supReserveError}
            </Text>
          )}

          {!state.supReserveLoading && !state.supReserveError && state.supReserveBalance !== null && (
            <TokenAmount token="SUP" amount={state.supReserveBalance} size="lg" />
          )}

          <Text variant="caption" secondary>
            SUP tokens locked as reserve on Base.
          </Text>
        </BalanceCard>
      ) : (
        <BalanceCard>
          <Text variant="label" color="$placeholderColor">
            SUP Reserve
          </Text>
          <Text variant="caption" secondary>
            Reserve data is only available on Base. Switch to Base to view your SUP reserve balance.
          </Text>
        </BalanceCard>
      )}
    </StreamingTabContent>
  )
}

// ---------------------------------------------------------------------------
// Inner component — must live inside GoodWidgetProvider
// ---------------------------------------------------------------------------
function StreamingWidgetInner({
  environment,
  apiKey,
}: {
  environment: StreamingWidgetProps['environment']
  apiKey?: string
}) {
  const { state, actions } = useStreamingAdapter({ environment, apiKey })
  const [activeTab, setActiveTab] = useState<StreamingWidgetTab>('streams')

  const walletGate = (
    <WalletGate
      isConnected={state.isConnected}
      isWrongChain={state.isWrongChain}
      onConnect={actions.connect}
      onSwitchChain={actions.switchChain}
    />
  )

  const tabContent = !state.isConnected || state.isWrongChain ? walletGate : (
    <>
      {activeTab === 'streams' && <StreamsTab state={state} actions={actions} />}
      {activeTab === 'pools' && <PoolsTab state={state} actions={actions} />}
      {activeTab === 'balances' && <BalancesTab state={state} actions={actions} />}
    </>
  )

  return (
    <YStack gap="$3" padding="$4">
      <WidgetTabs
        tabs={[
          { id: 'streams', label: 'Streams' },
          { id: 'pools', label: 'Pools' },
          { id: 'balances', label: 'Balances' },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as StreamingWidgetTab)}
        chainId={state.chainId ?? undefined}
      />
      {tabContent}
    </YStack>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

/**
 * StreamingWidget — Superfluid streaming flows, GDA pool memberships, and
 * Super Token balances for GoodDollar (G$ on Celo) and SUP (on Base).
 *
 * Usage as a React component:
 *   <StreamingWidget provider={eip1193Provider} />
 *
 * Also available as a Web Component via the `element` or `register` entry points.
 *
 * Provider-first runtime path:
 *   host provider → GoodWidgetProvider → streaming adapter → streaming-sdk
 */
export function StreamingWidget({
  provider,
  environment = 'production',
  themeOverrides,
  config,
  defaultTheme = 'light',
  apiKey,
}: StreamingWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <StreamingWidgetInner environment={environment} apiKey={apiKey} />
      <ToastContainer />
    </GoodWidgetProvider>
  )
}
