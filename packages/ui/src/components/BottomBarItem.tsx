import React from 'react'
import type { ReactNode } from 'react'
import { Stack, YStack } from 'tamagui'
import { Spinner } from '../components-test/Spinner'
import { Text } from './Text'

export interface BottomBarItemProps {
  label: string
  icon: ReactNode
  onPress?: () => void
  active?: boolean
  loading?: boolean
  disabled?: boolean
  'data-testid'?: string
}

export function BottomBarItem({
  label, icon, onPress, active = false, loading = false, disabled = false,
  'data-testid': testId,
}: BottomBarItemProps) {
  const selected = active || loading
  return (
    <YStack
      tag="button"
      type="button"
      role="button"
      aria-label={label}
      aria-pressed={selected}
      aria-busy={loading}
      disabled={disabled}
      accessibilityState={{ disabled, selected, busy: loading }}
      onPress={disabled ? undefined : onPress}
      data-testid={testId}
      flex={1}
      minWidth={0}
      height={58}
      alignItems="center"
      justifyContent="center"
      gap="$1"
      paddingVertical="$2"
      backgroundColor="$backgroundTransparent"
      borderWidth={0}
      position="relative"
      opacity={disabled ? 0.5 : 1}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      focusStyle={{ outlineStyle: 'solid', outlineWidth: 2, outlineColor: '$borderColorFocus' }}
    >
      <Stack width={24} height={24} alignItems="center" justifyContent="center">
        {loading ? <Spinner size="sm" /> : icon}
      </Stack>
      <Text fontSize="$1" lineHeight="$1" color={selected ? '$color' : '$placeholderColor'} numberOfLines={1}>
        {label}
      </Text>
      {selected && (
        <Stack position="absolute" bottom={0} left={0} right={0} height={2} backgroundColor="$borderColorFocus" />
      )}
    </YStack>
  )
}
