import { Stepper } from '@goodwidget/ui'
import type { StepperStepItem } from '@goodwidget/ui'

const ANTSEED_DOWNLOAD_URL = 'https://antseed.com'

const SETUP_STEPS: StepperStepItem[] = [
  {
    id: 'download',
    title: 'Download Antseed',
    description: 'The app that runs your credits locally — required once',
    status: 'ready',
  },
  {
    id: 'signer',
    title: 'Signer key',
    description: 'Generate or import — separate from your wallet',
    status: 'pending',
  },
  {
    id: 'authorize',
    title: 'Authorize wallet',
    description: 'One-time approval — scoped to credits only',
    status: 'pending',
  },
]

export function DownloadAntSeedStep() {
  return (
    <Stepper
      steps={SETUP_STEPS}
      activeStepId="download"
      onStepPress={(stepId) => {
        if (stepId !== 'download') return
        if (typeof window === 'undefined') return
        window.open(ANTSEED_DOWNLOAD_URL, '_blank', 'noopener,noreferrer')
      }}
    />
  )
}
