import { Card, Heading, Text, Button, ButtonText, XStack, YStack } from '@goodwidget/ui'
import type { ImpactCardMetric, ImpactCardProps } from './types'
import { renderGovernanceAmount } from './shared'

function MetricBox({ metric }: { metric: ImpactCardMetric }) {
  return (
    <YStack
      flex={1}
      minWidth={140}
      gap="$2"
      padding="$3"
      borderRadius="$3"
      backgroundColor="$infoMuted"
      borderWidth={1}
      borderColor="$borderColor"
    >
      <Text variant="label" tone="secondary">
        {metric.label}
      </Text>
      {renderGovernanceAmount(metric.amount, 'lg')}
      {metric.description ? (
        <Text variant="caption" tone="dim">
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
  return (
    <Card data-testid={testID} width="100%" maxWidth={520} gap="$4">
      <Heading level={3}>{title}</Heading>
      <XStack flexWrap="wrap" gap="$3">
        {metrics.map((metric) => (
          <MetricBox key={metric.label} metric={metric} />
        ))}
      </XStack>
      <Text tone="secondary">{description}</Text>
      {ctaLabel ? (
        <Button fullWidth disabled={ctaDisabled} onPress={onCtaPress} aria-label={ctaLabel}>
          <ButtonText>{ctaLabel}</ButtonText>
        </Button>
      ) : null}
    </Card>
  )
}
