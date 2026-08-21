import React from 'react'
import { Anchor, Button, ButtonText, Card, Separator, Text, XStack, YStack } from '@goodwidget/ui'

const ANTSEED_DOWNLOAD_URL = 'https://antseed.com/'

type StepStatus = 'active' | 'locked'

interface SetupStep {
  id: string
  number: number
  title: string
  description: string
  status: StepStatus
  actionLabel?: string
  href?: string
}

const SETUP_STEPS: SetupStep[] = [
  {
    id: 'download',
    number: 1,
    title: 'Download Antseed',
    description: 'The app that runs your credits locally — required once',
    status: 'active',
    actionLabel: 'Start ›',
    href: ANTSEED_DOWNLOAD_URL,
  },
  {
    id: 'signer',
    number: 2,
    title: 'Signer key',
    description: 'Generate or import — separate from your wallet',
    status: 'locked',
  },
  {
    id: 'authorize',
    number: 3,
    title: 'Authorize wallet',
    description: 'One-time approval — scoped to credits only',
    status: 'locked',
  },
  {
    id: 'buy',
    number: 4,
    title: 'Buy credits',
    description: 'Deposit (+10%) or stream (+20%) G$',
    status: 'locked',
  },
]

function StepMarker({ number, status }: { number: number; status: StepStatus }) {
  const active = status === 'active'
  return (
    <YStack
      width={28}
      height={28}
      borderRadius={14}
      backgroundColor={active ? '$primary' : '$backgroundHover'}
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
    >
      <Text
        fontWeight="700"
        fontSize="$2"
        color={active ? '$onPrimary' : undefined}
        secondary={!active}
      >
        {number}
      </Text>
    </YStack>
  )
}

function SetupStepRow({ step, showSeparator }: { step: SetupStep; showSeparator: boolean }) {
  const locked = step.status === 'locked'

  return (
    <YStack width="100%">
      <XStack gap="$3" alignItems="flex-start" paddingVertical="$3" opacity={locked ? 0.55 : 1}>
        <StepMarker number={step.number} status={step.status} />
        <YStack flex={1} gap="$1">
          <XStack justifyContent="space-between" alignItems="center" gap="$2">
            <Text fontWeight="700" secondary={locked} flex={1}>
              {step.title}
            </Text>
            {step.href && step.actionLabel ? (
              <Anchor
                href={step.href}
                target="_blank"
                data-testid="download-antseed-link"
                style={{ textDecorationLine: 'none' }}
              >
                <Button size="sm" variant="ghost" gap="$1" paddingHorizontal="$2">
                  <ButtonText color="$primary" fontWeight="700" fontSize="$2">
                    {step.actionLabel}
                  </ButtonText>
                </Button>
              </Anchor>
            ) : locked ? (
              <Text fontSize="$3" color="$warning">
                🔒
              </Text>
            ) : null}
          </XStack>
          <Text secondary fontSize="$2">
            {step.description}
          </Text>
        </YStack>
      </XStack>
      {showSeparator ? <Separator /> : null}
    </YStack>
  )
}

export function DownloadAntSeedStep() {
  return (
    <Card paddingHorizontal="$3" paddingVertical="$1" width="100%">
      {SETUP_STEPS.map((step, index) => (
        <SetupStepRow
          key={step.id}
          step={step}
          showSeparator={index < SETUP_STEPS.length - 1}
        />
      ))}
    </Card>
  )
}
