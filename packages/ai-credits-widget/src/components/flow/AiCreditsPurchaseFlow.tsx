import React, { useCallback, useEffect, useState } from 'react'
import { Button, ButtonText, Drawer, ScrollArea, YStack } from '@goodwidget/ui'
import type { AiCreditsWidgetAdapterActions, AiCreditsWidgetAdapterState } from '../../widgetRuntimeContract'
import { AmountPicker } from '../buy/AmountPicker'
import { BuyerKeyPanel } from '../buy/BuyerKeyPanel'
import { OperatorConsentStep } from '../buy/OperatorConsentStep'
import { AiCreditsFlowStepper } from './AiCreditsFlowStepper'
import type { AiCreditsFlowStep } from './types'
import { getActiveFlowStepActionLabel, getAiCreditsActiveFlowStep } from './purchaseFlowUtils'
import { compactButtonProps } from '../shared/styles'

interface AiCreditsPurchaseFlowProps {
  state: AiCreditsWidgetAdapterState
  actions: AiCreditsWidgetAdapterActions
  canPay: boolean
  payDisabledMessage: string | null
  isPending: boolean
  onPay: () => void
}

export function AiCreditsPurchaseFlow({
  state,
  actions,
  canPay,
  payDisabledMessage,
  isPending,
  onPay,
}: AiCreditsPurchaseFlowProps) {
  const activeStep = getAiCreditsActiveFlowStep(state)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerStep, setDrawerStep] = useState<AiCreditsFlowStep | null>(activeStep)

  useEffect(() => {
    if (!activeStep) {
      setDrawerOpen(false)
      setDrawerStep(null)
      return
    }
    setDrawerStep(activeStep)
    setDrawerOpen(false)
  }, [activeStep])

  const openDrawer = useCallback(
    (step: AiCreditsFlowStep) => {
      if (step !== activeStep && !(step === 'pay' && state.status === 'payment_failed')) return
      setDrawerStep(step)
      setDrawerOpen(true)
    },
    [activeStep, state.status],
  )

  const handleStepPress = useCallback(
    (stepId: string) => {
      openDrawer(stepId as AiCreditsFlowStep)
    },
    [openDrawer],
  )

  const actionLabel = getActiveFlowStepActionLabel(state, activeStep)

  function renderDrawerContent(step: AiCreditsFlowStep | null) {
    if (!step) return null

    switch (step) {
      case 'buyer_key':
        return (
          <BuyerKeyPanel
            embedded
            buyerKey={state.buyerKey}
            buyerKeyPrivate={state.buyerKeyPrivate ?? null}
            buyerKeyConfirmed={state.buyerKeyConfirmed}
            onGenerate={actions.generateBuyerKey}
            onConfirm={actions.confirmBuyerKey}
          />
        )
      case 'consent':
        return (
          <OperatorConsentStep
            embedded
            buyerKey={state.buyerKey}
            buyerKeyPrivate={state.buyerKeyPrivate ?? null}
            operatorConsentSigned={state.operatorConsentSigned}
            onSign={actions.signOperatorConsent}
          />
        )
      case 'pay':
        return (
          <AmountPicker
            embedded
            depositAmount={state.depositAmount}
            streamAmount={state.streamAmount}
            gBalance={state.gBalance}
            minDepositG={state.minDepositG}
            minStreamG={state.minStreamG}
            minDepositUsd={state.minDepositUsd}
            minStreamUsd={state.minStreamUsd}
            quote={state.quote}
            isGoodIdVerified={state.isGoodIdVerified}
            canPay={canPay}
            payDisabledMessage={payDisabledMessage}
            isPayPending={isPending}
            onDepositChange={actions.setDepositAmount}
            onStreamChange={actions.setStreamAmount}
            onPay={onPay}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      <AiCreditsFlowStepper state={state} onStepPress={handleStepPress} />
      {!drawerOpen && actionLabel && activeStep && (
        <Button
          fullWidth
          size="sm"
          {...compactButtonProps}
          onPress={() => {
            openDrawer(activeStep)
          }}
        >
          <ButtonText>{actionLabel}</ButtonText>
        </Button>
      )}
      <Drawer
        open={drawerOpen && drawerStep !== null}
        onClose={() => {
          setDrawerOpen(false)
        }}
        height="full"
      >
        <ScrollArea width="100%">
          <YStack gap="$3" paddingBottom="$4" width="100%">
            {renderDrawerContent(drawerStep)}
          </YStack>
        </ScrollArea>
      </Drawer>
    </>
  )
}

