import React from 'react'
import { Icon, Spinner, Text, XStack, YStack, ZStack } from '@goodwidget/ui'

interface MigrationStepRowProps {
  step: string
  description?: string
  isCompleted: boolean
  isActive: boolean
  isFailed?: boolean
  isFirst?: boolean
  isLast?: boolean
}

// This row renders a connected vertical stepper marker with stateful copy.
export function MigrationStepRow({
  step,
  description,
  isCompleted,
  isActive,
  isFailed = false,
  isFirst = false,
  isLast = false,
}: MigrationStepRowProps) {
  const markerBorderColor = isFailed
    ? '$warning'
    : isCompleted || isActive
      ? '$borderColorFocus'
      : '$borderColor'

  const markerBackgroundColor = isCompleted || isActive ? '$backgroundPress' : '$background'
  const lineColor = isCompleted ? '$borderColorFocus' : '$borderColor'
  const titleColor = isFailed ? '$warning' : isCompleted || isActive ? '$color' : '$placeholderColor'
  const statusCopy = isFailed
    ? 'Needs attention'
    : isCompleted
      ? 'Completed'
      : isActive
        ? 'Current step'
        : 'Pending'

  return (
    <XStack alignItems="stretch" gap="$3">
      <YStack alignItems="center" width={28} flexShrink={0}>
        <YStack
          width={2}
          flex={1}
          minHeight={6}
          backgroundColor={isFirst ? 'transparent' : lineColor}
          opacity={isFirst ? 0 : 1}
        />
        <ZStack
          width={28}
          height={28}
          borderRadius="$full"
          alignItems="center"
          justifyContent="center"
          borderWidth={2}
          borderColor={markerBorderColor}
          backgroundColor={markerBackgroundColor}
          shadowColor={isActive ? '$borderColorFocus' : undefined}
          shadowOpacity={isActive ? 0.4 : 0}
          shadowRadius={isActive ? 12 : 0}
        >
          {isCompleted ? (
            <Icon name="check" size="xs" color="primary" />
          ) : isFailed ? (
            <Icon name="alert-triangle" size="xs" color="inherit" />
          ) : isActive ? (
            <Spinner size="sm" />
          ) : null}
        </ZStack>
        <YStack
          width={2}
          flex={1}
          minHeight={20}
          backgroundColor={isLast ? 'transparent' : lineColor}
          opacity={isLast ? 0 : 1}
        />
      </YStack>

      <YStack flex={1} gap="$1" paddingBottom={isLast ? '$0' : '$3'} paddingTop="$1">
        <Text color={titleColor} fontWeight={isActive || isCompleted || isFailed ? '700' : '600'}>
          {step}
        </Text>
        {description && (
          <Text secondary={!isActive && !isFailed} color={isFailed ? '$warning' : undefined}>
            {description}
          </Text>
        )}
        <Text variant="caption" color={isFailed ? '$warning' : isCompleted ? '$primary' : undefined}>
          {statusCopy}
        </Text>
      </YStack>
    </XStack>
  )
}
