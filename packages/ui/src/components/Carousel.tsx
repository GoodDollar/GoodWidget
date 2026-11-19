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
import { useMeasuredWidth } from '../hooks/useMeasuredWidth'
import { computeChartScaleRatio, scalePx } from '../utils/chartResponsiveScale'

export interface CarouselProps {
  /** Each child is one slide. */
  children: React.ReactNode
  /** Width of each slide as a percentage of the carousel, leaving room for neighbours to peek in. Default 86. */
  slideWidthPercent?: number
  /** Slide shown first. Default 0. */
  initialIndex?: number
  /** Called when the current slide changes, by any means (arrow, dot, swipe, click). */
  onIndexChange?: (index: number) => void
  /** A short label above each slide, in slide order (e.g. "Each team · report of Nov 15"), in the
   * carousel's text size, muted and semi-bold. It fades with its slide. Omitted or missing entry = no label. */
  slideLabels?: string[]
  /** Screen-reader text for the arrows. Defaults "Previous" / "Next". */
  previousLabel?: string
  nextLabel?: string
  testID?: string
}

const DEFAULT_SLIDE_WIDTH_PERCENT = 86
/** Neighbouring slides' opacity, so the current slide reads as the focus. */
const FADED_SLIDE_OPACITY = 0.35

/**
 * Every size below is a multiple of the carousel's own text size, and that text
 * size scales with the carousel's measured width on the same tiers as the charts
 * (base / ratio², tuned at a 400 px reference width, see chartResponsiveScale.ts),
 * so arrows, dots and gaps grow and shrink with the screen. The multiples are the
 * approved dashboard preview's proportions (its carousel text is 13 px).
 */
const CAROUSEL_BASE_SIZE_PX = 24
const GOLDEN_RATIO = 1.618
const MIN_FONT_SIZE_PX = 12
const REFERENCE_WIDTH_PX = 400
const TEXT_BASE_SIZE_PX = CAROUSEL_BASE_SIZE_PX / GOLDEN_RATIO ** 2
/** Arrow button = 2.6 x text (preview: 34 px button). */
const ARROW_TO_TEXT_RATIO = 2.6
/** Arrow glyph = 1.5 x text (preview: 20 px glyph). */
const ARROW_GLYPH_TO_TEXT_RATIO = 1.5
/** Page dot, and the space between dots = 0.6 x text (preview: 8 px). */
const PAGE_DOT_TO_TEXT_RATIO = 0.6
/** Space between slides = 1.1 x text (preview: 14 px). */
const SLIDE_GAP_TO_TEXT_RATIO = 1.1
/** Space above the dots = 0.9 x text (preview: 12 px). */
const DOTS_TOP_GAP_TO_TEXT_RATIO = 0.9
/** About a sixth of each arrow sits outside the slides' edge, so it covers less of the slide
 * (preview: 6 px of a 34 px button). Hosts need that much room around the carousel; a card's
 * padding is plenty. */
const ARROW_OUTSIDE_EDGE_RATIO = 0.18
/** Space between a slide label and its slide = 0.6 x text (preview: 8 px). */
const SLIDE_LABEL_GAP_TO_TEXT_RATIO = 0.6
/** Arrow outline stays a hairline at every size so it reads crisp, not heavier on wide screens. */
const ARROW_BORDER_WIDTH_PX = 1

function carouselTextSizePx(widthPx: number): number {
  return Math.max(MIN_FONT_SIZE_PX, scalePx(TEXT_BASE_SIZE_PX, computeChartScaleRatio(widthPx, REFERENCE_WIDTH_PX)))
}

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

/** Arrows and page dots are native buttons (like the package's Button), so they take keyboard focus
 * and Enter/Space; padding is reset so their size stays the one set below. */
const CarouselArrow = createComponent(YStack, {
  name: 'CarouselArrow',
  tag: 'button',
  padding: 0,
  position: 'absolute',
  top: '50%',
  borderRadius: '$full',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$background',
  borderWidth: ARROW_BORDER_WIDTH_PX,
  borderColor: '$borderColor',
  cursor: 'pointer',
  zIndex: 2,
})

const CarouselArrowText = createComponent(TamaguiText, {
  name: 'CarouselArrowText',
  fontFamily: '$body',
  color: '$color',
})

