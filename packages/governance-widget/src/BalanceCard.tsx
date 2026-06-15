import { Card, Icon, Text, XStack } from '@goodwidget/ui'
import type { BalanceCardProps } from './types'
import { isGovernanceAmount } from './format'
import { renderGovernanceAmount } from './shared'

export function BalanceCard({
  icon,
  title,
  amount,
  amountType = 'token',
  metadataType,
  metadata,
  compact = false,
  testID,
}: BalanceCardProps) {
  const amountValue = isGovernanceAmount(amount) ? amount : { value: amount, token: amountType === 'token' ? 'G$' : undefined }
  const metadataTone =
    metadata.tone === 'positive' || metadataType === 'growth'
      ? 'default'
      : metadata.tone === 'muted' || metadataType === 'time-window'
        ? 'secondary'
        : 'soft'
  const metadataIcon = metadata.icon ?? (metadataType === 'growth' ? 'chevron-up' : metadataType === 'time-window' ? 'info' : undefined)
  const metadataIconColor = metadata.tone === 'positive' || metadataType === 'growth' ? 'success' : 'muted'

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
        {metadataIcon ? <Icon name={metadataIcon} size="xs" color={metadataIconColor} /> : null}
        <Text variant="caption" tone={metadataTone} truncate>
          {metadata.label}
        </Text>
      </XStack>
    </Card>
  )
}
