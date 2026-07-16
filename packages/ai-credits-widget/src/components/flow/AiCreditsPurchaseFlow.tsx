import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, ButtonText, Drawer, ScrollArea, YStack } from '@goodwidget/ui'
import type {
  AiCreditsQuote,
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterState,
} from '../../widgetRuntimeContract'
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
  isPending: boolean
  onPay: (quote: AiCreditsQuote) => void
}

export function AiCreditsPurchaseFlow({
  state,
  actions,
  isPending,
  onPay,
}: AiCreditsPurchaseFlowProps) {
  const [buyerPubKeySaved, setBuyerPubKeySaved] = useState(false)
  const activeStep = getAiCreditsActiveFlowStep(state, buyerPubKeySaved)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerStep, setDrawerStep] = useState<AiCreditsFlowStep | null>(activeStep)
  const prevActiveStepRef = useRef<AiCreditsFlowStep | null>(null)
  const goodIdTabPendingRef = useRef(false)

  useEffect(() => {
    setBuyerPubKeySaved(false)
  }, [state.buyerPubKey])

  useEffect(() => {
    if (activeStep !== 'consent' || state.operatorConsented) return
    if (!state.address || !state.buyerPubKey) return
    void actions.syncOperatorConsentFromChain()
  }, [activeStep, state.operatorConsented, state.address, state.buyerPubKey, actions])

  useEffect(() => {
    if (!activeStep) {
      setDrawerOpen(false)
      setDrawerStep(null)
      prevActiveStepRef.current = null
      return
    }

    const previousStep = prevActiveStepRef.current
    prevActiveStepRef.current = activeStep
    setDrawerStep(activeStep)

    if (previousStep == null) {
      setDrawerOpen(false)
    } else if (previousStep !== activeStep) {
      setDrawerOpen(true)
    }
  }, [activeStep])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onFocus = () => {
      if (!goodIdTabPendingRef.current) return
      goodIdTabPendingRef.current = false
      if (activeStep === 'pay') {
        setDrawerStep('pay')
        setDrawerOpen(true)
      }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [activeStep])

  const handleVerifyGoodId = useCallback(async () => {
    try {
      const started = await actions.verifyGoodId()
      if (started) {
        goodIdTabPendingRef.current = true
      }
    } finally {
      if (activeStep === 'pay') {
        setDrawerStep('pay')
        setDrawerOpen(true)
      }
    }
  }, [actions, activeStep])

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

  function renderDrawerContent(step: AiCreditsFlowStep | null) {
    if (!step) return null

    switch (step) {
      case 'buyer_key':
        return (
          <BuyerKeyPanel
            embedded
            buyerPubKey={state.buyerPubKey}
            buyerPrvKey={state.buyerPrvKey ?? null}
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
            buyerPrvKey={state.buyerPrvKey ?? null}
            operatorConsented={state.operatorConsented}
            onSign={actions.signOperatorConsent}
          />
        )
      case 'pay':
        return (
          <AmountPicker
            embedded
            status={state.status}
            gBalance={state.gBalance}
            minDepositUsd={state.minDepositUsd}
            minStreamUsd={state.minStreamUsd}
            monthlyStreamG={state.monthlyStreamG}
            gdUsdPerToken={state.gdUsdPerToken}
            isGoodIdVerified={state.isGoodIdVerified}
            isPayPending={isPending}
            buildQuote={actions.buildQuote}
            onPay={onPay}
            onVerifyGoodId={handleVerifyGoodId}
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
