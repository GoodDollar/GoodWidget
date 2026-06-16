import { Stack } from 'tamagui'
import { Badge, BadgeText, Button, ButtonText, Card, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import type { ImpactCardMetric, ImpactCardProps } from './types'
import { formatCompactValue } from './format'

function HeroBackdrop() {
  return (
    <>
      <Stack
        position="absolute"
        top={-56}
        right={-88}
        width={280}
        height={280}
        borderRadius={999}
        borderWidth={24}
        borderColor="rgba(255,255,255,0.12)"
        opacity={0.8}
      />
      <Stack
        position="absolute"
        top={20}
        right={92}
        width={120}
        height={20}
        borderRadius={999}
        backgroundColor="rgba(255,255,255,0.12)"
      />
      <Stack
        position="absolute"
        top={44}
        right={60}
        width={72}
        height={72}
        borderRadius={999}
        backgroundColor="rgba(255,255,255,0.08)"
      />
      <Stack
        position="absolute"
        top={112}
        right={24}
        width={138}
        height={28}
        borderRadius={999}
        backgroundColor="rgba(255,255,255,0.12)"
      />
    </>
  )
}

function renderHeroAmount(metric: ImpactCardMetric, emphasized = false) {
  const valueFontSize = emphasized ? 52 : 34
  const valueLineHeight = emphasized ? 56 : 38
  const tokenFontSize = emphasized ? 30 : 20

  return (
    <YStack gap="$2">
      <Badge
        backgroundColor="rgba(255,255,255,0.18)"
        alignSelf="flex-start"
        paddingHorizontal="$3"
        paddingVertical="$2"
      >
        <BadgeText color="rgba(255,255,255,0.96)">{metric.label}</BadgeText>
      </Badge>
      <XStack alignItems="baseline" gap="$2" flexWrap="wrap">
        {metric.amount.token ? (
          <>
            <Text color="white" fontSize={tokenFontSize} lineHeight={tokenFontSize} fontWeight="700">
              {metric.amount.token}
            </Text>
            <Text color="white" fontSize={valueFontSize} lineHeight={valueLineHeight} fontWeight="800">
              {formatCompactValue(metric.amount.value)}
            </Text>
          </>
        ) : (
          <Text color="white" fontSize={valueFontSize} lineHeight={valueLineHeight} fontWeight="800">
            {formatCompactValue(metric.amount.value)}
          </Text>
        )}
      </XStack>
      {metric.amount.isStreaming ? (
        <XStack alignItems="center" gap="$2">
          <Stack width={8} height={8} borderRadius={999} backgroundColor="#00E676" />
          <Text
            color="rgba(255,255,255,0.96)"
            fontSize={12}
            lineHeight={14}
            fontWeight="700"
            textTransform="uppercase"
          >
            {metric.amount.streamLabel ?? 'Live stream active'}
          </Text>
        </XStack>
      ) : null}
    </YStack>
  )
}

function MetricColumn({
  metric,
  emphasized = false,
  withDivider = false,
}: {
  metric: ImpactCardMetric
  emphasized?: boolean
  withDivider?: boolean
}) {
  return (
    <YStack
      flex={1}
      minWidth={emphasized ? 220 : 168}
      gap="$3"
      paddingLeft={withDivider ? '$4' : undefined}
      borderLeftWidth={withDivider ? 1 : 0}
      borderLeftColor={withDivider ? 'rgba(255,255,255,0.2)' : undefined}
    >
      {renderHeroAmount(metric, emphasized)}
      {metric.description ? (
        <Text color="rgba(255,255,255,0.88)" fontSize={18} lineHeight={30}>
          {metric.description}
        </Text>
      ) : null}
    </YStack>
  )
}

export function ImpactCard({
  title,
  metrics,
  description,
  ctaLabel,
  ctaDisabled = false,
  onCtaPress,
  testID,
}: ImpactCardProps) {
  const [primaryMetric, secondaryMetric] = metrics

  return (
    <Card
      data-testid={testID}
      width="100%"
      maxWidth={720}
      gap="$5"
      overflow="hidden"
      borderWidth={0}
      backgroundColor="$primary"
      shadowColor="$elevationShadowColor"
      shadowOffset={{ width: 0, height: 14 }}
      shadowRadius={32}
      padding="$5"
      elevated
    >
      <HeroBackdrop />
      <YStack position="relative" zIndex={1} gap="$5">
        <Badge
          backgroundColor="rgba(255,255,255,0.16)"
          alignSelf="center"
          paddingHorizontal="$3"
          paddingVertical="$2"
        >
          <BadgeText color="rgba(255,255,255,0.96)">{title}</BadgeText>
        </Badge>
        <XStack flexWrap="wrap" alignItems="stretch" gap="$4">
          <MetricColumn metric={primaryMetric} emphasized />
          <MetricColumn metric={secondaryMetric} withDivider />
        </XStack>
        <Text color="rgba(255,255,255,0.92)" fontSize={18} lineHeight={30} textAlign="center">
          {description}
        </Text>
      </YStack>
      {ctaLabel ? (
        <Button
          fullWidth
          disabled={ctaDisabled}
          variant="secondary"
          onPress={onCtaPress}
          aria-label={ctaLabel}
          alignSelf="center"
          maxWidth={320}
          height={56}
          backgroundColor="rgba(255,255,255,0.98)"
          borderWidth={0}
          shadowColor="rgba(13, 24, 45, 0.18)"
          shadowOffset={{ width: 0, height: 10 }}
          shadowRadius={24}
        >
          <XStack alignItems="center" gap="$2">
            <ButtonText color="$primary" fontWeight="700">
              {ctaLabel}
            </ButtonText>
            <Icon name="external-link" size="xs" color="primary" />
          </XStack>
        </Button>
      ) : null}
    </Card>
  )
}
