/**
 * Carousel — one slide at a time, neighbours peeking in faded; arrows, dots,
 * swipe or a click on a faded slide move between slides. Fixed content only.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Card, Carousel, Text, YStack } from '@goodwidget/ui'
import { withDefaultPreset } from '../helpers/withDefaultPreset'

const meta: Meta<typeof Carousel> = {
  title: 'Design System/Primitives/Carousel',
  component: Carousel,
  tags: ['autodocs', 'showcase'],
  // stretchWrapper: slides are a percentage of the carousel's width, so the story frame must
  // give it the real width instead of shrinking to fit its content.
  parameters: { layout: 'padded', stretchWrapper: true },
  decorators: [withDefaultPreset],
}
export default meta
type Story = StoryObj<typeof Carousel>

/** A slide with a given number of text lines, so slides differ in height. */
function DemoSlide({ title, lines }: { title: string; lines: number }) {
  return (
    <Card padding="$4" gap="$2">
      <Text fontWeight="700">{title}</Text>
      {Array.from({ length: lines }, (_, index) => (
        <Text key={index}>Line {index + 1}</Text>
      ))}
    </Card>
  )
}

/** Three slides of different heights: the carousel keeps the tallest one's height, so moving
 * between slides never makes the page jump; shorter slides sit centered. */
export const ThreeSlides: Story = {
  render: () => (
    <YStack width="100%">
      <Carousel testID="Carousel-three">
        <DemoSlide title="First" lines={2} />
        <DemoSlide title="Second" lines={5} />
        <DemoSlide title="Third" lines={3} />
      </Carousel>
    </YStack>
  ),
}

/** Two slides: the first aligned left, the second aligned right. */
export const TwoSlides: Story = {
  render: () => (
    <YStack width="100%">
      <Carousel testID="Carousel-two">
        <DemoSlide title="First" lines={3} />
        <DemoSlide title="Second" lines={3} />
      </Carousel>
    </YStack>
  ),
}

/** `slideLabels`: a short label above each slide, sized from the carousel's text; it fades with
 * its slide. The second slide has no label (empty entry). */
export const SlideLabels: Story = {
  render: () => (
    <YStack width="100%">
      <Carousel testID="Carousel-labels" slideLabels={['By region · this week', '', 'By channel · this week']}>
        <DemoSlide title="First" lines={3} />
        <DemoSlide title="Second" lines={3} />
        <DemoSlide title="Third" lines={3} />
      </Carousel>
    </YStack>
  ),
}

/** Slides with a link each: only the current slide's link takes keyboard focus; the faded
 * neighbours' content is inert until you move to them. */
export const SlidesWithLinks: Story = {
  render: () => (
    <YStack width="100%">
      <Carousel testID="Carousel-links">
        {['First', 'Second'].map((title) => (
          <Card key={title} padding="$4" gap="$2">
            <Text fontWeight="700">{title}</Text>
            <a href="#" data-testid={`Carousel-links-${title}`}>
              Open {title}
            </a>
          </Card>
        ))}
      </Carousel>
    </YStack>
  ),
}

/** `slideWidthPercent={30}` with four slides: values below 50 are treated as 50, so every slide,
 * including the second, can still become the current one. */
export const NarrowSlides: Story = {
  render: () => (
    <YStack width="100%">
      <Carousel testID="Carousel-narrow" slideWidthPercent={30}>
        <DemoSlide title="First" lines={2} />
        <DemoSlide title="Second" lines={2} />
        <DemoSlide title="Third" lines={2} />
        <DemoSlide title="Fourth" lines={2} />
      </Carousel>
    </YStack>
  ),
}

/** One child: full width, no arrows, no dots. */
export const SingleSlide: Story = {
  render: () => (
    <YStack width="100%">
      <Carousel testID="Carousel-single">
        <DemoSlide title="Only slide" lines={3} />
      </Carousel>
    </YStack>
  ),
}
