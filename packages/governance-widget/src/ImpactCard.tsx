import React from 'react'
import { Button, ButtonText, Card, Heading, Text, XStack } from '@goodwidget/ui'
import { MetricBox } from './primitives'
import type { ImpactCardProps } from './types'

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
