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
import { primaryRequirementMessage } from '../adapter/errors'

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
          onSwapRoute={actions.swapRoute}
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

  // Confirm stays mounted while doBridge() runs, even if the user changes tabs.
  // Unmount Review on close so its Sheet cannot cover the submission drawer.
  const review = state.isReviewOpen && state.chainId !== null && state.targetChainId !== null &&
    state.selectedProtocol !== null && state.quote !== null && (
      <ReviewScreen
        isOpen={state.isReviewOpen}
        fromChainId={state.chainId}
        walletChainId={state.walletChainId}
        targetChainId={state.targetChainId}
        protocol={state.selectedProtocol}
        quote={state.quote}
        canConfirm={state.canBridge && state.quoteStatus === 'ready'}
        blockingReason={primaryRequirementMessage(state.requirements)}
        onClose={actions.closeReview}
        onConfirm={actions.confirmBridge}
      />
  )

  return (
    <YStack gap="$2" padding="$3" paddingHorizontal="$1" width="100%" style={{ boxSizing: 'border-box' }}>
      <XStack justifyContent="space-between" alignItems="center" gap="$1" testID="BridgingWidget-header">
        <XStack alignItems="center" gap="$1" flex={1} minWidth={0} flexWrap="wrap">
          <Heading level={6} fontSize={13} letterSpacing={0} flexShrink={1}>GoodDollar Bridge</Heading>
          {state.chainId !== null && (
            <Badge type="info"><BadgeText>{getChainDisplayName(state.chainId)}</BadgeText></Badge>
          )}
        </XStack>
        <WalletControls size="sm" />
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
        requiresReview={state.submissionRequiresReview}
        needsApproval={state.needsApproval}
        sourceChainId={state.submissionSourceChainId}
        targetChainId={state.submissionTargetChainId}
        protocol={state.submissionProtocol}
        amount={state.submissionAmount}
        sourceTxHash={state.submissionTxHash}
        deliveryStatus={state.submissionDeliveryStatus}
        deliveryStatusError={state.submissionStatusError}
        sourceExplorerLink={state.submissionSourceExplorerLink}
        providerExplorerLink={state.submissionProviderExplorerLink}
        destinationExplorerLink={state.submissionDestinationExplorerLink}
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
