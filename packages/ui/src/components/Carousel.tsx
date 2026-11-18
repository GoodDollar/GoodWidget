/**
 * Carousel — shows one child at a time as a horizontally scrolling slide,
 * with the neighbouring slides peeking in, faded, at the edges. Arrows, dots,
 * a swipe/scroll or a click on a faded neighbour move between slides.
 *
 * Built on native scroll snapping (like GovernanceWidget's voting carousel),
 * so swiping and trackpad scrolling work without gesture code; the current
 * slide is derived from the scroll position, so every way of moving stays in
 * sync. Web is the supported target: positions are read from the DOM.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Text as TamaguiText, XStack, YStack } from 'tamagui'
import { createComponent } from '../createComponent'

export interface CarouselProps {
  /** Each child is one slide. */
  children: React.ReactNode
  /** Width of each slide as a percentage of the carousel, leaving room for neighbours to peek in. Default 86. */
  slideWidthPercent?: number
  /** Slide shown first. Default 0. */
  initialIndex?: number
  /** Called when the current slide changes, by any means (arrow, dot, swipe, click). */
  onIndexChange?: (index: number) => void
  /** Screen-reader text for the arrows. Defaults "Previous" / "Next". */
  previousLabel?: string
  nextLabel?: string
  testID?: string
}

const DEFAULT_SLIDE_WIDTH_PERCENT = 86
/** Neighbouring slides' opacity, so the current slide reads as the focus. */
const FADED_SLIDE_OPACITY = 0.35
/** Arrows meet the 44pt touch-target baseline the charts' pressable dots use. */
const ARROW_SIZE_PX = 44
/** Same size as ChartTooltip's series dots. */
const PAGE_DOT_SIZE_PX = 8

const CarouselFrame = createComponent(YStack, {
  name: 'Carousel',
  width: '100%',
  alignSelf: 'stretch',
})

const CarouselViewport = createComponent(YStack, {
  name: 'CarouselViewport',
  position: 'relative',
  width: '100%',
})

const CarouselArrow = createComponent(YStack, {
  name: 'CarouselArrow',
  position: 'absolute',
  top: '50%',
  width: ARROW_SIZE_PX,
  height: ARROW_SIZE_PX,
  marginTop: -ARROW_SIZE_PX / 2,
  borderRadius: '$full',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$background',
  borderWidth: 1,
  borderColor: '$borderColor',
  cursor: 'pointer',
  zIndex: 2,
})

const CarouselArrowText = createComponent(TamaguiText, {
  name: 'CarouselArrowText',
  fontFamily: '$body',
  fontSize: '$6',
  color: '$color',
})

const CarouselPageDot = createComponent(YStack, {
  name: 'CarouselPageDot',
  width: PAGE_DOT_SIZE_PX,
  height: PAGE_DOT_SIZE_PX,
  borderRadius: '$full',
  cursor: 'pointer',
})

/** Scroll offset that shows slide `index`: first aligned left, last aligned right, others centered. */
function scrollLeftForSlide(track: HTMLElement, index: number): number {
  const slides = track.children
  const slide = slides[index] as HTMLElement | undefined
  const first = slides[0] as HTMLElement | undefined
  if (!slide || !first) return 0
  const room = track.clientWidth - slide.offsetWidth
  const alignOffset = index === 0 ? 0 : index === slides.length - 1 ? room : room / 2
  const maxScroll = track.scrollWidth - track.clientWidth
  return Math.min(maxScroll, Math.max(0, slide.offsetLeft - first.offsetLeft - alignOffset))
}

/** The slide whose resting scroll offset is closest to the current one. */
function currentSlideIndex(track: HTMLElement): number {
  let best = 0
  for (let index = 1; index < track.children.length; index += 1) {
    if (
      Math.abs(scrollLeftForSlide(track, index) - track.scrollLeft) <
      Math.abs(scrollLeftForSlide(track, best) - track.scrollLeft)
    ) {
      best = index
    }
  }
  return best
}

