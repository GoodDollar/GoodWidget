import { Stack } from 'tamagui'
import { Heading, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import type { ImpactCardMetric, ImpactCardProps } from './types'
import { formatCompactValue } from './format'
import { ImpactCardAction, ImpactCardFrame } from './shared'

function HeroBackdrop() {
  return (
    <>
      <Stack
        position="absolute"
        top={-36}
        right={-72}
        width={220}
        height={220}
        borderRadius="$full"
        borderWidth={20}
        borderColor="$governanceImpactBorder"
        opacity={0.8}
      />
      <Stack
        position="absolute"
        top={38}
        right={62}
        width={104}
        height={18}
        borderRadius="$full"
        backgroundColor="$governanceImpactOverlay"
      />
      <Stack
        position="absolute"
        top={58}
        right={38}
        width={64}
        height={64}
        borderRadius="$full"
        backgroundColor="$governanceImpactOverlayPressed"
      />
      <Stack
        position="absolute"
        top={128}
        right={8}
        width={132}
        height={24}
        borderRadius="$full"
        backgroundColor="$governanceImpactOverlay"
      />
    </>
  )
}

function renderHeroAmount(metric: ImpactCardMetric, emphasized = false) {
  return (
    <YStack gap="$2" minWidth={0}>
      <XStack
        alignSelf="flex-start"
        borderRadius="$full"
        backgroundColor="$governanceImpactOverlayStrong"
        paddingHorizontal="$2"
        paddingVertical="$2"
      >
        <Text variant="caption" color="$white" fontWeight="700" noWrap>
          {metric.label}
        </Text>
      </XStack>
      <XStack alignItems="baseline" gap="$1" flexWrap="nowrap">
        {metric.amount.token ? (
          <>
            <Text variant={emphasized ? 'large' : 'label'} color="$white" fontWeight="700">
              {metric.amount.token}
            </Text>
            <Heading level={emphasized ? 4 : 5} color="$white">
              {formatCompactValue(metric.amount.value)}
            </Heading>
          </>
        ) : (
          <Heading level={emphasized ? 4 : 5} color="$white">
            {formatCompactValue(metric.amount.value)}
          </Heading>
        )}
      </XStack>
      {metric.amount.isStreaming ? (
        <XStack alignItems="center" gap="$2">
          <Stack width={8} height={8} borderRadius="$full" backgroundColor="$success" />
          <Text variant="caption" color="$white" fontWeight="700" textTransform="uppercase">
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
      borderLeftColor={withDivider ? '$governanceImpactBorderHover' : undefined}
    >
      {renderHeroAmount(metric, emphasized)}
      {metric.description ? (
        <Text variant="label" color="$governanceImpactTextSoft">
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
    <ImpactCardFrame data-testid={testID}>
      <HeroBackdrop />
      <YStack position="relative" zIndex={1} gap="$4">
        <Text fontSize="$4" lineHeight="$5" color="$white" fontWeight="800" textAlign="center" textTransform="uppercase">
          {title}
        </Text>
        <XStack alignItems="stretch" gap="$3">
          <MetricColumn metric={primaryMetric} emphasized />
          <MetricColumn metric={secondaryMetric} withDivider />
        </XStack>
        <Stack height={1} backgroundColor="$governanceImpactBorderFocus" />
        <Text fontSize="$3" lineHeight="$5" color="$governanceImpactTextDim" textAlign="center">
          {description}
        </Text>
      </YStack>
      {ctaLabel ? (
        <ImpactCardAction disabled={ctaDisabled} onPress={onCtaPress} aria-label={ctaLabel}>
          <XStack alignItems="center" gap="$2">
            <Text color="$primary" fontWeight="700">
              {ctaLabel}
            </Text>
            <Icon name="external-link" size="xs" color="primary" />
          </XStack>
        </ImpactCardAction>
      ) : null}
    </ImpactCardFrame>
  )
}
