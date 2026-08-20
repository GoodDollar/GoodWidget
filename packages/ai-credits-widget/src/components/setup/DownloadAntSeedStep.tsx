import React from 'react'
import { Anchor, Button, ButtonText, Card, Text, XStack, YStack } from '@goodwidget/ui'

/** Direct download / landing page for the AntSeed VPR desktop application. */
const ANTSEED_DOWNLOAD_URL = 'https://antseed.com/download'

interface LockedStepProps {
  number: number
  title: string
  description: string
}

/**
 * Renders a locked (pending) onboarding step card.
 * Used for steps that cannot be started until a prior step is complete.
 */
function LockedStep({ number, title, description }: LockedStepProps) {
  return (
    <Card padding="$3" opacity={0.5}>
      <XStack gap="$3" alignItems="flex-start">
        <YStack
          width={28}
          height={28}
          borderRadius={14}
          backgroundColor="$backgroundHover"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <Text fontWeight="700" fontSize="$2" secondary>
            {number}
          </Text>
        </YStack>

        <YStack flex={1} gap="$1">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontWeight="700" secondary>
              {title}
            </Text>
            {/* Lock emoji mirrors the design reference treatment for pending steps */}
            <Text fontSize="$3">🔒</Text>
          </XStack>
          <Text secondary fontSize="$2">
            {description}
          </Text>
        </YStack>
      </XStack>
    </Card>
  )
}

/**
 * First step in the Setup onboarding flow.
 *
 * Presents a brief description of what AntSeed is and surfaces an external
 * "Start ›" link that takes the user to the AntSeed VPR/Desktop download page.
 * Subsequent steps (Signer Key, Authorize Wallet) are shown below in a locked
 * / pending state to communicate the required ordering to the user.
 */
export function DownloadAntSeedStep() {
  return (
    <YStack gap="$3" width="100%">
      {/* Step 1 — Download AntSeed (active, first actionable step) */}
      <Card padding="$3">
        <XStack gap="$3" alignItems="flex-start">
          {/* Active step badge */}
          <YStack
            width={28}
            height={28}
            borderRadius={14}
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <Text fontWeight="700" fontSize="$2" color="$onPrimary">
              1
            </Text>
          </YStack>

          {/* Step description and download action */}
          <YStack flex={1} gap="$2">
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontWeight="700">Download AntSeed</Text>
              {/* Opens the AntSeed VPR/Desktop download page in a new tab */}
              <Anchor
                href={ANTSEED_DOWNLOAD_URL}
                target="_blank"
                data-testid="download-antseed-link"
                style={{ textDecorationLine: 'none' }}
              >
                <Button size="sm" variant="ghost" gap="$1" paddingHorizontal="$2">
                  <ButtonText color="$primary" fontWeight="700" fontSize="$2">
                    Start ›
                  </ButtonText>
                </Button>
              </Anchor>
            </XStack>
            <Text secondary fontSize="$2">
              The app that runs your credits locally — required once
            </Text>
          </YStack>
        </XStack>
      </Card>

      {/* Steps 2 and 3 are locked until the prior step is completed */}
      <LockedStep
        number={2}
        title="Signer Key"
        description="Generate or import — separate from your wallet"
      />
      <LockedStep
        number={3}
        title="Authorize Wallet"
        description="One-time approval — scoped to credits only"
      />
    </YStack>
  )
}
