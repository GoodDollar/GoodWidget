import { Card, Icon, Spinner, Text, TokenAmount, XStack, YStack } from '@goodwidget/ui'
import { BonusBadgeFrame } from '../theme/cards'

interface HeroCardProps {
  gBalance: string | null
  isGoodIdVerified: boolean
}

export function AiCreditsHero({ gBalance, isGoodIdVerified }: HeroCardProps) {
  const showBonusBadge =
    gBalance !== null && Number.parseFloat(gBalance) > 0 && isGoodIdVerified

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
            <Text fontSize="$2" fontWeight="700" color="$primary">
              +10% / +20% Bonus
            </Text>
            <Text fontSize="$1" secondary>
              (GoodID)
            </Text>
          </BonusBadgeFrame>
        )}
      </XStack>
    </Card>
  )
}
