import React from 'react'
import { Icon, YStack } from '@goodwidget/ui'

export const MIGRATION_STEP_MARKER_SIZE = 28

export type MigrationStepMarkerVariant = 'completed' | 'active' | 'failed' | 'pending' | 'attention'

interface MigrationStepMarkerProps {
  variant: MigrationStepMarkerVariant
}

export function MigrationStepMarker({ variant }: MigrationStepMarkerProps) {
  if (variant === 'pending') {
    return (
      <YStack
        width={MIGRATION_STEP_MARKER_SIZE}
        height={MIGRATION_STEP_MARKER_SIZE}
        borderRadius="$full"
        borderWidth={2}
        borderColor="$borderColor"
        backgroundColor="transparent"
      />
    )
  }

  if (variant === 'attention') {
    return (
      <YStack
        width={MIGRATION_STEP_MARKER_SIZE}
        height={MIGRATION_STEP_MARKER_SIZE}
        borderRadius="$full"
        borderWidth={2}
        borderColor="$warning"
        backgroundColor="$background"
      />
    )
  }

  const fillColor = variant === 'failed' ? '$warning' : '$borderColorFocus'
  const iconName = variant === 'completed' ? 'check' : variant === 'failed' ? 'alert-triangle' : 'loader'
  const iconSize = 'md'

  return (
    <YStack
      width={MIGRATION_STEP_MARKER_SIZE}
      height={MIGRATION_STEP_MARKER_SIZE}
      borderRadius="$full"
      backgroundColor={fillColor}
      alignItems="center"
      justifyContent="center"
      color="$white"
    >
      <Icon name={iconName} size={iconSize} color="inherit" spin={variant === 'active'} />
    </YStack>
  )
}
