import React, { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { Text } from './Text'
import { XStack, YStack } from '../components-test/Stacks'
import { createComponent } from '../createComponent'

export const STEPPER_MARKER_SIZE = 28

const STEPPER_ROW_GAP_PX = 8

export type StepperStepStatus = 'pending' | 'active' | 'completed' | 'failed' | 'attention'

export interface StepperStepItem {
  id: string
  title: string
  description?: string
  status: StepperStepStatus
}

export interface StepperProps {
  steps: StepperStepItem[]
  activeStepId?: string | null
  header?: ReactNode
  maxHeight?: number
}

export function getStepperConnectorColor(status: StepperStepStatus): string {
  if (status === 'completed') return '$borderColorFocus'
  return '$borderColor'
}

function getStepperStatusLabel(status: StepperStepStatus): string {
  if (status === 'failed') return 'Needs attention'
  if (status === 'completed') return 'Completed'
  if (status === 'active' || status === 'attention') return 'In progress'
  return 'Pending'
}

function getStepperStatusColor(status: StepperStepStatus): string | undefined {
  if (status === 'failed' || status === 'attention') return '$warning'
  if (status === 'completed') return '$success'
  if (status === 'active') return '$primary'
  return undefined
}

type StepperMarkerVariant = 'completed' | 'active' | 'failed' | 'pending' | 'attention'

function getStepperMarkerVariant(status: StepperStepStatus): StepperMarkerVariant {
  if (status === 'completed') return 'completed'
  if (status === 'failed') return 'failed'
  if (status === 'attention') return 'attention'
  if (status === 'active') return 'active'
  return 'pending'
}

function StepperMarker({ variant }: { variant: StepperMarkerVariant }) {
  if (variant === 'pending') {
    return (
      <YStack
        width={STEPPER_MARKER_SIZE}
        height={STEPPER_MARKER_SIZE}
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
        width={STEPPER_MARKER_SIZE}
        height={STEPPER_MARKER_SIZE}
        borderRadius="$full"
        borderWidth={2}
        borderColor="$warning"
        backgroundColor="$background"
      />
    )
  }

  const fillColor = variant === 'failed' ? '$warning' : '$borderColorFocus'
  const iconName = variant === 'completed' ? 'check' : variant === 'failed' ? 'alert-triangle' : 'loader'

  return (
    <YStack
      width={STEPPER_MARKER_SIZE}
      height={STEPPER_MARKER_SIZE}
      borderRadius="$full"
      backgroundColor={fillColor}
      alignItems="center"
      justifyContent="center"
      color="$white"
    >
      <Icon name={iconName} size="md" color="inherit" spin={variant === 'active'} />
    </YStack>
  )
}

interface StepperStepRowProps {
  step: StepperStepItem
  isFirst: boolean
  isLast: boolean
  connectorAboveColor?: string
  stepRef: (node: HTMLElement | null) => void
}

function StepperStepRow({
  step,
  isFirst,
  isLast,
  connectorAboveColor,
  stepRef,
}: StepperStepRowProps) {
  const isActive = step.status === 'active' || step.status === 'attention'
  const isFailed = step.status === 'failed'
  const isAttention = step.status === 'attention'
  const connectorBelowColor = getStepperConnectorColor(step.status)
  const titleColor = isAttention
    ? '$warning'
    : isFailed
      ? '$warning'
      : step.status === 'completed' || isActive
        ? '$color'
        : '$placeholderColor'
  const contentBackgroundColor = isActive ? '$backgroundHover' : undefined
  const contentBorderColor = isAttention
    ? '$warning'
    : isFailed
      ? '$warning'
      : isActive
        ? '$borderColorFocus'
        : 'transparent'
  const showDescription = Boolean(step.description) && (isActive || isFailed)
  const railOffset = isActive || isFailed ? '$2' : '$1'
  const statusLabel = getStepperStatusLabel(step.status)
  const statusColor = getStepperStatusColor(step.status)

  return (
    <YStack
      ref={stepRef}
      width="100%"
    >
      <XStack alignItems="stretch" gap="$3">
      <YStack alignItems="center" width={STEPPER_MARKER_SIZE} flexShrink={0} marginTop={railOffset}>
        {!isFirst && connectorAboveColor && (
          <YStack
            width={2}
            flex={1}
            minHeight={6}
            backgroundColor={connectorAboveColor}
            marginTop={-STEPPER_ROW_GAP_PX}
          />
        )}
        <StepperMarker variant={getStepperMarkerVariant(step.status)} />
        {!isLast && (
          <YStack
            width={2}
            flex={1}
            minHeight={16}
            backgroundColor={connectorBelowColor}
            marginBottom={-STEPPER_ROW_GAP_PX}
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
              fontWeight={isActive || step.status === 'completed' || isFailed ? '700' : '600'}
              fontSize={isActive ? '$4' : undefined}
            >
              {step.title}
            </Text>
            {isAttention && <Icon name="alert-triangle" size="xs" color="inherit" />}
          </XStack>
          <Text variant="caption" secondary={!statusColor} color={statusColor} fontWeight="700">
            {statusLabel}
          </Text>
        </XStack>
        {showDescription && (
          <Text secondary={!isActive && !isFailed} color={isFailed || isAttention ? '$warning' : undefined}>
            {step.description}
          </Text>
        )}
      </YStack>
      </XStack>
    </YStack>
  )
}

const STEPPER_SCROLL_HIDE_CLASS = 'gw-stepper-scroll-hide'

let stepperScrollbarStyleInjected = false

function ensureStepperScrollbarHidden() {
  if (stepperScrollbarStyleInjected || typeof document === 'undefined') return
  stepperScrollbarStyleInjected = true
  const style = document.createElement('style')
  style.id = 'gw-stepper-scroll-hide'
  style.textContent = `.${STEPPER_SCROLL_HIDE_CLASS}::-webkit-scrollbar { display: none; width: 0; height: 0; }`
  document.head.appendChild(style)
}

const StepperScrollFrame = createComponent(YStack, {
  name: 'Stepper',
  width: '100%',
  overflow: 'auto' as const,
})

function resolveActiveStepId(steps: StepperStepItem[], activeStepId?: string | null): string | null {
  if (activeStepId) return activeStepId
  const prioritized = steps.find(
    (step) => step.status === 'active' || step.status === 'failed' || step.status === 'attention',
  )
  return prioritized?.id ?? null
}

export function Stepper({ steps, activeStepId, header, maxHeight = 360 }: StepperProps) {
  const stepRefs = useRef(new Map<string, HTMLElement>())
  const resolvedActiveStepId = resolveActiveStepId(steps, activeStepId)

  ensureStepperScrollbarHidden()

  useEffect(() => {
    if (!resolvedActiveStepId) return undefined

    const frame = requestAnimationFrame(() => {
      const node = stepRefs.current.get(resolvedActiveStepId)
      node?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })

    return () => cancelAnimationFrame(frame)
  }, [resolvedActiveStepId, steps])

  return (
    <YStack gap="$3" width="100%">
      {header}
      <StepperScrollFrame
        maxHeight={maxHeight}
        className={STEPPER_SCROLL_HIDE_CLASS}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <YStack gap="$2">
          {steps.map((step, index) => {
            const connectorAbove =
              index === 0 ? undefined : getStepperConnectorColor(steps[index - 1].status)

            return (
              <StepperStepRow
                key={step.id}
                step={step}
                isFirst={index === 0}
                isLast={index === steps.length - 1}
                connectorAboveColor={connectorAbove}
                stepRef={(node) => {
                  if (node) {
                    stepRefs.current.set(step.id, node)
                    return
                  }
                  stepRefs.current.delete(step.id)
                }}
              />
            )
          })}
        </YStack>
      </StepperScrollFrame>
    </YStack>
  )
}
