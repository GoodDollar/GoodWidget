import React, { useState } from 'react'
import { Card, Icon, Text, XStack, YStack } from '@goodwidget/ui'

interface SetupBonusHighlightProps {
  /** Bonus applied to one-time deposits, in percent. */
  depositBonusPercent: number
  /** Bonus applied to monthly streams, in percent. */
  streamBonusPercent: number
  /** Whether the connected wallet is GoodID verified. */
  isGoodIdVerified: boolean
}

/**
 * Collapsible bonus banner shown above the "WHAT'S INVOLVED" summary.
 * Collapsed it states the headline bonus; expanded it explains the
 * verification requirement.
 */
export function SetupBonusHighlight({
  depositBonusPercent,
  streamBonusPercent,
  isGoodIdVerified,
}: SetupBonusHighlightProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const maxBonusPercent = Math.max(depositBonusPercent, streamBonusPercent)

  if (maxBonusPercent <= 0) return null

  return (
    <Card gap="$2" padding="$3" backgroundColor="$backgroundHover">
      <XStack
        gap="$3"
        alignItems="center"
        cursor="pointer"
        accessibilityRole="button"
        aria-expanded={isExpanded}
        onPress={() => setIsExpanded((previous) => !previous)}
      >
        <YStack
          width={34}
          height={34}
          borderRadius="$2"
          backgroundColor="$backgroundPress"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <Icon name="party-popper" size="sm" color="primary" />
        </YStack>

        <YStack flex={1} gap={2}>
          <Text fontSize="$3" fontWeight="700">
            Up to {maxBonusPercent}% more AI credits
          </Text>
          <Text fontSize="$2" lineHeight="$3">
            <Text fontSize="$2" fontWeight="700" color="$primary">
              +{depositBonusPercent}%
            </Text>
            <Text fontSize="$2" secondary>
              {' '}
              on deposits,{' '}
            </Text>
            <Text fontSize="$2" fontWeight="700" color="$primary">
              +{streamBonusPercent}%
            </Text>
            <Text fontSize="$2" secondary>
              {' '}
              on streams — paid with G$
            </Text>
          </Text>
        </YStack>

        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size="xs" color="muted" />
      </XStack>

      {isExpanded && (
        <YStack backgroundColor="$background" borderRadius="$2" padding="$3">
          <Text fontSize="$2" secondary lineHeight="$3">
            {isGoodIdVerified ? (
              <>
                Your wallet is{' '}
                <Text fontSize="$2" fontWeight="700">
                  GoodID verified
                </Text>
                , so the bonus is applied automatically to deposits and streams.
              </>
            ) : (
              <>
                Bonus applies to{' '}
                <Text fontSize="$2" fontWeight="700">
                  verified GoodDollar wallets
                </Text>{' '}
                only. Not verified? Claim UBI first via GoodWallet or GoodDapp — takes a minute,
                then this kicks in automatically.
              </>
            )}
          </Text>
        </YStack>
      )}
    </Card>
  )
}
