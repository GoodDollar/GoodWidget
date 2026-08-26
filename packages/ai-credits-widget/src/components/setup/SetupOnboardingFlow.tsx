import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Drawer, ScrollArea, Stepper, YStack } from '@goodwidget/ui'
import type { StepperStepItem } from '@goodwidget/ui'
import type {
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterState,
} from '../../widgetRuntimeContract'
import { SignerKeyPanel } from './SignerKeyPanel'
import { OperatorConsentStep } from '../buy/OperatorConsentStep'

const ANTSEED_DOWNLOAD_URL = 'https://antseed.com'

type SetupDrawerStep = 'signer' | 'authorize'

interface SetupOnboardingFlowProps {
  state: AiCreditsWidgetAdapterState
  actions: AiCreditsWidgetAdapterActions
}

export function SetupOnboardingFlow({ state, actions }: SetupOnboardingFlowProps) {
  const [downloadOpened, setDownloadOpened] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerStep, setDrawerStep] = useState<SetupDrawerStep | null>(null)

  const hasSignerKey = Boolean(state.buyerPubKey)
  const downloadCompleted = downloadOpened || hasSignerKey

  // Authorization lives on chain, not in this browser. Someone arriving on a new
  // device — or carrying a stale "not authorized" from an earlier session — would
  // otherwise be asked to re-authorize something they already granted.
  //
  // `actions` is rebuilt on every state change, so the check is keyed on the pair
  // it actually depends on; without that it would re-read the chain each render.
  const syncedConsentForRef = useRef<string | null>(null)
  useEffect(() => {
    if (!state.address || !state.buyerPubKey || state.operatorConsented) return
    const key = `${state.address}:${state.buyerPubKey}`.toLowerCase()
    if (syncedConsentForRef.current === key) return
    syncedConsentForRef.current = key
    void actions.syncOperatorConsentFromChain()
  }, [state.address, state.buyerPubKey, state.operatorConsented, actions])

  // None of these gate the widget: every step stays open so a first-time
  // visitor can read through the flow, skip it, and come back later. Steps that
  // are not the natural next one render as `optional` rather than locked.
  const steps: StepperStepItem[] = [
    {
      id: 'download',
      title: 'Download Antseed',
      description: 'The app that runs your credits locally — do this whenever you are ready',
      status: downloadCompleted ? 'completed' : 'ready',
    },
    {
      id: 'signer',
      title: 'Signer key',
      description: 'Generate or import — separate from your wallet',
      status: hasSignerKey ? 'completed' : downloadCompleted ? 'ready' : 'pending',
      optional: true,
    },
    {
      id: 'authorize',
      title: 'Authorize Wallet',
      description: 'One-time permission — scoped to Base credits',
      status: state.operatorConsented ? 'completed' : hasSignerKey ? 'ready' : 'pending',
      optional: true,
    },
  ]

  const openSignerDrawer = useCallback(() => {
    setDrawerStep('signer')
    setDrawerOpen(true)
  }, [])

  // A settled signer leaves exactly one step open: authorizing the wallet. Move
  // the drawer there instead of dropping the user back on the stepper — unless
  // the signer already carries consent, in which case setup is done.
  const handleSignerReady = useCallback(() => {
    if (state.operatorConsented) {
      setDrawerOpen(false)
      setDrawerStep(null)
      return
    }
    setDrawerStep('authorize')
  }, [state.operatorConsented])

  const handleStepPress = useCallback(
    (stepId: string) => {
      if (stepId === 'download') {
        if (typeof window !== 'undefined') {
          window.open(ANTSEED_DOWNLOAD_URL, '_blank', 'noopener,noreferrer')
        }
        setDownloadOpened(true)
        return
      }

      if (stepId === 'signer') {
        openSignerDrawer()
        return
      }

      // Authorizing needs a key to sign with, so an early tap lands on the
      // signer panel instead of a dead end — it hands off to authorize on its own.
      if (stepId === 'authorize') {
        if (!hasSignerKey) {
          openSignerDrawer()
          return
        }
        setDrawerStep('authorize')
        setDrawerOpen(true)
      }
    },
    [hasSignerKey, openSignerDrawer],
  )

  return (
    <>
      <Stepper
        steps={steps}
        // No auto-scroll: the setup list must never pull the page to itself
        // while someone is scrolling past it.
        activeStepId={null}
        onStepPress={handleStepPress}
      />
      <Drawer
        open={drawerOpen && drawerStep !== null}
        onClose={() => {
          setDrawerOpen(false)
          setDrawerStep(null)
        }}
        height="full"
      >
        <ScrollArea width="100%">
          <YStack gap="$3" paddingBottom="$4" width="100%">
            {drawerStep === 'signer' ? (
              <SignerKeyPanel state={state} actions={actions} onProceed={handleSignerReady} />
            ) : null}
            {drawerStep === 'authorize' ? (
              <OperatorConsentStep
                embedded
                buyerPubKey={state.buyerPubKey}
                buyerPrvKey={state.buyerPrvKey ?? null}
                operatorSignature={state.operatorSignature ?? null}
                operatorConsented={state.operatorConsented}
                operatorConsentPending={state.operatorConsentPending}
                onSign={actions.signOperatorConsent}
                derivedBuyerAddress={state.derivedBuyerAddress}
                onRestoreKey={actions.generateBuyerKey}
              />
            ) : null}
          </YStack>
        </ScrollArea>
      </Drawer>
    </>
  )
}
