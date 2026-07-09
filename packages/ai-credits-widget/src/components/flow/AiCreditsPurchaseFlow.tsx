import React, { useEffect, useMemo, useState } from 'react'
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
  const [buyerPubKeySaved, setBuyerPubKeySaved] = useState(false)
  const activeStep = getAiCreditsActiveFlowStep(state, buyerPubKeySaved)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerStep, setDrawerStep] = useState<AiCreditsFlowStep | null>(activeStep)

  useEffect(() => {
    setBuyerPubKeySaved(false)
  }, [state.buyerPubKey])

  useEffect(() => {
    if (activeStep !== 'consent' || state.operatorConsentSigned) return
    if (!state.address || !state.buyerPubKey) return
    void actions.syncOperatorConsentFromChain()
  }, [activeStep, state.operatorConsentSigned, state.address, state.buyerPubKey, actions])

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

  const actionLabel = getActiveFlowStepActionLabel(state, activeStep, buyerPubKeySaved)

  const handleQuoteUpdate = useMemo(
    () => (depositG: string, streamG: string) => actions.updateQuote(depositG, streamG),
    [actions],
  )

  function renderDrawerContent(step: AiCreditsFlowStep | null) {
    if (!step) return null

    switch (step) {
      case 'buyer_key':
        return (
          <BuyerKeyPanel
            embedded
            buyerPubKey={state.buyerPubKey}
            buyerKeyPrivate={state.buyerKeyPrivate ?? null}
            buyerPubKeySaved={buyerPubKeySaved}
            onGenerate={actions.generateBuyerKey}
            onConfirm={() => setBuyerPubKeySaved(true)}
          />
        )
      case 'consent':
        return (
          <OperatorConsentStep
            embedded
            buyerPubKey={state.buyerPubKey}
            buyerKeyPrivate={state.buyerKeyPrivate ?? null}
            operatorConsentSigned={state.operatorConsentSigned}
            onSign={actions.signOperatorConsent}
          />
        )
      case 'pay':
        return (
          <AmountPicker
            embedded
            gBalance={state.gBalance}
            minDepositUsd={state.minDepositUsd}
            minStreamUsd={state.minStreamUsd}
            quote={state.quote}
            gdUsdPerToken={state.gdUsdPerToken}
            isGoodIdVerified={state.isGoodIdVerified}
            canPay={canPay}
            payDisabledMessage={payDisabledMessage}
            isPayPending={isPending}
            onQuoteUpdate={handleQuoteUpdate}
            onPay={onPay}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      <AiCreditsFlowStepper
        state={state}
        buyerPubKeySaved={buyerPubKeySaved}
        onStepPress={handleStepPress}
      />
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
