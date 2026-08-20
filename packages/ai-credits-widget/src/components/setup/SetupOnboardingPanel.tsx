import React from 'react'
import {
  Anchor,
  Button,
  ButtonText,
  Card,
  Icon,
  Stepper,
  Text,
  YStack,
} from '@goodwidget/ui'
import type { StepperStepItem } from '@goodwidget/ui'

/** Stable fallback download target for AntSeed VPR/Desktop installers. */
const ANTSEED_VPR_DOWNLOAD_URL = 'https://github.com/AntSeed/antseed/releases/latest'

const SETUP_ONBOARDING_STEPS: StepperStepItem[] = [
  {
    id: 'download-antseed',
    title: 'Download AntSeed',
    description: 'Install the desktop app that runs your credits locally.',
    status: 'ready',
  },
  {
    id: 'signer-key',
    title: 'Signer Key',
    status: 'pending',
  },
  {
    id: 'authorize-wallet',
    title: 'Authorize Wallet',
    status: 'pending',
  },
]

/**
 * Setup-only onboarding shell. This slice exposes the AntSeed desktop download
 * action while leaving the later Signer Key / Authorize Wallet setup work
 * locked behind the first step.
 */
export function SetupOnboardingPanel() {
  return (
    <YStack gap="$4" width="100%">
      <Text secondary>One-time setup, in order — each step unlocks the next.</Text>

      <Stepper steps={SETUP_ONBOARDING_STEPS} activeStepId="download-antseed" maxHeight={280} />

      <Card gap="$3" padding="$4">
        <YStack gap="$2">
          <Text fontWeight="700">Download AntSeed VPR/Desktop</Text>
          <Text secondary>
            Install AntSeed before generating your signer key. It runs your AI credits locally and
            only needs to be installed once on each computer.
          </Text>
        </YStack>

        <Anchor
          href={ANTSEED_VPR_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecorationLine: 'none' }}
        >
          <Button width="100%" gap="$2">
            <Icon name="external-link" size="xs" color="primary" />
            <ButtonText>Download AntSeed VPR/Desktop</ButtonText>
          </Button>
        </Anchor>

        <Text fontSize="$1" secondary>
          Opens the latest AntSeed desktop release in a new tab.
        </Text>
      </Card>
    </YStack>
  )
}
