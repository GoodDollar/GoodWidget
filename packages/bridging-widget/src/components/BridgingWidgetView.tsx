import React, { useState } from 'react'
import { Badge, BadgeText, Heading, WidgetTabs, XStack, YStack, getChainDisplayName } from '@goodwidget/ui'
import { WalletControls } from '@goodwidget/core'
import {
  BRIDGING_CHAINS,
  type BridgingWidgetAdapterResult,
  type BridgingWidgetTab,
} from '../widgetRuntimeContract'
import { BridgeConfirmModal } from './BridgeConfirmModal'
import { BridgeHistoryDetailModal } from './BridgeHistoryDetailModal'
import { BridgeTab } from './BridgeTab'
import { FaqTab } from './FaqTab'
import { HistoryTab } from './HistoryTab'
import { ReviewScreen } from './ReviewScreen'

interface BridgingWidgetViewProps {
  adapter: BridgingWidgetAdapterResult
  initialTab?: BridgingWidgetTab
}

export function BridgingWidgetView({ adapter, initialTab = 'bridge' }: BridgingWidgetViewProps) {
  const { state, actions } = adapter
  const [activeTab, setActiveTab] = useState<BridgingWidgetTab>(initialTab)

  const tabContent = (
    <>
      {activeTab === 'bridge' && (
        <BridgeTab
          chainId={state.chainId ?? BRIDGING_CHAINS.CELO}
          targetChainId={state.targetChainId}
          availableProtocols={state.availableProtocols}
          selectedProtocol={state.selectedProtocol}
          isConnected={state.isConnected}
          isWrongChain={state.isWrongChain}
          onConnect={actions.connect}
          onSelectSourceChain={actions.selectSourceChain}
          onSelectTargetChain={actions.selectTargetChain}
          onSelectProtocol={actions.selectProtocol}
          inputAmount={state.inputAmount}
          bridgeConfig={state.bridgeConfig}
          isBridgeConfigLoading={state.isBridgeConfigLoading}
          bridgeConfigError={state.bridgeConfigError}
          quoteStatus={state.quoteStatus}
          quote={state.quote}
          needsApproval={state.needsApproval}
          canBridge={state.canBridge}
          requirements={state.requirements}
          quoteError={state.quoteError}
          onChangeAmount={actions.setInputAmount}
          onPressMax={actions.setMaxAmount}
          onReview={actions.openReview}
        />
      )}
      {activeTab === 'history' && (
        <HistoryTab
          transactions={state.historyTransactions}
          isLoading={state.isHistoryLoading}
          error={state.historyError}
          isPartial={state.isHistoryPartial}
          onRefresh={actions.refreshHistory}
          onSelectTransaction={actions.viewHistoryTransaction}
        />
      )}
      {activeTab === 'faq' && <FaqTab />}
    </>
  )

  // Review and Confirm render as drawers above the tab content rather than
  // inline, so they stay mounted (and keep doBridge()'s submission running)
  // even if the user flips tabs mid-flow.
  const review = state.chainId !== null && state.targetChainId !== null &&
    state.selectedProtocol !== null && state.quote !== null && (
      <ReviewScreen
        isOpen={state.isReviewOpen}
        fromChainId={state.chainId}
        targetChainId={state.targetChainId}
        protocol={state.selectedProtocol}
        quote={state.quote}
        onClose={actions.closeReview}
        onConfirm={actions.confirmBridge}
      />
  )

  return (
    <YStack gap="$3" padding="$5" width="100%" style={{ boxSizing: 'border-box' }}>
      <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="$2" paddingHorizontal="$1">
        <Heading level={4}>GoodDollar Bridge</Heading>
        {state.chainId !== null && (
          <Badge type="info"><BadgeText>{getChainDisplayName(state.chainId)}</BadgeText></Badge>
        )}
        <WalletControls />
      </XStack>
      <WidgetTabs
        tabs={[
          { id: 'bridge', label: 'Bridge' },
          { id: 'history', label: 'History' },
          { id: 'faq', label: 'FAQ' },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as BridgingWidgetTab)}
        withConnectionStatus={false}
      />
      {tabContent}
      {review}
      <BridgeConfirmModal
        submissionStep={state.submissionStep}
        submissionFailedAtStep={state.submissionFailedAtStep}
        submissionError={state.submissionError}
        needsApproval={state.needsApproval}
        onRetry={actions.retrySubmission}
        onClose={actions.closeSubmission}
      />
      <BridgeHistoryDetailModal
        transaction={state.selectedHistoryTransaction}
        explorerLink={state.selectedHistoryExplorerLink}
        onClose={actions.closeHistoryTransaction}
      />
    </YStack>
  )
}
