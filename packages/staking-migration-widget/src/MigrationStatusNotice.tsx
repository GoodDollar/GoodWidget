import React from 'react'
import { Button, ButtonText, Card, Heading, Text, YStack } from '@goodwidget/ui'

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
    <Card>
      <YStack gap="$3" padding="$4">
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
    </Card>
  )
}