const CarouselSlideLabelText = createComponent(TamaguiText, {
  name: 'CarouselSlideLabelText',
  fontFamily: '$body',
  fontWeight: '600',
  color: '$placeholderColor',
})

const CarouselPageDot = createComponent(YStack, {
  name: 'CarouselPageDot',
  tag: 'button',
  padding: 0,
  borderWidth: 0,
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
  slideLabels,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  testID,
}: CarouselProps) {
  const slides = React.Children.toArray(children)
  const slideCount = slides.length
  const isSingle = slideCount <= 1
  const trackRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(() => Math.min(Math.max(0, initialIndex), Math.max(0, slideCount - 1)))
  const { measuredWidthPx, onLayout } = useMeasuredWidth(REFERENCE_WIDTH_PX)
  const textSizePx = carouselTextSizePx(measuredWidthPx)
  const arrowSizePx = textSizePx * ARROW_TO_TEXT_RATIO
  const arrowGlyphSizePx = textSizePx * ARROW_GLYPH_TO_TEXT_RATIO
  const pageDotSizePx = textSizePx * PAGE_DOT_TO_TEXT_RATIO
  const arrowEdgeOffsetPx = -arrowSizePx * ARROW_OUTSIDE_EDGE_RATIO

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

  // A faded slide's content is inert (web): keyboard focus can't enter controls that are hidden
  // from screen readers, while the slide itself stays clickable to move to it. Set on the DOM
  // element (not as a prop) so it behaves the same on React 18 and 19.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    Array.from(track.children).forEach((slide, index) => {
      const content = slide.firstElementChild as HTMLElement | null
      if (content && typeof content.inert === 'boolean') content.inert = index !== currentIndex
    })
  }, [currentIndex, slideCount])

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
    <CarouselFrame testID={testID} data-testid={testID} onLayout={onLayout}>
      <CarouselViewport>
        <XStack
          ref={trackRef}
          data-testid={testID ? `${testID}-track` : undefined}
          width="100%"
          gap={textSizePx * SLIDE_GAP_TO_TEXT_RATIO}
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
                {/* Also made inert while faded, see the effect above. */}
                <YStack
                  pointerEvents={isCurrent ? 'auto' : 'none'}
                  data-testid={testID ? `${testID}-slide-${index}-content` : undefined}
                >
                  {slideLabels?.[index] ? (
                    <CarouselSlideLabelText
                      fontSize={textSizePx}
                      marginBottom={textSizePx * SLIDE_LABEL_GAP_TO_TEXT_RATIO}
                      data-testid={testID ? `${testID}-label-${index}` : undefined}
                    >
                      {slideLabels[index]}
                    </CarouselSlideLabelText>
                  ) : null}
                  {slide}
                </YStack>
              </YStack>
            )
          })}
        </XStack>
        {!isSingle && currentIndex > 0 ? (
          <CarouselArrow
            left={arrowEdgeOffsetPx}
            width={arrowSizePx}
            height={arrowSizePx}
            marginTop={-arrowSizePx / 2}
            role="button"
            aria-label={previousLabel}
            onPress={() => goTo(currentIndex - 1)}
            data-testid={testID ? `${testID}-previous` : undefined}
          >
            <CarouselArrowText aria-hidden fontSize={arrowGlyphSizePx}>
              ‹
            </CarouselArrowText>
          </CarouselArrow>
        ) : null}
        {!isSingle && currentIndex < slideCount - 1 ? (
          <CarouselArrow
            right={arrowEdgeOffsetPx}
            width={arrowSizePx}
            height={arrowSizePx}
            marginTop={-arrowSizePx / 2}
            role="button"
            aria-label={nextLabel}
            onPress={() => goTo(currentIndex + 1)}
            data-testid={testID ? `${testID}-next` : undefined}
          >
            <CarouselArrowText aria-hidden fontSize={arrowGlyphSizePx}>
              ›
            </CarouselArrowText>
          </CarouselArrow>
        ) : null}
      </CarouselViewport>
      {!isSingle ? (
        <XStack
          justifyContent="center"
          gap={pageDotSizePx}
          marginTop={textSizePx * DOTS_TOP_GAP_TO_TEXT_RATIO}
        >
          {slides.map((_, index) => (
            <CarouselPageDot
              key={index}
              width={pageDotSizePx}
              height={pageDotSizePx}
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