export function Carousel({
  children,
  slideWidthPercent = DEFAULT_SLIDE_WIDTH_PERCENT,
  initialIndex = 0,
  onIndexChange,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  testID,
}: CarouselProps) {
  const slides = React.Children.toArray(children)
  const slideCount = slides.length
  const isSingle = slideCount <= 1
  const trackRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(() => Math.min(Math.max(0, initialIndex), Math.max(0, slideCount - 1)))

  const goTo = useCallback((index: number, smooth = true) => {
    const track = trackRef.current
    if (!track?.scrollTo) return
    const target = Math.min(Math.max(0, index), track.children.length - 1)
    track.scrollTo({ left: scrollLeftForSlide(track, target), behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  // Start on initialIndex without an animated scroll. Mount only: later moves come from the user.
  useEffect(() => {
    goTo(currentIndex, false)
  }, [])

  const handleScroll = () => {
    const track = trackRef.current
    if (!track) return
    const index = currentSlideIndex(track)
    if (index !== currentIndex) {
      setCurrentIndex(index)
      onIndexChange?.(index)
    }
  }

  return (
    <CarouselFrame testID={testID} data-testid={testID}>
      <CarouselViewport>
        <XStack
          ref={trackRef}
          data-testid={testID ? `${testID}-track` : undefined}
          width="100%"
          gap="$3"
          alignItems="center"
          onScroll={handleScroll}
          // Height = the tallest slide (a flex row sizes to it); shorter slides sit centered.
          style={{
            overflowX: isSingle ? 'hidden' : 'auto',
            overflowY: 'hidden',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
          }}
        >
          {slides.map((slide, index) => {
            const isCurrent = index === currentIndex
            const snapAlign = index === 0 ? 'start' : index === slideCount - 1 ? 'end' : 'center'
            return (
              <YStack
                key={index}
                width={isSingle ? '100%' : `${slideWidthPercent}%`}
                flexShrink={0}
                minWidth={0}
                opacity={isCurrent ? 1 : FADED_SLIDE_OPACITY}
                cursor={isCurrent ? undefined : 'pointer'}
                onPress={isCurrent ? undefined : () => goTo(index)}
                aria-hidden={isCurrent ? undefined : true}
                data-testid={testID ? `${testID}-slide-${index}` : undefined}
                style={{ scrollSnapAlign: snapAlign }}
              >
                {/* A faded slide's content ignores the pointer, so a click lands on the slide and moves to it. */}
                <YStack pointerEvents={isCurrent ? 'auto' : 'none'}>{slide}</YStack>
              </YStack>
            )
          })}
        </XStack>
        {!isSingle && currentIndex > 0 ? (
          <CarouselArrow
            left={0}
            role="button"
            aria-label={previousLabel}
            onPress={() => goTo(currentIndex - 1)}
            data-testid={testID ? `${testID}-previous` : undefined}
          >
            <CarouselArrowText aria-hidden>‹</CarouselArrowText>
          </CarouselArrow>
        ) : null}
        {!isSingle && currentIndex < slideCount - 1 ? (
          <CarouselArrow
            right={0}
            role="button"
            aria-label={nextLabel}
            onPress={() => goTo(currentIndex + 1)}
            data-testid={testID ? `${testID}-next` : undefined}
          >
            <CarouselArrowText aria-hidden>›</CarouselArrowText>
          </CarouselArrow>
        ) : null}
      </CarouselViewport>
      {!isSingle ? (
        <XStack justifyContent="center" gap="$2" marginTop="$3">
          {slides.map((_, index) => (
            <CarouselPageDot
              key={index}
              role="button"
              aria-label={`${index + 1} / ${slideCount}`}
              aria-current={index === currentIndex ? true : undefined}
              backgroundColor={index === currentIndex ? '$color' : '$borderColor'}
              onPress={() => goTo(index)}
              data-testid={testID ? `${testID}-dot-${index}` : undefined}
            />
          ))}
        </XStack>
      ) : null}
    </CarouselFrame>
  )
}
