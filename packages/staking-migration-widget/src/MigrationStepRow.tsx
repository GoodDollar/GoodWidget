import React from 'react'
import { Spinner, Text, XStack } from '@goodwidget/ui'

interface MigrationStepRowProps {
  step: string
  isCompleted: boolean
  isActive: boolean
  isFailed?: boolean
}

// This row keeps step visuals deterministic: completed checkmark, one active spinner, or idle bullet.
export function MigrationStepRow({ step, isCompleted, isActive, isFailed = false }: MigrationStepRowProps) {
  return (
    <XStack
      alignItems="center"
      gap="$3"
      justifyContent="space-between"
      padding="$2"
      borderRadius="$2"
      borderWidth={isActive || isFailed ? 1 : 0}
      borderColor={isFailed ? '$error' : '$borderColorFocus'}
      backgroundColor={isActive ? '$backgroundHover' : undefined}
    >
      <XStack alignItems="center" gap="$3">
        {isCompleted ? (
          <Text color="$success" fontWeight="700">
            ✓
          </Text>
        ) : isFailed ? (
          <Text color="$error" fontWeight="700">
            !
          </Text>
        ) : isActive ? (
          <Spinner size="sm" />
        ) : (
          <Text secondary>•</Text>
        )}
        <Text fontWeight={isActive ? '700' : undefined}>{step}</Text>
      </XStack>
      {isCompleted && (
        <Text color="$success" variant="caption">
          completed
        </Text>
      )}
      {isFailed && (
        <Text color="$error" variant="caption">
          failed
        </Text>
      )}
      {isActive && (
        <Text color="$color" variant="caption" fontWeight="700">
          current
        </Text>
      )}
    </XStack>
  )
}
