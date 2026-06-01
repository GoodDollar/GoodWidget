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
  needsAttention?: boolean
  isFirst?: boolean
  isLast?: boolean
}

export function MigrationStepRow({
  step,
  description,
  actionLabel,
  onAction,
  actionDisabled = false,
  isCompleted,
  isActive,
  isFailed = false,
  needsAttention = false,
  isFirst = false,
  isLast = false,
}: MigrationStepRowProps) {
  const useAttentionStyle = needsAttention && (isActive || isFailed)
  const markerBorderColor = useAttentionStyle
    ? '$warning'
    : isFailed
      ? '$warning'
      : isCompleted || isActive
        ? '$borderColorFocus'
        : '$borderColor'
  const markerBackgroundColor =
    useAttentionStyle && isActive && !isFailed ? '$background' : isCompleted || isActive ? '$backgroundPress' : '$background'
  const lineColor =
    useAttentionStyle || isCompleted || isActive ? (useAttentionStyle ? '$warning' : '$borderColorFocus') : '$borderColor'
  const titleColor = useAttentionStyle
    ? '$warning'
    : isFailed
      ? '$warning'
      : isCompleted || isActive
        ? '$color'
        : '$placeholderColor'
  const contentBackgroundColor = isActive ? '$backgroundHover' : undefined
  const contentBorderColor = useAttentionStyle
    ? '$warning'
    : isFailed
      ? '$warning'
      : isActive
        ? '$borderColorFocus'
        : 'transparent'
  const showDescription = Boolean(description) && (isActive || isFailed)
  const showAction = Boolean(actionLabel && onAction) && (isActive || isFailed)
  const showPendingLabel = !isCompleted && !isActive && !isFailed
  const markerSize = 24
  const railOffset = isActive || isFailed ? '$2' : '$1'
  const showActiveSpinner = isActive && !isFailed && !useAttentionStyle

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
          borderWidth={isActive || isFailed ? 2 : 1}
          borderColor={markerBorderColor}
          backgroundColor={markerBackgroundColor}
        >
          {isCompleted ? (
            <Icon name="check" size="xs" color="primary" />
          ) : isFailed ? (
            <Icon name="alert-triangle" size="xs" color="inherit" />
          ) : showActiveSpinner ? (
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
        paddingHorizontal={isActive || isFailed ? '$3' : '$0'}
        paddingVertical={isActive || isFailed ? '$3' : '$0'}
        borderRadius="$3"
        borderWidth={isActive || isFailed ? 1 : 0}
        borderColor={contentBorderColor}
        backgroundColor={contentBackgroundColor}
      >
        <XStack alignItems="center" justifyContent="space-between" gap="$2">
          <XStack alignItems="center" gap="$2" flex={1} flexWrap="wrap">
            <Text
              color={titleColor}
              fontWeight={isActive || isCompleted || isFailed ? '700' : '600'}
              fontSize={isActive ? '$4' : undefined}
            >
              {step}
            </Text>
            {useAttentionStyle && isActive && (
              <Icon name="alert-triangle" size="xs" color="inherit" />
            )}
          </XStack>
          {showPendingLabel && (
            <Text variant="caption" secondary>
              Pending
            </Text>
          )}
        </XStack>
        {showDescription && (
          <Text secondary={!isActive && !isFailed} color={isFailed || useAttentionStyle ? '$warning' : undefined}>
            {description}
          </Text>
        )}
        {showAction && (
          <Button
            variant="ghost"
            onPress={onAction}
            disabled={actionDisabled}
            fullWidth
            size="md"
            borderRadius="$3"
            backgroundColor="$warning"
            hoverStyle={{ backgroundColor: '$warning', opacity: 0.92 }}
            pressStyle={{ backgroundColor: '$warning', opacity: 0.86 }}
          >
            <ButtonText color="$background" fontWeight="700">
              {actionLabel}
            </ButtonText>
          </Button>
        )}
      </YStack>
    </XStack>
  )
}
