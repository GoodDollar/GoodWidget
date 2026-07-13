import { Card, Spinner, Text, TokenAmount, XStack, YStack } from '@goodwidget/ui'
import { BonusBadgeFrame } from '../theme/cards'

interface HeroCardProps {
  gBalance: string | null
  isGoodIdVerified: boolean
}

export function AiCreditsHero({ gBalance, isGoodIdVerified }: HeroCardProps) {
  const showVerifiedBadge =
    gBalance !== null && Number.parseFloat(gBalance) > 0 && isGoodIdVerified

  return (
    <Card gap="$4" backgroundColor="$backgroundHover">
      <XStack justifyContent="space-between" alignItems="flex-start" gap="$2">
        <YStack gap="$1" flexShrink={1}>
          <Text variant="label" secondary>
            Your G$ Balance
          </Text>
          {gBalance !== null ? (
            <TokenAmount token="G$" amount={gBalance} size="xl" />
          ) : (
            <Spinner size="sm" />
          )}
        </YStack>

        {showVerifiedBadge && (
          <BonusBadgeFrame borderRadius="$2" backgroundColor="$backgroundPress" flexShrink={0}>
            <Text fontSize="$2" fontWeight="700" color="$primary">
              GoodID verified
            </Text>
          </BonusBadgeFrame>
        )}
      </XStack>
    </Card>
  )
}
