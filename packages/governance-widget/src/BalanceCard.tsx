import React from 'react'
import { Card, Icon, Text, XStack } from '@goodwidget/ui'
import type { BalanceCardProps } from './types'
import { isGovernanceAmount, renderGovernanceAmount } from './utils'

export function BalanceCard({
  icon,
  title,
  amount,
  amountType = 'token',
  metadata,
  compact = false,
  testID,
}: BalanceCardProps) {
  const amountValue = isGovernanceAmount(amount) ? amount : { value: amount, token: amountType === 'token' ? 'G$' : undefined }
  const metadataTone = metadata.tone === 'positive' ? 'default' : metadata.tone === 'muted' ? 'secondary' : 'soft'

  return (
    <Card data-testid={testID} width="100%" maxWidth={compact ? 220 : 268} minHeight={compact ? 150 : 176} gap="$3">
      <XStack alignItems="center" gap="$2">
        <Icon name={icon} size="sm" color="primary" round />
        <Text variant="label" truncate flex={1}>
          {title}
        </Text>
      </XStack>
      {renderGovernanceAmount(amountValue, compact ? 'md' : 'lg')}
      <XStack alignItems="center" gap="$2" marginTop="auto">
        {metadata.icon ? <Icon name={metadata.icon} size="xs" color={metadata.tone === 'positive' ? 'success' : 'muted'} /> : null}
        <Text variant="caption" tone={metadataTone} truncate>
          {metadata.label}
        </Text>
      </XStack>
    </Card>
  )
}
