import React from 'react'
import type { ReactNode } from 'react'
import { XStack, YStack } from 'tamagui'
import { Icon } from './Icon'
import { Text } from './Text'

export interface WidgetListRowProps {
  label: string
  description: string
  icon: ReactNode
  onPress?: () => void
  active?: boolean
  disabled?: boolean
  'data-testid'?: string
}

export function WidgetListRow({
  label, description, icon, onPress, active = false, disabled = false,
  'data-testid': testId,
}: WidgetListRowProps) {
  return (
    <XStack
      tag="button"
      type="button"
      role="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      accessibilityState={{ disabled, selected: active }}
      onPress={disabled ? undefined : onPress}
      data-testid={testId}
      width="100%"
      minHeight={64}
      alignItems="center"
      gap="$3"
      padding="$3"
      borderWidth={0}
      borderRadius="$3"
      backgroundColor={active ? '$infoMuted' : '$backgroundTransparent'}
      opacity={disabled ? 0.5 : 1}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      focusStyle={{ outlineStyle: 'solid', outlineWidth: 2, outlineColor: '$borderColorFocus' }}
    >
      <XStack width={40} height={40} borderRadius="$3" borderWidth={1} borderColor="$borderColor" backgroundColor="$background" alignItems="center" justifyContent="center" flexShrink={0}>
        {icon}
      </XStack>
      <YStack flex={1} minWidth={0} alignItems="flex-start">
        <Text fontSize="$3" numberOfLines={1}>{label}</Text>
        <Text fontSize="$1" color="$placeholderColor" numberOfLines={2}>{description}</Text>
      </YStack>
      <Icon name={active ? 'check' : 'chevron-right'} size="md" color={active ? 'primary' : 'muted'} />
    </XStack>
  )
}
