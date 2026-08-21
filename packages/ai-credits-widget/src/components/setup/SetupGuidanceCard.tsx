import React from 'react'
import { Anchor, Button, ButtonText, Icon, Separator, Text, XStack, YStack } from '@goodwidget/ui'
import { SetupBonusHighlight } from './SetupBonusHighlight'

/** URL for the AntSeed website, opened in a new browser tab. */
const ANTSEED_SITE_URL = 'https://antseed.com'

interface SetupGuidanceCardProps {
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
 * Presents a concise "WHAT'S INVOLVED" summary and three entry points:
 *   - How to use (in-widget guide)
 *   - AntSeed site (external link)
 *   - FAQs (in-widget FAQ)
 */
export function SetupGuidanceCard({
  onHowToUse,
  onFaq,
  activeHelpView,
  depositBonusPercent,
  streamBonusPercent,
  isGoodIdVerified,
}: SetupGuidanceCardProps) {
  return (
    // Rendered flush on the widget background — no card surface, so it reads as
    // part of the header rather than a separate panel.
    <YStack gap="$3" paddingHorizontal="$1">
      {/* Tagline */}
      <Text fontSize="$3" secondary lineHeight="$4">
        Buy AI credits with G$ for Claude Code, Codex, chat &amp; other AI tools.
      </Text>

      <SetupBonusHighlight
        depositBonusPercent={depositBonusPercent}
        streamBonusPercent={streamBonusPercent}
        isGoodIdVerified={isGoodIdVerified}
      />

      {/* WHAT'S INVOLVED section */}
      <YStack gap="$1">
        <Text variant="label" secondary fontSize="$1" fontWeight="700" letterSpacing={1}>
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
            <Text fontSize="$2" secondary>
              — claim UBI via GoodWallet, or buy G$ with your wallet of choice
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
              Download Antseed{' '}
            </Text>
            <Text fontSize="$2" secondary>
              — the free desktop app that runs your credits locally
            </Text>
          </Text>
        </XStack>
      </YStack>

      <Separator />

      {/* Action buttons */}
      <XStack gap="$2" flexWrap="wrap">
        {/* How to use */}
        <Button
          flex={1}
          size="sm"
          variant={activeHelpView === 'how-to-use' ? 'default' : 'outline'}
          onPress={onHowToUse}
          gap="$2"
          minWidth={0}
        >
          <Icon name="play" size="xs" color={activeHelpView === 'how-to-use' ? 'primary' : 'muted'} />
          <ButtonText numberOfLines={1}>How to use</ButtonText>
        </Button>

        {/* AntSeed site — external link */}
        <Anchor
          href={ANTSEED_SITE_URL}
          target="_blank"
          style={{ flex: 1, textDecorationLine: 'none', minWidth: 0 }}
        >
          <Button flex={1} size="sm" variant="outline" gap="$2" width="100%">
            <Icon name="external-link" size="xs" color="muted" />
            <ButtonText numberOfLines={1}>Antseed site</ButtonText>
          </Button>
        </Anchor>

        {/* FAQs */}
        <Button
          flex={1}
          size="sm"
          variant={activeHelpView === 'faq' ? 'default' : 'outline'}
          onPress={onFaq}
          gap="$2"
          minWidth={0}
        >
          {/* Red question mark matches the design reference for the FAQs button accent. */}
          <Text fontSize="$2" color="$error">
            ?
          </Text>
          <ButtonText numberOfLines={1}>FAQs</ButtonText>
        </Button>
      </XStack>
    </YStack>
  )
}
