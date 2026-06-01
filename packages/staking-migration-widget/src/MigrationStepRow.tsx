import React from 'react'
import { Icon, Text, XStack, YStack } from '@goodwidget/ui'
import { MIGRATION_STEP_MARKER_SIZE, MigrationStepMarker } from './MigrationStepMarker'

const TIMELINE_ROW_GAP_PX = 8

interface MigrationStepRowProps {
  step: string
  description?: string
  isCompleted: boolean
  isActive: boolean
  isFailed?: boolean
  needsAttention?: boolean
  isFirst?: boolean
  isLast?: boolean
  connectorAboveColor?: string
}

export function getStepConnectorColor(
  isCompleted: boolean,
  isFailed: boolean,
  isActive: boolean,
  needsAttention: boolean,
): string {
  if (isCompleted) return '$borderColorFocus'
  if (isFailed || (needsAttention && isActive)) return '$warning'
  return '$borderColor'
}

export function MigrationStepRow({
  step,
  description,
  isCompleted,
  isActive,
  isFailed = false,
  needsAttention = false,
  isFirst = false,
  isLast = false,
  connectorAboveColor,
}: MigrationStepRowProps) {
  const useAttentionStyle = needsAttention && (isActive || isFailed)
  const connectorBelowColor = getStepConnectorColor(isCompleted, isFailed, isActive, needsAttention)
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
  const railOffset = isActive || isFailed ? '$2' : '$1'
  const markerVariant = isCompleted
    ? 'completed'
    : isFailed
      ? 'failed'
      : isActive && useAttentionStyle
        ? 'attention'
        : isActive
          ? 'active'
          : 'pending'
  const statusLabel = isFailed
    ? 'Needs attention'
    : isCompleted
      ? 'Completed'
      : isActive
        ? 'In progress'
        : 'Pending'
  const statusColor = isFailed || useAttentionStyle
    ? '$warning'
    : isCompleted
      ? '$success'
      : isActive
        ? '$primary'
        : undefined

  return (
    <XStack alignItems="stretch" gap="$3">
      <YStack alignItems="center" width={MIGRATION_STEP_MARKER_SIZE} flexShrink={0} marginTop={railOffset}>
        {!isFirst && connectorAboveColor && (
          <YStack
            width={2}
            flex={1}
            minHeight={6}
            backgroundColor={connectorAboveColor}
            marginTop={-TIMELINE_ROW_GAP_PX}
          />
        )}
        <MigrationStepMarker variant={markerVariant} />
        {!isLast && (
          <YStack
            width={2}
            flex={1}
            minHeight={16}
            backgroundColor={connectorBelowColor}
            marginBottom={-TIMELINE_ROW_GAP_PX}
          />
        )}
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
          <Text variant="caption" secondary={!statusColor} color={statusColor} fontWeight="700">
            {statusLabel}
          </Text>
        </XStack>
        {showDescription && (
          <Text secondary={!isActive && !isFailed} color={isFailed || useAttentionStyle ? '$warning' : undefined}>
            {description}
          </Text>
        )}
      </YStack>
    </XStack>
  )
}
