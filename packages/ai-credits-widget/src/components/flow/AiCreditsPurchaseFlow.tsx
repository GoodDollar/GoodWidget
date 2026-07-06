import React, { useCallback, useEffect, useState } from 'react'
import { Button, ButtonText, Drawer, YStack } from '@goodwidget/ui'
import type { AiCreditsWidgetAdapterActions, AiCreditsWidgetAdapterState } from '../../widgetRuntimeContract'
import { AmountPicker } from '../buy/AmountPicker'
import { BuyerKeyPanel } from '../buy/BuyerKeyPanel'
import { OperatorConsentStep } from '../buy/OperatorConsentStep'
import { AiCreditsFlowStepper } from './AiCreditsFlowStepper'
import type { AiCreditsFlowStep } from './types'
import { getActiveFlowStepActionLabel, getAiCreditsActiveFlowStep } from './purchaseFlowUtils'

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
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [drawerStep, setDrawerStep] = useState<AiCreditsFlowStep | null>(activeStep)

  useEffect(() => {
    if (!activeStep) {
      setDrawerOpen(false)
      return
    }
    setDrawerStep(activeStep)
    setDrawerOpen(true)
  }, [activeStep])

  const openDrawer = useCallback((step: AiCreditsFlowStep) => {
    setDrawerStep(step)
    setDrawerOpen(true)
  }, [])

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
            quote={state.quote}
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
        height={drawerStep === 'pay' ? 'full' : 'half'}
      >
        <YStack gap="$3" paddingBottom="$2">
          {renderDrawerContent(drawerStep)}
        </YStack>
      </Drawer>
    </>
  )
}

