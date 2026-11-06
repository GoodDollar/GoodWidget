import React from 'react'
import { Button, ButtonText, Drawer, Heading, Icon, Stepper, Text, XStack, YStack } from '@goodwidget/ui'
import { buildSubmissionSteps } from '../adapter/submissionSteps'
import type { BridgeSubmissionStep } from '../adapter/useBridgeSubmission'

interface BridgeConfirmModalProps {
  submissionStep: BridgeSubmissionStep
  submissionFailedAtStep: 'approving' | 'bridging' | null
  submissionError: string | null
  needsApproval: boolean
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

  return (
    <Drawer open={isOpen} onClose={handleClose} height="half" hideCloseButton>
      <YStack testID="BridgingWidget-confirm-modal" gap="$4" width="100%">
        <XStack justifyContent="space-between" alignItems="center">
          <Heading level={4} color="$textColor">
            {HEADER_COPY[submissionStep]}
          </Heading>
          {isSettled && (
            <XStack cursor="pointer" onPress={onClose}>
              <Icon name="x" size="sm" color="muted" />
            </XStack>
          )}
        </XStack>

        <Stepper steps={steps} maxHeight={280} />

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
            <ButtonText>Done</ButtonText>
          </Button>
        )}
      </YStack>
    </Drawer>
  )
}
