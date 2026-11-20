import React from 'react'
import { Badge, BadgeText, Button, ButtonText, Icon, Text, XStack, YStack } from '@goodwidget/ui'

/** Summary step with an associated widget tab label. */
interface SummaryStep {
  index: number
  title: string
  tabLabel: string
  description: string
}

// Three-step gateway flow: get G$, buy credits, use the key.
const QUICK_SUMMARY_STEPS: SummaryStep[] = [
  {
    index: 1,
    title: 'Get G$ and connect your wallet',
    tabLabel: 'Buy Credits',
    description:
      'Any wallet holding G$ works. If your wallet is GoodDollar-verified, the bonus is applied automatically.',
  },
  {
    index: 2,
    title: 'Buy credits and save your API key',
    tabLabel: 'Buy Credits',
    description:
      'Deposit once (+10% if verified) or subscribe continuously (+20% if verified), then confirm. Your API key is shown once after your first purchase, so save it somewhere safe.',
  },
  {
    index: 3,
    title: 'Paste the base URL and key into your AI tool',
    tabLabel: 'API Key',
    description:
      'Add the base URL and key to Claude Code, Codex or any compatible tool. Track your spend and manage your key under API Key, and view your credit history under History.',
  },
]

interface HowToUseViewProps {
  /** Callback to return to the normal tab view. */
  onBack: () => void
}

/**
 * In-widget "How to use" guide rendered in place of the tab content.
 * Shows a quick summary of the three-step end-to-end flow.
 */
export function HowToUseView({ onBack }: HowToUseViewProps) {
  return (
    <YStack gap="$4">
      {/* Back navigation */}
      <Button variant="text" alignSelf="flex-start" onPress={onBack} gap="$1">
        <Icon name="arrow-left" size="xs" color="primary" />
        <ButtonText color="$primary" fontSize="$2">
          Back
        </ButtonText>
      </Button>

      {/* RESTORE: walkthrough video and written-guide link go here once they are re-recorded for the API key flow. */}

      {/* Quick summary section */}
      <YStack gap="$3">
        <Text variant="label" tone="soft" fontSize="$1" fontWeight="700" letterSpacing={1}>
          QUICK SUMMARY
        </Text>

        <YStack gap="$4">
          {QUICK_SUMMARY_STEPS.map((step) => (
            <XStack key={step.index} gap="$3" alignItems="flex-start">
              {/* Step number circle */}
              <YStack
                width={24}
                height={24}
                borderRadius="$full"
                backgroundColor="$backgroundHover"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
                marginTop={2}
              >
                <Text fontSize="$1" fontWeight="700" color="$secondary">
                  {step.index}
                </Text>
              </YStack>

              {/* Step content */}
              <YStack flex={1} gap="$1">
                <XStack gap="$2" alignItems="center" flexWrap="wrap">
                  <Text fontSize="$2" fontWeight="700">
                    {step.title}
                  </Text>
                  <Badge size="sm">
                    <BadgeText>{step.tabLabel}</BadgeText>
                  </Badge>
                </XStack>
                <Text fontSize="$2" tone="soft" lineHeight="$3">
                  {step.description}
                </Text>
              </YStack>
            </XStack>
          ))}
        </YStack>
      </YStack>
    </YStack>
  )
}
