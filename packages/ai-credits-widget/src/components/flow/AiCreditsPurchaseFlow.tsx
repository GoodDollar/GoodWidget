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
  // Starts unset (not `activeStep`): the Drawer stays closed until the user opens it,
  // and Tamagui's Sheet keeps its Frame mounted (off-screen, not removed) while closed.
  // Eagerly setting this to the current step would mount that step's interactive content
  // (e.g. the consent panel's "Sign Operator Consent" button) into the DOM before the
  // Drawer is ever opened, duplicating the visible trigger button below with an
  // identically-named, off-screen element.
  const [drawerStep, setDrawerStep] = useState<AiCreditsFlowStep | null>(null)
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

    // Only follow the flow into the drawer when it advances past a step the user has
    // already reached (e.g. buyer_key -> consent). On the very first step of a session
    // (previousStep is null) we leave drawerStep unset so nothing renders into the
    // closed Drawer -- the user reveals it explicitly via the trigger button/stepper.
    if (previousStep != null && previousStep !== activeStep) {
      setDrawerStep(activeStep)
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
            operatorSignature={state.operatorSignature ?? null}
            operatorConsented={state.operatorConsented}
            operatorConsentPending={state.operatorConsentPending}
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
            depositBonusPercent={state.depositBonusPercent}
            streamBonusPercent={state.streamBonusPercent}
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
