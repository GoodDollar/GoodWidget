import React from 'react'
import { Badge, BadgeText, Heading, Text, YStack } from '@goodwidget/ui'

interface MigrationStatusNoticeProps {
  title: string
  message: string
  status: 'error' | 'warning' | 'success' | 'info'
  compact?: boolean
}

// This notice standardizes state-specific messaging and optional recovery actions.
export function MigrationStatusNotice({
  title,
  message,
  status,
  compact = false,
}: MigrationStatusNoticeProps) {
  const color =
    status === 'error' ? '$error' : status === 'warning' ? '$warning' : status === 'success' ? '$success' : '$color'

  if (compact) {
    return (
      <Text secondary>
        <Text color={color}>{title}:</Text> {message}
      </Text>
    )
  }

  return (
    <YStack gap="$3">
      <Badge type={status === 'error' ? 'error' : status === 'warning' ? 'warning' : status === 'success' ? 'success' : 'info'}>
        <BadgeText>{status}</BadgeText>
      </Badge>
      <Heading level={4} color={color}>
        {title}
      </Heading>
      <Text secondary>{message}</Text>
    </YStack>
  )
}
