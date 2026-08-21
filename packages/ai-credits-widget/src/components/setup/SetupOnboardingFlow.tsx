import React, { useCallback, useState } from 'react'
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

  const steps: StepperStepItem[] = [
    {
      id: 'download',
      title: 'Download Antseed',
      description: 'The app that runs your credits locally — required once',
      status: downloadCompleted ? 'completed' : 'ready',
    },
    {
      id: 'signer',
      title: 'Signer key',
      description: 'Generate or import — separate from your wallet',
      status: !downloadCompleted ? 'pending' : hasSignerKey ? 'completed' : 'ready',
    },
    {
      id: 'authorize',
      title: 'Authorize Wallet',
      description: 'One-time permission — scoped to Base credits',
      status: !hasSignerKey ? 'pending' : state.operatorConsented ? 'completed' : 'ready',
    },
  ]

  const openSignerDrawer = useCallback(() => {
    setDrawerStep('signer')
    setDrawerOpen(true)
  }, [])

  const handleStepPress = useCallback(
    (stepId: string) => {
      if (stepId === 'download') {
        if (typeof window !== 'undefined') {
          window.open(ANTSEED_DOWNLOAD_URL, '_blank', 'noopener,noreferrer')
        }
        setDownloadOpened(true)
        return
      }

      if (stepId === 'signer' && downloadCompleted) {
        openSignerDrawer()
      }

      if (stepId === 'authorize' && hasSignerKey) {
        setDrawerStep('authorize')
        setDrawerOpen(true)
      }
    },
    [downloadCompleted, hasSignerKey, openSignerDrawer],
  )

  return (
    <>
      <Stepper
        steps={steps}
        activeStepId={downloadCompleted ? (hasSignerKey ? 'authorize' : 'signer') : 'download'}
        onStepPress={handleStepPress}
      />
      <Drawer
        open={drawerOpen && drawerStep !== null}
        onClose={() => {
          setDrawerOpen(false)
        }}
        height="full"
      >
        <ScrollArea width="100%">
          <YStack gap="$3" paddingBottom="$4" width="100%">
            {drawerStep === 'signer' ? <SignerKeyPanel state={state} actions={actions} /> : null}
            {drawerStep === 'authorize' ? (
              <OperatorConsentStep
                embedded
                buyerPubKey={state.buyerPubKey}
                buyerPrvKey={state.buyerPrvKey ?? null}
                operatorSignature={state.operatorSignature ?? null}
                operatorConsented={state.operatorConsented}
                operatorConsentPending={state.operatorConsentPending}
                onSign={actions.signOperatorConsent}
              />
            ) : null}
          </YStack>
        </ScrollArea>
      </Drawer>
    </>
  )
}
