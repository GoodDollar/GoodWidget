import React from 'react'
import { Anchor, Button, ButtonText, Separator, Text, XStack, YStack } from '@goodwidget/ui'
import { BonusHighlight } from './BonusHighlight'

/** GoodReserve swap page — where G$ is bought directly from the reserve on Celo. */
const GOODDAPP_RESERVE_URL = 'https://ubi.gd/4xcXfOt'

interface GuidanceCardProps {
  /** Callback to display the How to use guide inside the widget. */
  onHowToUse: () => void
  /** Callback to display the FAQ inside the widget. */
  onFaq: () => void
  /** Which help view is currently active, used to highlight the active button. */
  activeHelpView: 'how-to-use' | 'faq' | null
  /** Bonus applied to one-time deposits, in percent. */
  depositBonusPercent: number
  /** Bonus applied to monthly streams, in percent. */
  streamBonusPercent: number
  /** Whether the connected wallet is GoodID verified. */
  isGoodIdVerified: boolean
}

/**
 * Guidance card rendered above the widget tab navigation.
 * Presents a concise "WHAT'S INVOLVED" summary and two entry points:
 *   - How to use (in-widget guide)
 *   - FAQs (in-widget FAQ)
 */
export function GuidanceCard({
  onHowToUse,
  onFaq,
  activeHelpView,
  depositBonusPercent,
  streamBonusPercent,
  isGoodIdVerified,
}: GuidanceCardProps) {
  return (
    // Rendered flush on the widget background — no card surface, so it reads as
    // part of the header rather than a separate panel.
    <YStack gap="$3" paddingHorizontal="$1">
      {/* Tagline */}
      <Text fontSize="$3" tone="soft" lineHeight="$4">
        Buy AI credits with G$ and get an API key for Claude Code, Codex and other AI tools. No install needed.
      </Text>

      <BonusHighlight
        depositBonusPercent={depositBonusPercent}
        streamBonusPercent={streamBonusPercent}
        isGoodIdVerified={isGoodIdVerified}
      />

      {/* WHAT'S INVOLVED section */}
      <YStack gap="$1">
        <Text variant="label" tone="soft" fontSize="$1" fontWeight="700" letterSpacing={1}>
          WHAT&apos;S INVOLVED:
        </Text>
      </YStack>

      <YStack gap="$3">
        {/* Step 1 */}
        <XStack gap="$3" alignItems="flex-start">
          <YStack
            width={22}
            height={22}
            borderRadius="$full"
            backgroundColor="$backgroundHover"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
            marginTop={2}
          >
            <Text fontSize="$1" fontWeight="700" color="$secondary">
              1
            </Text>
          </YStack>
          <Text fontSize="$2" flex={1} lineHeight="$3">
            <Text fontSize="$2" fontWeight="700">
              Get G${' '}
            </Text>
            <Text fontSize="$2" tone="soft">
              — claim G$ UBI or{' '}
            </Text>
            {/* Anchor styles itself at $3, so the nested Text pins it to the
                surrounding $2 and carries the link colour. */}
            <Anchor href={GOODDAPP_RESERVE_URL}>
              <Text fontSize="$2" color="$primary" textDecorationLine="underline">
                buy G$
              </Text>
            </Anchor>
            <Text fontSize="$2" tone="soft">
              {' '}
              on celo to purchase AI credits.
            </Text>
          </Text>
        </XStack>

        {/* Step 2 */}
        <XStack gap="$3" alignItems="flex-start">
          <YStack
            width={22}
            height={22}
            borderRadius="$full"
            backgroundColor="$backgroundHover"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
            marginTop={2}
          >
            <Text fontSize="$1" fontWeight="700" color="$secondary">
              2
            </Text>
          </YStack>
          <Text fontSize="$2" flex={1} lineHeight="$3">
            <Text fontSize="$2" fontWeight="700">
              Get your API key{' '}
            </Text>
            <Text fontSize="$2" tone="soft">
              — buy credits to receive a key you can paste into your AI tool.
            </Text>
          </Text>
        </XStack>
      </YStack>

      <Separator />

      {/* Action buttons — compact, rectangular; widths follow label length. */}
      <XStack gap="$2" flexWrap="wrap">
        {/* How to use */}
        <Button
          flexGrow={1}
          flexBasis="auto"
          size="sm"
          variant={activeHelpView === 'how-to-use' ? 'primary' : 'outline'}
          onPress={onHowToUse}
          borderRadius="$3"
          paddingHorizontal="$2"
          minWidth={0}
        >
          <ButtonText numberOfLines={1}>How to use</ButtonText>
        </Button>

        {/* FAQs */}
        <Button
          flexGrow={1}
          flexBasis="auto"
          size="sm"
          variant={activeHelpView === 'faq' ? 'primary' : 'outline'}
          onPress={onFaq}
          borderRadius="$3"
          paddingHorizontal="$2"
          minWidth={0}
        >
          <ButtonText numberOfLines={1}>FAQs</ButtonText>
        </Button>
      </XStack>
    </YStack>
  )
}
