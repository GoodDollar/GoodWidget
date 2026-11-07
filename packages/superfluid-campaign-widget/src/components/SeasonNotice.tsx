import React from 'react'
import { Icon, Text, XStack } from '@goodwidget/ui'

export interface SeasonNoticeProps {
  message: string
}

/**
 * Warning-tone callout with an exclamation-mark icon, styled like the shared
 * `Alert` (muted background, warning border) so season-level announcements match
 * the notices used elsewhere in GoodWidget.
 */
export function SeasonNotice({ message }: SeasonNoticeProps) {
  return (
    <XStack
      role="note"
      alignItems="flex-start"
      gap="$2"
      padding="$3"
      borderRadius="$2"
      borderWidth={1}
      borderColor="$warning"
      backgroundColor="$warningMuted"
    >
      {/* flexShrink 0 keeps the icon from being squeezed when the message wraps on narrow widths. */}
      <XStack flexShrink={0}>
        <Icon name="alert-circle" size="sm" color="warning" />
      </XStack>
      <Text fontSize="$2" lineHeight="$3" flex={1}>
        {message}
      </Text>
    </XStack>
  )
}
