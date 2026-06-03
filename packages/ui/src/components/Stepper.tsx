import React, { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { Text } from './Text'
import { XStack, YStack } from '../components-test/Stacks'
import { createComponent } from '../createComponent'

const MARKER_SIZE = 28
const ROW_GAP_PX = 8

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

function connectorColor(status: StepperStepStatus): string {
  if (status === 'completed') return '$borderColorFocus'
  return '$borderColor'
}

function statusLabel(status: StepperStepStatus): string {
  if (status === 'failed') return 'Needs attention'
  if (status === 'completed') return 'Completed'
  if (status === 'active' || status === 'attention') return 'In progress'
  return 'Pending'
}

function statusColor(status: StepperStepStatus): string | undefined {
  if (status === 'failed' || status === 'attention') return '$warning'
  if (status === 'completed') return '$success'
  if (status === 'active') return '$primary'
  return undefined
}

type MarkerVariant = 'completed' | 'active' | 'failed' | 'pending' | 'attention'

function markerVariant(status: StepperStepStatus): MarkerVariant {
  if (status === 'completed') return 'completed'
  if (status === 'failed') return 'failed'
  if (status === 'attention') return 'attention'
  if (status === 'active') return 'active'
  return 'pending'
}

function StepperMarker({ variant }: { variant: MarkerVariant }) {
  if (variant === 'pending') {
    return (
      <YStack
        width={MARKER_SIZE}
        height={MARKER_SIZE}
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
        width={MARKER_SIZE}
        height={MARKER_SIZE}
        borderRadius="$full"
        borderWidth={2}
        borderColor="$warning"
        backgroundColor="$background"
      />
    )
  }

  const fillColor = variant === 'failed' ? '$warning' : '$borderColorFocus'
  const glyph =
    variant === 'completed' ? (
      <Icon name="check" size="xs" color="inherit" />
    ) : variant === 'failed' ? (
      <Icon name="alert-triangle" size="xs" color="inherit" />
    ) : (
      <Icon name="loader" size="sm" color="inherit" spin />
    )

  return (
    <YStack
      width={MARKER_SIZE}
      height={MARKER_SIZE}
      borderRadius="$full"
      backgroundColor={fillColor}
      alignItems="center"
      justifyContent="center"
      color="$white"
    >
      {glyph}
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
  const connectorBelowColor = connectorColor(step.status)
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

  return (
    <YStack ref={stepRef} width="100%">
      <XStack alignItems="stretch" gap="$3">
        <YStack alignItems="center" width={MARKER_SIZE} flexShrink={0} marginTop={railOffset}>
          {!isFirst && connectorAboveColor && (
            <YStack
              width={2}
              flex={1}
              minHeight={6}
              backgroundColor={connectorAboveColor}
              marginTop={-ROW_GAP_PX}
            />
          )}
          <StepperMarker variant={markerVariant(step.status)} />
          {!isLast && (
            <YStack
              width={2}
              flex={1}
              minHeight={16}
              backgroundColor={connectorBelowColor}
              marginBottom={-ROW_GAP_PX}
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
            <Text variant="caption" secondary={!statusColor(step.status)} color={statusColor(step.status)} fontWeight="700">
              {statusLabel(step.status)}
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

const SCROLL_HIDE_CLASS = 'gw-stepper-scroll-hide'

let scrollbarStyleInjected = false

function ensureScrollbarHidden() {
  if (scrollbarStyleInjected || typeof document === 'undefined') return
  scrollbarStyleInjected = true
  const style = document.createElement('style')
  style.id = 'gw-stepper-scroll-hide'
  style.textContent = `.${SCROLL_HIDE_CLASS}::-webkit-scrollbar { display: none; width: 0; height: 0; }`
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

  ensureScrollbarHidden()

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
        className={SCROLL_HIDE_CLASS}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <YStack gap="$2">
          {steps.map((step, index) => (
            <StepperStepRow
              key={step.id}
              step={step}
              isFirst={index === 0}
              isLast={index === steps.length - 1}
              connectorAboveColor={index === 0 ? undefined : connectorColor(steps[index - 1].status)}
              stepRef={(node) => {
                if (node) {
                  stepRefs.current.set(step.id, node)
                  return
                }
                stepRefs.current.delete(step.id)
              }}
            />
          ))}
        </YStack>
      </StepperScrollFrame>
    </YStack>
  )
}
