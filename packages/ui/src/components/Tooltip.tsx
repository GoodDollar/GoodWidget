import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Stack, Text as TamaguiText } from 'tamagui'

/** How long a tapped tooltip stays visible when no hover/blur event closes it (touch devices). */
const TAP_VISIBLE_DURATION_MS = 2500
/** Gap between the trigger and the tooltip bubble. */
const TOOLTIP_OFFSET_PX = 8

export interface TooltipProps {
  /** Text shown inside the tooltip bubble; also announced to assistive tech through aria-describedby. */
  label: string
  /** The element the tooltip describes. */
  children: React.ReactNode
}

interface TooltipPosition {
  left: number
  top: number
}

/**
 * Tooltip shown on hover, keyboard focus, and tap.
 *
 * The bubble is positioned with `position: fixed` from the trigger's bounding
 * box instead of being portalled, so it is not clipped by horizontally
 * scrolling ancestors (the leaderboard table) and stays inside the widget's
 * shadow root where the theme styles live. Escape dismisses it.
 */
export function Tooltip({ label, children }: TooltipProps) {
  const tooltipId = useId()
  const triggerRef = useRef<HTMLElement | null>(null)
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [position, setPosition] = useState<TooltipPosition | null>(null)

  const clearTapTimeout = useCallback(() => {
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current)
      tapTimeoutRef.current = null
    }
  }, [])

  const hideTooltip = useCallback(() => {
    clearTapTimeout()
    setPosition(null)
  }, [clearTapTimeout])

  // Centers the bubble horizontally over the trigger and places it above it.
  const showTooltip = useCallback(() => {
    const triggerRect = triggerRef.current?.getBoundingClientRect()
    if (!triggerRect) return
    setPosition({
      left: triggerRect.left + triggerRect.width / 2,
      top: triggerRect.top - TOOLTIP_OFFSET_PX,
    })
  }, [])

  const showTooltipBriefly = useCallback(() => {
    clearTapTimeout()
    showTooltip()
    tapTimeoutRef.current = setTimeout(hideTooltip, TAP_VISIBLE_DURATION_MS)
  }, [clearTapTimeout, hideTooltip, showTooltip])

  useEffect(() => clearTapTimeout, [clearTapTimeout])

  // Scrolling would leave the fixed bubble detached from its trigger, so close it.
  useEffect(() => {
    if (!position) return undefined
    const handleDismiss = (event: Event) => {
      if (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape') return
      hideTooltip()
    }
    window.addEventListener('scroll', handleDismiss, true)
    window.addEventListener('keydown', handleDismiss)
    return () => {
      window.removeEventListener('scroll', handleDismiss, true)
      window.removeEventListener('keydown', handleDismiss)
    }
  }, [position, hideTooltip])

  return (
    <Stack
      ref={triggerRef as React.Ref<never>}
      tabIndex={0}
      aria-describedby={position ? tooltipId : undefined}
      onHoverIn={showTooltip}
      onHoverOut={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      onPress={showTooltipBriefly}
      cursor="default"
    >
      {children}
      {position && (
        <Stack
          id={tooltipId}
          role="tooltip"
          pointerEvents="none"
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius="$2"
          backgroundColor="$background"
          borderWidth={1}
          borderColor="$borderColor"
          zIndex={1000}
          style={{
            position: 'fixed',
            left: position.left,
            top: position.top,
            transform: 'translate(-50%, -100%)',
            whiteSpace: 'nowrap',
          }}
        >
          <TamaguiText fontSize="$2" color="$color">
            {label}
          </TamaguiText>
        </Stack>
      )}
    </Stack>
  )
}
