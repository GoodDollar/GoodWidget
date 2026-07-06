import { Icon, Spinner, Text, TokenAmount, XStack, YStack } from '@goodwidget/ui'
import { AiCreditsHeroCard, BonusBadgeFrame } from '../theme/cards'

interface HeroCardProps {
  gBalance: string | null
  isGoodIdVerified: boolean
  bonusPercent: number
}

/**
 * Displays the connected wallet's G$ balance and the applicable bonus badge.
 * The bonus is 20% for GoodID-verified users (with stream), 10% otherwise.
 */
export function AiCreditsHero({ gBalance, isGoodIdVerified, bonusPercent }: HeroCardProps) {
  return (
    <AiCreditsHeroCard>
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

        {/* Bonus badge — shown when balance > 0 */}
        {gBalance && Number.parseFloat(gBalance) > 0 && (
          <BonusBadgeFrame backgroundColor="$backgroundPress">
            <Icon name="info" size="xs" color="primary" />
            <Text fontSize="$2" fontWeight="700" color="$primary">
              +{bonusPercent}% Bonus
            </Text>
            {isGoodIdVerified && (
              <Text fontSize="$1" secondary>
                (GoodID)
              </Text>
            )}
          </BonusBadgeFrame>
        )}
      </XStack>
    </AiCreditsHeroCard>
  )
}

