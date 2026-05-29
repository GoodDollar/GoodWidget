import React from 'react'
import { Badge, BadgeText, Button, ButtonText, Heading, Text, YStack } from '@goodwidget/ui'

interface MigrationStatusNoticeProps {
  title: string
  message: string
  status: 'error' | 'warning' | 'success' | 'info'
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
}

// This notice standardizes state-specific messaging and optional recovery actions.
export function MigrationStatusNotice({
  title,
  message,
  status,
  actionLabel,
  onAction,
  actionDisabled,
}: MigrationStatusNoticeProps) {
  const color =
    status === 'error' ? '$error' : status === 'warning' ? '$warning' : status === 'success' ? '$success' : '$color'

  return (
    <YStack gap="$3">
      <Badge type={status === 'error' ? 'error' : status === 'warning' ? 'warning' : status === 'success' ? 'success' : 'info'}>
        <BadgeText>{status}</BadgeText>
      </Badge>
      <Heading level={4} color={color}>
        {title}
      </Heading>
      <Text secondary>{message}</Text>
      {actionLabel && onAction && (
        <Button onPress={onAction} disabled={actionDisabled}>
          <ButtonText>{actionLabel}</ButtonText>
        </Button>
      )}
    </YStack>
  )
}
