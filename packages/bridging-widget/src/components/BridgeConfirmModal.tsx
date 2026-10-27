import React from 'react'
import { Button, ButtonText, Drawer, Heading, Icon, ScrollArea, Stepper, Text, XStack, YStack } from '@goodwidget/ui'
import { formatUnits } from 'viem'
import { buildSubmissionSteps } from '../adapter/submissionSteps'
import type { BridgeProtocol, TransactionStatus } from '@goodsdks/bridging-sdk'
import type { Hash } from 'viem'
import type { BridgeSubmissionStep } from '../adapter/useBridgeSubmission'
import { formatTokenAmount } from '../amount'
import { getChainDecimals } from '../adapter/chains'
import { BridgeProgress } from './BridgeProgress'

interface BridgeConfirmModalProps {
  submissionStep: BridgeSubmissionStep
  submissionFailedAtStep: 'approving' | 'bridging' | null
  submissionError: string | null
  needsApproval: boolean
  sourceChainId: number | null
  targetChainId: number | null
  protocol: BridgeProtocol | null
  amount: bigint | null
  sourceTxHash: Hash | null
  deliveryStatus: TransactionStatus | null
  deliveryStatusError: string | null
  sourceExplorerLink: string | null
  providerExplorerLink: string | null
  destinationExplorerLink: string | null
  onRetry: () => void
  onClose: () => void
}

const HEADER_COPY: Record<BridgeSubmissionStep, string> = {
  idle: '',
  approving: 'Approving G$…',
  bridging: 'Bridging…',
  completed: 'Bridge Submitted',
  failed: 'Bridge Failed',
}

// Confirm/Submit modal: reuses the shared Stepper (loader icon on the active
// row, no bespoke progress indicator) to track doBridge()'s approve → bridge
// → complete lifecycle, per issue #244's "Transaction-confirmed state is a
// drawer/modal using the shared Stepper" requirement.
export function BridgeConfirmModal({
  submissionStep,
  submissionFailedAtStep,
  submissionError,
  needsApproval,
  sourceChainId,
  targetChainId,
  protocol,
  amount,
  sourceTxHash,
  deliveryStatus,
  deliveryStatusError,
  sourceExplorerLink,
  providerExplorerLink,
  destinationExplorerLink,
  onRetry,
  onClose,
}: BridgeConfirmModalProps) {
  const isOpen = submissionStep !== 'idle'
  const isSettled = submissionStep === 'completed' || submissionStep === 'failed'

  // Dismissing the drawer mid-submission would reset local state while
  // doBridge() keeps running in the background; a later onStatus/resolve call
  // would then silently reopen the modal. Only allow dismissal once settled.
  const handleClose = () => {
    if (isSettled) onClose()
  }

  const steps = buildSubmissionSteps(submissionStep, needsApproval, submissionFailedAtStep, submissionError)
  const progressDetails = submissionStep === 'completed' && sourceChainId !== null &&
    targetChainId !== null && protocol !== null && amount !== null
    ? { sourceChainId, targetChainId, protocol, amount }
    : null

  return (
    <Drawer open={isOpen} onClose={handleClose} height={progressDetails ? 'full' : 'half'} hideCloseButton>
      <ScrollArea width="100%" minHeight={0}>
        <YStack testID="BridgingWidget-confirm-modal" gap="$4" width="100%">
          <XStack justifyContent="space-between" alignItems="center">
            <Heading level={4} color="$textColor">
              {progressDetails ? 'Bridge status' : HEADER_COPY[submissionStep]}
            </Heading>
            {isSettled && (
              <Button size="sm" variant="ghost" onPress={onClose} aria-label="Close bridge status">
                <Icon name="x" size="sm" color="muted" />
              </Button>
            )}
          </XStack>

          {progressDetails ? (
            <BridgeProgress
              fromChainId={progressDetails.sourceChainId}
              targetChainId={progressDetails.targetChainId}
              protocol={progressDetails.protocol}
              amountLabel={formatTokenAmount(formatUnits(progressDetails.amount, getChainDecimals(progressDetails.sourceChainId)))}
              submissionStep={submissionStep}
              submissionFailedAtStep={submissionFailedAtStep}
              submissionError={submissionError}
              needsApproval={needsApproval}
              sourceTxHash={sourceTxHash}
              deliveryStatus={deliveryStatus}
              deliveryStatusError={deliveryStatusError}
              sourceExplorerLink={sourceExplorerLink}
              providerExplorerLink={providerExplorerLink}
              destinationExplorerLink={destinationExplorerLink}
            />
          ) : <Stepper steps={steps} maxHeight={280} />}

          {submissionStep === 'failed' && (
            <YStack gap="$2">
              <Text color="$error">{submissionError ?? 'Bridge transaction failed.'}</Text>
              <Button height={54} borderRadius="$full" testID="BridgingWidget-confirm-retry" onPress={onRetry}>
                <ButtonText>Retry</ButtonText>
              </Button>
            </YStack>
          )}

          {submissionStep === 'completed' && (
            <Button
              height={54}
              borderRadius="$full"
              testID="BridgingWidget-confirm-done"
              onPress={onClose}
            >
              <ButtonText>
                {deliveryStatus?.status === 'completed' || deliveryStatus?.status === 'failed'
                  ? 'Done'
                  : 'Continue in background'}
              </ButtonText>
            </Button>
          )}
        </YStack>
      </ScrollArea>
    </Drawer>
  )
}
