import React, { useState } from 'react'
import { WidgetTabs, YStack } from '@goodwidget/ui'
import type {
  StreamingWidgetAdapterResult,
  StreamingWidgetTab,
} from '../widgetRuntimeContract'
import { BalancesTab } from './BalancesTab'
import { HistoryTab } from './HistoryTab'
import { PoolsTab } from './PoolsTab'
import { StreamsTab } from './StreamsTab'
import { WalletGate } from './WalletGate'

interface StreamingWidgetViewProps {
  adapter: StreamingWidgetAdapterResult
  initialTab?: StreamingWidgetTab
  initialStreamsFormOpen?: boolean
}

export function StreamingWidgetView({
  adapter,
  initialTab = 'streams',
  initialStreamsFormOpen = false,
}: StreamingWidgetViewProps) {
  const { state, actions } = adapter
  const [activeTab, setActiveTab] = useState<StreamingWidgetTab>(initialTab)

  const tabContent = !state.isConnected || state.isWrongChain ? (
    <WalletGate
      isConnected={state.isConnected}
      isWrongChain={state.isWrongChain}
      onConnect={actions.connect}
      onSwitchChain={actions.switchChain}
    />
  ) : (
    <>
      {activeTab === 'streams' && (
        <StreamsTab
          streams={state.streams}
          loading={state.streamsLoading}
          error={state.streamsError}
          chainId={state.chainId}
          setStreamForm={state.setStreamForm}
          setStreamStatus={state.setStreamStatus}
          setStreamError={state.setStreamError}
          setStreamTxHash={state.setStreamTxHash}
          initialFormOpen={initialStreamsFormOpen}
          onRefresh={actions.refreshStreams}
          onUpdateSetStreamForm={actions.updateSetStreamForm}
          onSubmitSetStream={actions.submitSetStream}
          onResetSetStream={actions.resetSetStream}
        />
      )}
      {activeTab === 'history' && (
        <HistoryTab
          streamHistory={state.streamHistory}
          loading={state.streamHistoryLoading}
          error={state.streamHistoryError}
          chainId={state.chainId}
          onRefresh={actions.refreshStreamHistory}
        />
      )}
      {activeTab === 'pools' && (
        <PoolsTab
          pools={state.pools}
          loading={state.poolsLoading}
          error={state.poolsError}
          chainId={state.chainId}
          poolConnectStatus={state.poolConnectStatus}
          poolConnectError={state.poolConnectError}
          poolClaimStatus={state.poolClaimStatus}
          poolClaimError={state.poolClaimError}
          onRefresh={actions.refreshPools}
          onConnect={actions.connectToPool}
          onDisconnect={actions.disconnectFromPool}
          onClaim={actions.claimFromPool}
        />
      )}
      {activeTab === 'balances' && (
        <BalancesTab
          chainId={state.chainId}
          superTokenBalance={state.superTokenBalance}
          balanceLoading={state.balanceLoading}
          balanceError={state.balanceError}
          supTokenBalance={state.supTokenBalance}
          supBalanceLoading={state.supBalanceLoading}
          supBalanceError={state.supBalanceError}
          supReserveBalance={state.supReserveBalance}
          supReserveLockers={state.supReserveLockers}
          supReserveLoading={state.supReserveLoading}
          supReserveError={state.supReserveError}
          onRefresh={actions.refreshBalance}
        />
      )}
    </>
  )

  return (
    <YStack gap="$3" padding="$5" width="100%" style={{ boxSizing: 'border-box' }}>
      <WidgetTabs
        tabs={[
          { id: 'streams', label: 'Streams' },
          { id: 'history', label: 'History' },
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
