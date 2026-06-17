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
  if (status === 'completed') {
    return '$borderColorFocus'
  }

  return '$borderColor'
}

function statusLabel(status: StepperStepStatus): string {
  if (status === 'failed') {
    return 'Needs attention'
  }

  if (status === 'completed') {
    return 'Completed'
  }

  if (status === 'active' || status === 'attention') {
    return 'In progress'
  }

  return 'Pending'
}

function statusColor(status: StepperStepStatus): string | undefined {
  if (status === 'failed' || status === 'attention') {
    return '$warning'
  }

  if (status === 'completed') {
    return '$success'
  }

  if (status === 'active') {
    return '$primary'
  }

  return undefined
}

type StepperMarkerVariant = 'completed' | 'active' | 'failed' | 'pending' | 'attention'

function resolveMarkerVariant(status: StepperStepStatus): StepperMarkerVariant {
  if (status === 'completed') {
    return 'completed'
  }

  if (status === 'failed') {
    return 'failed'
  }

  if (status === 'attention') {
    return 'attention'
  }

  if (status === 'active') {
    return 'active'
  }

  return 'pending'
}

function StepperMarker({ variant }: { variant: StepperMarkerVariant }) {
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
  const isActiveStep = step.status === 'active' || step.status === 'attention'
  const isFailedStep = step.status === 'failed'
  const isAttentionStep = step.status === 'attention'
  const connectorBelowColor = connectorColor(step.status)
  const titleColor = isAttentionStep
    ? '$warning'
    : isFailedStep
      ? '$warning'
      : step.status === 'completed' || isActiveStep
        ? '$color'
        : '$placeholderColor'
  const contentBackgroundColor = isActiveStep ? '$backgroundHover' : undefined
  const contentBorderColor = isAttentionStep
    ? '$warning'
    : isFailedStep
      ? '$warning'
      : isActiveStep
        ? '$borderColorFocus'
        : 'transparent'
  const shouldShowDescription = Boolean(step.description) && (isActiveStep || isFailedStep)
  const railOffset = isActiveStep || isFailedStep ? '$2' : '$1'

  return (
    <YStack ref={stepRef} width="100%">
      <XStack alignItems="stretch" gap="$3">
        <YStack alignItems="center" width={MARKER_SIZE} flexShrink={0} marginTop={railOffset}>
          {!isFirst && connectorAboveColor ? (
            <YStack
              width={2}
              flex={1}
              minHeight={6}
              backgroundColor={connectorAboveColor}
              marginTop={-ROW_GAP_PX}
            />
          ) : null}
          <StepperMarker variant={resolveMarkerVariant(step.status)} />
          {!isLast ? (
            <YStack
              width={2}
              flex={1}
              minHeight={16}
              backgroundColor={connectorBelowColor}
              marginBottom={-ROW_GAP_PX}
            />
          ) : null}
        </YStack>

        <YStack
          flex={1}
          gap={isActiveStep ? '$2' : '$1'}
          paddingTop="$1"
          paddingBottom={isLast ? '$0' : '$3'}
          paddingHorizontal={isActiveStep || isFailedStep ? '$3' : '$0'}
          paddingVertical={isActiveStep || isFailedStep ? '$3' : '$0'}
          borderRadius="$3"
          borderWidth={isActiveStep || isFailedStep ? 1 : 0}
          borderColor={contentBorderColor}
          backgroundColor={contentBackgroundColor}
        >
          <XStack alignItems="center" justifyContent="space-between" gap="$2">
            <XStack alignItems="center" gap="$2" flex={1} flexWrap="wrap">
              <Text
                color={titleColor}
                fontWeight={isActiveStep || step.status === 'completed' || isFailedStep ? '700' : '600'}
                fontSize={isActiveStep ? '$4' : undefined}
              >
                {step.title}
              </Text>
              {isAttentionStep ? <Icon name="alert-triangle" size="xs" color="inherit" /> : null}
            </XStack>
            <Text
              variant="caption"
              secondary={!statusColor(step.status)}
              color={statusColor(step.status)}
              fontWeight="700"
            >
              {statusLabel(step.status)}
            </Text>
          </XStack>
          {shouldShowDescription ? (
            <Text secondary={!isActiveStep && !isFailedStep} color={isFailedStep || isAttentionStep ? '$warning' : undefined}>
              {step.description}
            </Text>
          ) : null}
        </YStack>
      </XStack>
    </YStack>
  )
}

const SCROLL_HIDE_CLASS = 'gw-stepper-scroll-hide'

const SCROLL_HIDE_STYLE_ID = 'gw-stepper-scroll-hide-style'

function ensureScrollbarHidden(): void {
  if (typeof document === 'undefined') {
    return
  }

  if (document.getElementById(SCROLL_HIDE_STYLE_ID)) {
    return
  }

  const style = document.createElement('style')
  style.id = SCROLL_HIDE_STYLE_ID
  style.textContent = `.${SCROLL_HIDE_CLASS}::-webkit-scrollbar { display: none; width: 0; height: 0; }`
  document.head.appendChild(style)
}

const StepperScrollFrame = createComponent(YStack, {
  name: 'Stepper',
  width: '100%',
  overflow: 'auto' as const,
})

function resolveActiveStepId(steps: StepperStepItem[], activeStepId?: string | null): string | null {
  if (activeStepId) {
    return activeStepId
  }

  const prioritizedStep = steps.find(
    (step) => step.status === 'active' || step.status === 'failed' || step.status === 'attention',
  )

  return prioritizedStep?.id ?? null
}

export function Stepper({ steps, activeStepId, header, maxHeight = 360 }: StepperProps) {
  const stepRefs = useRef(new Map<string, HTMLElement>())
  const resolvedActiveStepId = resolveActiveStepId(steps, activeStepId)

  useEffect(() => {
    ensureScrollbarHidden()
  }, [])

  useEffect(() => {
    if (!resolvedActiveStepId) {
      return undefined
    }

    const frame = requestAnimationFrame(() => {
      const node = stepRefs.current.get(resolvedActiveStepId)
      node?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })

    return () => cancelAnimationFrame(frame)
  }, [resolvedActiveStepId])

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
