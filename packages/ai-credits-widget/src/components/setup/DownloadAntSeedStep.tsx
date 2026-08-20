import { Anchor, Card, Icon, Text, XStack, YStack } from '@goodwidget/ui'

/**
 * URL pointing to the AntSeed VPR/Desktop download page.
 * This is the primary call-to-action for the Download AntSeed setup step.
 */
const ANTSEED_DOWNLOAD_URL = 'https://antseed.com/download'

/**
 * The first actionable step in the Setup onboarding stepper.
 *
 * Renders a card with the step number badge, title, description, and a
 * "Start ›" external link that opens the AntSeed VPR/Desktop download page
 * in a new tab.
 */
export function DownloadAntSeedStep() {
  return (
    <Card>
      <XStack gap="$3" alignItems="center" padding="$3" justifyContent="space-between">
        {/* Step number badge + text */}
        <XStack gap="$3" alignItems="flex-start" flex={1}>
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

          <YStack flex={1} gap="$1">
            <Text fontWeight="700">Download AntSeed</Text>
            <Text secondary fontSize="$2">
              The app that runs your credits locally — required once
            </Text>
          </YStack>
        </XStack>

        {/* "Start ›" external link — opens AntSeed VPR/Desktop download in a new tab */}
        <YStack flexShrink={0}>
          <Anchor href={ANTSEED_DOWNLOAD_URL} target="_blank">
            <XStack gap="$1" alignItems="center">
              <Text color="$primary" fontWeight="700" fontSize="$2">
                Start
              </Text>
              <Icon name="chevron-right" size="xs" color="primary" />
            </XStack>
          </Anchor>
        </YStack>
      </XStack>
    </Card>
  )
}
