import React, { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { Text } from './Text'
import { XStack, YStack } from '../components-test/Stacks'
import { createComponent } from '../createComponent'
import {
  FOCUSED_STATUSES,
  MARKER_SIZE,
  ROW_GAP_PX,
  STEP_STYLE,
  type MarkerStyle,
  type StepperStepStatus,
} from './stepperStyles'

export type { StepperStepStatus } from './stepperStyles'

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

const markerBase = { width: MARKER_SIZE, height: MARKER_SIZE, borderRadius: '$full' as const }

function StepperMarker({ marker }: { marker: MarkerStyle }) {
  if (marker.type === 'ring') {
    return (
      <YStack
        {...markerBase}
        borderWidth={2}
        borderColor={marker.border}
        backgroundColor={marker.fill ?? 'transparent'}
      />
    )
  }

  return (
    <YStack
      {...markerBase}
      backgroundColor={marker.color}
      alignItems="center"
      justifyContent="center"
      color="$white"
    >
      <Icon
        name={marker.icon}
        size={marker.icon === 'loader' ? 'sm' : 'xs'}
        color="inherit"
        spin={marker.spin}
      />
    </YStack>
  )
}

function Connector({
  color,
  minHeight,
  marginTop,
  marginBottom,
}: {
  color: string
  minHeight: number
  marginTop?: number
  marginBottom?: number
}) {
  return (
    <YStack
      width={2}
      flex={1}
      minHeight={minHeight}
      backgroundColor={color}
      marginTop={marginTop}
      marginBottom={marginBottom}
    />
  )
}

const StepperStepContent = createComponent(YStack, {
  name: 'StepperStepContent',
  flex: 1,
  paddingTop: '$1',
  variants: {
    emphasis: {
      true: {
        gap: '$2',
        paddingHorizontal: '$3',
        paddingVertical: '$3',
        borderRadius: '$3',
        borderWidth: 1,
      },
      false: {
        gap: '$1',
        paddingBottom: '$3',
      },
    },
  } as const,
  defaultVariants: {
    emphasis: false,
  },
})

function StepperStepRow({
  step,
  isFirst,
  isLast,
  connectorAboveColor,
  stepRef,
}: {
  step: StepperStepItem
  isFirst: boolean
  isLast: boolean
  connectorAboveColor?: string
  stepRef: (node: HTMLElement | null) => void
}) {
  const style = STEP_STYLE[step.status]
  const showDescription = Boolean(step.description) && (style.active || style.failed)
  const emphasized = style.active || style.failed

  return (
    <YStack ref={stepRef} width="100%">
      <XStack alignItems="stretch" gap="$3">
        <YStack
          alignItems="center"
          width={MARKER_SIZE}
          flexShrink={0}
          marginTop={emphasized ? '$2' : '$1'}
        >
          {!isFirst && connectorAboveColor && (
            <Connector color={connectorAboveColor} minHeight={6} marginTop={-ROW_GAP_PX} />
          )}
          <StepperMarker marker={style.marker} />
          {!isLast && (
            <Connector color={style.connector} minHeight={16} marginBottom={-ROW_GAP_PX} />
          )}
        </YStack>

        <StepperStepContent
          emphasis={emphasized}
          paddingBottom={isLast ? '$0' : undefined}
          borderColor={style.borderColor}
          // Active step: replace uniform thin border with a prominent left accent bar
          {...(style.active ? { borderWidth: 0, borderLeftWidth: 3 } : {})}
        >
          <XStack alignItems="center" justifyContent="space-between" gap="$2">
            <XStack alignItems="center" gap="$2" flex={1} flexWrap="wrap">
              <Text
                color={style.titleColor}
                fontWeight={style.active ? '700' : step.status === 'completed' ? '600' : '400'}
                fontSize={style.active ? '$4' : undefined}
              >
                {step.title}
              </Text>
              {style.attention && <Icon name="alert-triangle" size="xs" color="inherit" />}
            </XStack>
            <Text
              variant="caption"
              secondary={!style.statusColor}
              color={style.statusColor}
              fontWeight="700"
            >
              {style.label}
            </Text>
          </XStack>
          {showDescription && (
            <Text
              secondary={!emphasized}
              color={style.failed || style.attention ? '$warning' : undefined}
            >
              {step.description}
            </Text>
          )}
        </StepperStepContent>
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

export function Stepper({ steps, activeStepId, header, maxHeight = 360 }: StepperProps) {
  const stepRefs = useRef(new Map<string, HTMLElement>())
  const resolvedActiveStepId =
    activeStepId ?? steps.find((step) => FOCUSED_STATUSES.has(step.status))?.id ?? null

  ensureScrollbarHidden()

  useEffect(() => {
    if (!resolvedActiveStepId) return undefined

    const frame = requestAnimationFrame(() => {
      stepRefs.current.get(resolvedActiveStepId)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
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
              connectorAboveColor={
                index === 0 ? undefined : STEP_STYLE[steps[index - 1].status].connector
              }
              stepRef={(node) => {
                if (node) stepRefs.current.set(step.id, node)
                else stepRefs.current.delete(step.id)
              }}
            />
          ))}
        </YStack>
      </StepperScrollFrame>
    </YStack>
  )
}
