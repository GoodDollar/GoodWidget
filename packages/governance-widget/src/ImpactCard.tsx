import { Stack } from 'tamagui'
import { Badge, BadgeText, Button, ButtonText, Card, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import type { ImpactCardMetric, ImpactCardProps } from './types'
import { formatCompactValue } from './format'

function HeroBackdrop() {
  return (
    <>
      <Stack
        position="absolute"
        top={-36}
        right={-72}
        width={220}
        height={220}
        borderRadius={999}
        borderWidth={20}
        borderColor="rgba(255,255,255,0.12)"
        opacity={0.8}
      />
      <Stack
        position="absolute"
        top={38}
        right={62}
        width={104}
        height={18}
        borderRadius={999}
        backgroundColor="rgba(255,255,255,0.12)"
      />
      <Stack
        position="absolute"
        top={58}
        right={38}
        width={64}
        height={64}
        borderRadius={999}
        backgroundColor="rgba(255,255,255,0.08)"
      />
      <Stack
        position="absolute"
        top={128}
        right={8}
        width={132}
        height={24}
        borderRadius={999}
        backgroundColor="rgba(255,255,255,0.12)"
      />
    </>
  )
}

function renderHeroAmount(metric: ImpactCardMetric, emphasized = false) {
  const valueFontSize = emphasized ? 30 : 24
  const valueLineHeight = emphasized ? 34 : 28
  const tokenFontSize = emphasized ? 18 : 14

  return (
    <YStack gap="$2" minWidth={0}>
      <Badge
        backgroundColor="rgba(255,255,255,0.18)"
        alignSelf="flex-start"
        paddingHorizontal="$2"
        paddingVertical="$2"
      >
        <BadgeText color="rgba(255,255,255,0.96)" fontSize={11} lineHeight={13} noWrap>
          {metric.label}
        </BadgeText>
      </Badge>
      <XStack alignItems="baseline" gap="$1" flexWrap="nowrap">
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
      minWidth={0}
      gap="$2"
      paddingLeft={withDivider ? '$3' : undefined}
      borderLeftWidth={withDivider ? 1 : 0}
      borderLeftColor={withDivider ? 'rgba(255,255,255,0.2)' : undefined}
    >
      {renderHeroAmount(metric, emphasized)}
      {metric.description ? (
        <Text color="rgba(255,255,255,0.88)" fontSize={14} lineHeight={20}>
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
      maxWidth={390}
      gap="$4"
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
      <YStack position="relative" zIndex={1} gap="$4">
        <Text color="white" fontSize={20} lineHeight={24} fontWeight="800" textAlign="center" textTransform="uppercase">
          {title}
        </Text>
        <XStack alignItems="stretch" gap="$3">
          <MetricColumn metric={primaryMetric} emphasized />
          <MetricColumn metric={secondaryMetric} withDivider />
        </XStack>
        <Stack height={1} backgroundColor="rgba(255,255,255,0.24)" />
        <Text color="rgba(255,255,255,0.92)" fontSize={17} lineHeight={26} textAlign="center">
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
          height={46}
          backgroundColor="rgba(255,255,255,0.98)"
          borderWidth={0}
          borderRadius="$full"
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
