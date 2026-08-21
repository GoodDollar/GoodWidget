import React, { useCallback, useState } from 'react'
import { Drawer, ScrollArea, Stepper, YStack } from '@goodwidget/ui'
import type { StepperStepItem } from '@goodwidget/ui'
import type {
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterState,
} from '../../widgetRuntimeContract'
import { SignerKeyPanel } from './SignerKeyPanel'

const ANTSEED_DOWNLOAD_URL = 'https://antseed.com'

type SetupDrawerStep = 'signer'

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
      title: 'Authorize wallet',
      description: 'One-time approval — scoped to credits only',
      status: !hasSignerKey ? 'pending' : state.operatorConsented ? 'completed' : 'pending',
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
    },
    [downloadCompleted, openSignerDrawer],
  )

  return (
    <>
      <Stepper
        steps={steps}
        activeStepId={downloadCompleted ? (hasSignerKey ? 'authorize' : 'signer') : 'download'}
        onStepPress={handleStepPress}
      />
      <Drawer
        open={drawerOpen && drawerStep === 'signer'}
        onClose={() => {
          setDrawerOpen(false)
        }}
        height="full"
      >
        <ScrollArea width="100%">
          <YStack gap="$3" paddingBottom="$4" width="100%">
            {drawerStep === 'signer' ? <SignerKeyPanel state={state} actions={actions} /> : null}
          </YStack>
        </ScrollArea>
      </Drawer>
    </>
  )
}
