import React, { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { Text } from './Text'
import { XStack, YStack } from '../components-test/Stacks'
import { createComponent } from '../createComponent'

const MARKER_SIZE = 28
const ROW_GAP_PX = 8

export type StepperStepStatus = 'pending' | 'active' | 'completed' | 'failed' | 'attention'

export type StepperPalette = 'primary' | 'purple'

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
  /**
   * Visual palette for the stepper. `primary` matches the rest of the design
   * system (cyan accent). `purple` switches the active/completed fills and
   * the connector track to the lavender tones used by the governance stake
   * progress screen.
   */
  palette?: StepperPalette
}

interface PaletteTokens {
  activeFill: string
  activeText: string
  completedFill: string
  completedText: string
  pendingTrack: string
  pendingBorder: string
  pendingText: string
  failedFill: string
  failedText: string
  activeRingFill: string
  activeRingText: string
}

const PRIMARY_PALETTE: PaletteTokens = {
  activeFill: '$primary',
  activeText: '$primaryDark',
  activeRingFill: '$primaryMuted',
  activeRingText: '$primaryDark',
  completedFill: '$success',
  completedText: '$primaryDark',
  pendingTrack: '$borderColorHover',
  pendingBorder: '$borderColor',
  pendingText: '$placeholderColor',
  failedFill: '$error',
  failedText: '$error',
}

const PURPLE_PALETTE: PaletteTokens = {
  activeFill: '$primary',
  activeText: '$primaryDark',
  activeRingFill: '$primaryMuted',
  activeRingText: '$primaryDark',
  completedFill: '$primary',
  completedText: '$primaryDark',
  pendingTrack: '$borderColorHover',
  pendingBorder: '$borderColor',
  pendingText: '$placeholderColor',
  failedFill: '$error',
  failedText: '$error',
}

function resolvePalette(palette: StepperPalette | undefined): PaletteTokens {
  return palette === 'purple' ? PURPLE_PALETTE : PRIMARY_PALETTE
}

function connectorColor(status: StepperStepStatus, palette: PaletteTokens): string {
  if (status === 'completed') {
    return palette.completedFill
  }

  if (status === 'active' || status === 'attention') {
    return palette.activeFill
  }

  if (status === 'failed') {
    return palette.failedFill
  }

  return palette.pendingTrack
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

function statusColor(status: StepperStepStatus, palette: PaletteTokens): string | undefined {
  if (status === 'failed' || status === 'attention') {
    return palette.failedText
  }

  if (status === 'completed') {
    return palette.completedText
  }

  if (status === 'active') {
    return palette.activeText
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

function StepperMarker({ variant, palette }: { variant: StepperMarkerVariant; palette: PaletteTokens }) {
  if (variant === 'pending') {
    return (
      <YStack
        width={MARKER_SIZE}
        height={MARKER_SIZE}
        borderRadius="$full"
        borderWidth={2}
        borderColor={palette.pendingBorder}
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
        borderColor={palette.failedFill}
        backgroundColor="transparent"
      />
    )
  }

  const fillColor = variant === 'failed' ? palette.failedFill : palette.completedFill
  const glyph =
    variant === 'completed' ? (
      <Icon name="check" size="xs" color="white" />
    ) : variant === 'failed' ? (
      <Icon name="alert-triangle" size="xs" color="white" />
    ) : (
      <Icon name="loader" size="sm" color="white" spin />
    )

  return (
    <YStack
      width={MARKER_SIZE}
      height={MARKER_SIZE}
      borderRadius="$full"
      backgroundColor={fillColor}
      alignItems="center"
      justifyContent="center"
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
  palette: PaletteTokens
}

function StepperStepRow({
  step,
  isFirst,
  isLast,
  connectorAboveColor,
  stepRef,
  palette,
}: StepperStepRowProps) {
  const isActiveStep = step.status === 'active' || step.status === 'attention'
  const isFailedStep = step.status === 'failed'
  const isAttentionStep = step.status === 'attention'
  const connectorBelowColor = connectorColor(step.status, palette)
  const titleColor = isAttentionStep
    ? palette.failedText
    : isFailedStep
      ? palette.failedText
      : step.status === 'completed' || isActiveStep
        ? palette.activeText
        : palette.pendingText
  const contentBackgroundColor = isActiveStep ? palette.activeRingFill : undefined
  const contentBorderColor = isAttentionStep
    ? palette.failedFill
    : isFailedStep
      ? palette.failedFill
      : isActiveStep
        ? palette.activeFill
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
          <StepperMarker variant={resolveMarkerVariant(step.status)} palette={palette} />
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
              secondary={!statusColor(step.status, palette)}
              color={statusColor(step.status, palette)}
              fontWeight="700"
            >
              {statusLabel(step.status)}
            </Text>
          </XStack>
          {shouldShowDescription ? (
            <Text secondary={!isActiveStep && !isFailedStep} color={isFailedStep || isAttentionStep ? palette.failedText : undefined}>
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

export function Stepper({ steps, activeStepId, header, maxHeight = 360, palette = 'primary' }: StepperProps) {
  const stepRefs = useRef(new Map<string, HTMLElement>())
  const resolvedActiveStepId = resolveActiveStepId(steps, activeStepId)
  const resolvedPalette = resolvePalette(palette)

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
              connectorAboveColor={index === 0 ? undefined : connectorColor(steps[index - 1].status, resolvedPalette)}
              stepRef={(node) => {
                if (node) {
                  stepRefs.current.set(step.id, node)
                  return
                }

                stepRefs.current.delete(step.id)
              }}
              palette={resolvedPalette}
            />
          ))}
        </YStack>
      </StepperScrollFrame>
    </YStack>
  )
}
