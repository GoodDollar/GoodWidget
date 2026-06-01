import React from 'react'
import { Button, ButtonText, Icon, Spinner, Text, XStack, YStack, ZStack } from '@goodwidget/ui'

interface MigrationStepRowProps {
  step: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
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
  actionLabel,
  onAction,
  actionDisabled = false,
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
  const lineColor = isCompleted || isActive ? '$borderColorFocus' : '$borderColor'
  const titleColor = isFailed ? '$warning' : isCompleted || isActive ? '$color' : '$placeholderColor'
  const contentBackgroundColor = isActive ? '$backgroundHover' : undefined
  const contentBorderColor = isFailed
    ? '$warning'
    : isActive
      ? '$borderColorFocus'
      : 'transparent'
  const showDescription = Boolean(description) && (isActive || isFailed)
  const showAction = Boolean(actionLabel && onAction) && (isActive || isFailed)
  const statusCopy = isFailed
    ? 'Needs attention'
    : isCompleted
      ? 'Completed'
      : isActive
        ? 'Current step'
        : 'Pending'
  const markerSize = 24
  const railOffset = isActive || isFailed ? '$2' : '$1'

  return (
    <XStack alignItems="stretch" gap="$3">
      <YStack alignItems="center" width={24} flexShrink={0} marginTop={railOffset}>
        <YStack
          width={2}
          flex={1}
          minHeight={6}
          backgroundColor={isFirst ? 'transparent' : lineColor}
          opacity={isFirst ? 0 : 1}
        />
        <ZStack
          width={markerSize}
          height={markerSize}
          borderRadius="$full"
          alignItems="center"
          justifyContent="center"
          borderWidth={isActive ? 2 : 1}
          borderColor={markerBorderColor}
          backgroundColor={markerBackgroundColor}
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
          minHeight={16}
          backgroundColor={isLast ? 'transparent' : lineColor}
          opacity={isLast ? 0 : 1}
        />
      </YStack>

      <YStack
        flex={1}
        gap={isActive ? '$2' : '$1'}
        paddingTop="$1"
        paddingBottom={isLast ? '$0' : '$3'}
        paddingHorizontal={isActive ? '$3' : '$0'}
        paddingVertical={isActive ? '$3' : '$0'}
        borderRadius="$3"
        borderWidth={isActive || isFailed ? 1 : 0}
        borderColor={contentBorderColor}
        backgroundColor={contentBackgroundColor}
      >
        <Text
          color={titleColor}
          fontWeight={isActive || isCompleted || isFailed ? '700' : '600'}
          fontSize={isActive ? '$4' : undefined}
        >
          {step}
        </Text>
        {showDescription && (
          <Text secondary={!isActive && !isFailed} color={isFailed ? '$warning' : undefined}>
            {description}
          </Text>
        )}
        {showAction && (
          <Button
            onPress={onAction}
            disabled={actionDisabled}
            size="sm"
            alignSelf="flex-start"
            minWidth={132}
            paddingHorizontal="$4"
          >
            <ButtonText>{actionLabel}</ButtonText>
          </Button>
        )}
      </YStack>
    </XStack>
  )
}
