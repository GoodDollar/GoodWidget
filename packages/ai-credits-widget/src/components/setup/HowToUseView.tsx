import React from 'react'
import { Anchor, Badge, BadgeText, Button, ButtonText, Card, Icon, Text, XStack, YStack } from '@goodwidget/ui'

/** YouTube video URL for the getting-started walkthrough. Replace with final video ID once published. */
const VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

/** Notion written guide URL. */
const WRITTEN_GUIDE_URL = 'https://antseed.notion.site'

/** Summary step with an associated widget tab label. */
interface SummaryStep {
  index: number
  title: string
  tabLabel: string
  description: string
}

const QUICK_SUMMARY_STEPS: SummaryStep[] = [
  {
    index: 1,
    title: 'First, connect your wallet',
    tabLabel: 'Buy',
    description:
      'Any wallet holding G$ works. Verified GoodDollar wallets get the bonus automatically.',
  },
  {
    index: 2,
    title: 'Then complete the one-time setup',
    tabLabel: 'Buy',
    description: 'Download Antseed, generate your signer key, and authorize your wallet — three quick taps.',
  },
  {
    index: 3,
    title: 'Head to Manage to buy or stream credits',
    tabLabel: 'Manage',
    description: 'Deposit once (+10%) or stream continuously (+20%), then confirm.',
  },
  {
    index: 4,
    title: 'Finally, connect Antseed to start using them',
    tabLabel: 'Connect',
    description:
      'Import your signer key — no separate "start" step, it just works from there.',
  },
]

interface HowToUseViewProps {
  /** Callback to return to the normal buy view. */
  onBack: () => void
}

/**
 * In-widget "How to use" guide rendered inside the Setup tab content area.
 * Provides a video card, a link to the full written guide, and a quick summary
 * of the four-step end-to-end flow.
 */
export function HowToUseView({ onBack }: HowToUseViewProps) {
  return (
    <YStack gap="$4">
      {/* Back navigation */}
      <Button variant="ghost" alignSelf="flex-start" onPress={onBack} gap="$1" paddingHorizontal="$0">
        <Icon name="arrow-left" size="xs" color="primary" />
        <ButtonText color="$primary" fontSize="$2">
          Back to setup
        </ButtonText>
      </Button>

      <Text fontSize="$2" secondary lineHeight="$3">
        New here? Start with the 3-minute video — it covers the whole journey, start to finish.
      </Text>

      {/* Video card */}
      <Anchor href={VIDEO_URL} target="_blank" style={{ textDecorationLine: 'none' }}>
        <Card
          backgroundColor="$backgroundHover"
          gap="$2"
          paddingVertical="$4"
          paddingHorizontal="$4"
          hoverStyle={{ opacity: 0.9 }}
        >
          <XStack justifyContent="flex-end">
            <Card backgroundColor="$backgroundPress" paddingHorizontal="$2" paddingVertical={2}>
              <Text fontSize="$1" fontWeight="700">
                3:12
              </Text>
            </Card>
          </XStack>

          {/* Play button placeholder */}
          <XStack justifyContent="center" paddingVertical="$6">
            <YStack
              width={56}
              height={56}
              borderRadius="$full"
              backgroundColor="$background"
              alignItems="center"
              justifyContent="center"
            >
              <Icon name="play" size="md" color="primary" />
            </YStack>
          </XStack>

          <YStack gap="$1">
            <Text fontSize="$2" fontWeight="700">
              Getting started with AI credits
            </Text>
            <Text fontSize="$1" secondary>
              Wallet → buy credits → connect Antseed
            </Text>
          </YStack>
        </Card>
      </Anchor>

      {/* Written guide card */}
      <Anchor href={WRITTEN_GUIDE_URL} target="_blank" style={{ textDecorationLine: 'none' }}>
        <Card backgroundColor="$backgroundHover" paddingVertical="$3" paddingHorizontal="$4">
          <XStack gap="$3" alignItems="center" justifyContent="space-between">
            <XStack gap="$3" alignItems="center" flex={1}>
              <Icon name="file-text" size="md" color="muted" />
              <YStack flex={1} gap="$1">
                <Text fontSize="$2" lineHeight="$3">
                  <Text fontSize="$2" fontWeight="700">
                    Full written guide{' '}
                  </Text>
                  <Text fontSize="$2" secondary>
                    Step-by-step walkthrough with screenshots, on Notion
                  </Text>
                </Text>
              </YStack>
            </XStack>
            <Icon name="external-link" size="xs" color="muted" />
          </XStack>
        </Card>
      </Anchor>

      {/* Quick summary section */}
      <YStack gap="$3">
        <Text variant="label" secondary fontSize="$1" fontWeight="700" letterSpacing={1}>
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
                <Text fontSize="$2" secondary lineHeight="$3">
                  {step.description}
                </Text>
              </YStack>
            </XStack>
          ))}
        </YStack>

        {/* Security note */}
        <Text fontSize="$1" secondary textAlign="center" paddingTop="$1">
          Your G$ wallet is never exposed — only the scoped signer key.
        </Text>
      </YStack>
    </YStack>
  )
}
