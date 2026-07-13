import { Card, Icon, Spinner, Text, TokenAmount, XStack, YStack } from '@goodwidget/ui'
import { BonusBadgeFrame } from '../theme/cards'

interface HeroCardProps {
  gBalance: string | null
  isGoodIdVerified: boolean
  depositBonusPercent: number
  streamBonusPercent: number
}

export function AiCreditsHero({
  gBalance,
  isGoodIdVerified,
  depositBonusPercent,
  streamBonusPercent,
}: HeroCardProps) {
  const showBonusBadge =
    gBalance !== null &&
    Number.parseFloat(gBalance) > 0 &&
    isGoodIdVerified &&
    (depositBonusPercent > 0 || streamBonusPercent > 0)

  return (
    <Card gap="$4" backgroundColor="$backgroundHover">
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack gap="$1">
          <Text variant="label" secondary>
            Your G$ Balance
          </Text>
          {gBalance !== null ? (
            <TokenAmount token="G$" amount={gBalance} size="xl" />
          ) : (
            <Spinner size="sm" />
          )}
        </YStack>

        {showBonusBadge && (
          <BonusBadgeFrame backgroundColor="$backgroundPress">
            <Icon name="info" size="xs" color="primary" />
            <YStack gap="$0.5" alignItems="flex-end">
              {depositBonusPercent > 0 && (
                <Text fontSize="$2" fontWeight="700" color="$primary">
                  +{depositBonusPercent}% deposit
                </Text>
              )}
              {streamBonusPercent > 0 && (
                <Text fontSize="$2" fontWeight="700" color="$primary">
                  +{streamBonusPercent}% stream
                </Text>
              )}
              <Text fontSize="$1" secondary>
                GoodID bonus
              </Text>
            </YStack>
          </BonusBadgeFrame>
        )}
      </XStack>
    </Card>
  )
}
