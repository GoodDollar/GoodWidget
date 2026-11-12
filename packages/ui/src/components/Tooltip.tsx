import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Stack, Text as TamaguiText } from 'tamagui'

/** How long a tapped tooltip stays visible when no hover/blur event closes it (touch devices). */
const TAP_VISIBLE_DURATION_MS = 2500
/** Gap between the trigger and the tooltip bubble. */
const TOOLTIP_OFFSET_PX = 8
/** Lets the pointer cross the gap between the trigger and the tooltip bubble. */
const HIDE_DELAY_MS = 120
/** Keeps the bubble away from viewport edges. */
const VIEWPORT_MARGIN_PX = 8

export interface TooltipProps {
  /** Text shown inside the tooltip bubble; also announced to assistive tech through aria-describedby. */
  label: string
  /** The element the tooltip describes. */
  children: React.ReactNode
}

interface TooltipPosition {
  left: number
  top: number
  placement: 'above' | 'below'
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
  const tooltipRef = useRef<HTMLElement | null>(null)
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerHoveredRef = useRef(false)
  const tooltipHoveredRef = useRef(false)
  const focusedRef = useRef(false)
  const [position, setPosition] = useState<TooltipPosition | null>(null)

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])

  const clearTapTimeout = useCallback(() => {
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current)
      tapTimeoutRef.current = null
    }
  }, [])

  const hideTooltip = useCallback(() => {
    clearHideTimeout()
    clearTapTimeout()
    triggerHoveredRef.current = false
    tooltipHoveredRef.current = false
    focusedRef.current = false
    setPosition(null)
  }, [clearHideTimeout, clearTapTimeout])

  const scheduleHide = useCallback(() => {
    clearHideTimeout()
    hideTimeoutRef.current = setTimeout(() => {
      hideTimeoutRef.current = null
      if (!triggerHoveredRef.current && !tooltipHoveredRef.current && !focusedRef.current) {
        clearTapTimeout()
        setPosition(null)
      }
    }, HIDE_DELAY_MS)
  }, [clearHideTimeout, clearTapTimeout])

  const showTooltip = useCallback(() => {
    clearHideTimeout()
    const triggerRect = triggerRef.current?.getBoundingClientRect?.()
    if (!triggerRect) return
    setPosition({
      left: triggerRect.left + triggerRect.width / 2,
      top: triggerRect.top - TOOLTIP_OFFSET_PX,
      placement: 'above',
    })
  }, [clearHideTimeout])

  const showTooltipBriefly = useCallback(() => {
    clearHideTimeout()
    clearTapTimeout()
    showTooltip()
    tapTimeoutRef.current = setTimeout(() => {
      tapTimeoutRef.current = null
      if (!triggerHoveredRef.current && !tooltipHoveredRef.current && !focusedRef.current) {
        setPosition(null)
      }
    }, TAP_VISIBLE_DURATION_MS)
  }, [clearHideTimeout, clearTapTimeout, showTooltip])

  useEffect(
    () => () => {
      clearHideTimeout()
      clearTapTimeout()
    },
    [clearHideTimeout, clearTapTimeout],
  )

  // Measure the rendered bubble before paint, then keep it inside the viewport.
  useLayoutEffect(() => {
    if (!position || typeof window === 'undefined') return
    const triggerRect = triggerRef.current?.getBoundingClientRect?.()
    const tooltipRect = tooltipRef.current?.getBoundingClientRect?.()
    if (!triggerRect || !tooltipRect) return

    const viewportWidth = window.visualViewport?.width ?? window.innerWidth
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight
    const aboveTop = triggerRect.top - TOOLTIP_OFFSET_PX - tooltipRect.height
    const placement =
      aboveTop >= VIEWPORT_MARGIN_PX && position.placement === 'above' ? 'above' : 'below'
    const halfTooltipWidth = Math.min(
      tooltipRect.width,
      viewportWidth - VIEWPORT_MARGIN_PX * 2,
    ) / 2
    const left = Math.max(
      VIEWPORT_MARGIN_PX + halfTooltipWidth,
      Math.min(
        triggerRect.left + triggerRect.width / 2,
        viewportWidth - VIEWPORT_MARGIN_PX - halfTooltipWidth,
      ),
    )
    const top =
      placement === 'above'
        ? aboveTop
        : Math.max(
            VIEWPORT_MARGIN_PX,
            Math.min(
              triggerRect.bottom + TOOLTIP_OFFSET_PX,
              viewportHeight - tooltipRect.height - VIEWPORT_MARGIN_PX,
            ),
          )

    if (position.left !== left || position.top !== top || position.placement !== placement) {
      setPosition({ left, top, placement })
    }
  }, [position])

  // Scroll events inside a shadow root do not reach window, so listen on both roots.
  useEffect(() => {
    if (!position) return undefined
    const handleScroll = () => hideTooltip()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      hideTooltip()
    }
    if (typeof window === 'undefined') return undefined
    const root = triggerRef.current?.getRootNode()
    root?.addEventListener('scroll', handleScroll, true)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      root?.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [position, hideTooltip])

  return (
    <Stack
      ref={triggerRef as React.Ref<never>}
      tabIndex={0}
      aria-describedby={position ? tooltipId : undefined}
      onHoverIn={() => {
        triggerHoveredRef.current = true
        clearHideTimeout()
        showTooltip()
      }}
      onHoverOut={() => {
        triggerHoveredRef.current = false
        scheduleHide()
      }}
      onFocus={() => {
        focusedRef.current = true
        clearHideTimeout()
        showTooltip()
      }}
      onBlur={() => {
        focusedRef.current = false
        scheduleHide()
      }}
      onPress={showTooltipBriefly}
      cursor="default"
    >
      {children}
      {position && (
        <Stack
          ref={tooltipRef as React.Ref<never>}
          id={tooltipId}
          role="tooltip"
          onHoverIn={() => {
            tooltipHoveredRef.current = true
            clearHideTimeout()
          }}
          onHoverOut={() => {
            tooltipHoveredRef.current = false
            scheduleHide()
          }}
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
            transform: `translate(-50%, ${position.placement === 'above' ? '-100%' : '0'})`,
            maxWidth: 'calc(100vw - 16px)',
            whiteSpace: 'normal',
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
