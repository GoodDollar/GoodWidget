import React from 'react'
import { Accordion, Anchor, Text, XStack, YStack } from '@goodwidget/ui'
import type { FaqAnswerSegment, FaqItemDefinition } from '../widgetRuntimeContract'

interface FaqAccordionProps {
  faq: FaqItemDefinition[]
}

// Stitches plain-text segments and { text, href } link segments into one
// run of inline content, opening links in a new tab like other external
// links in this widget.
function renderSegments(segments: FaqAnswerSegment[], keyPrefix: string) {
  return segments.map((segment, index) =>
    typeof segment === 'string' ? (
      <React.Fragment key={`${keyPrefix}-${index}`}>{segment}</React.Fragment>
    ) : (
      <Anchor key={`${keyPrefix}-${index}`} href={segment.href} target="_blank">
        {segment.text}
      </Anchor>
    ),
  )
}

// Renders a plain-string answer as-is, or an answer made of blocks — each
// block is either a paragraph or a bullet list, stacked in order.
function renderFaqAnswer(answer: FaqItemDefinition['answer']) {
  if (typeof answer === 'string') {
    return <Text tone="soft">{answer}</Text>
  }

  return (
    <YStack gap="$2">
      {answer.map((block, blockIndex) =>
        Array.isArray(block) ? (
          <Text key={blockIndex} tone="soft">
            {renderSegments(block, `p${blockIndex}`)}
          </Text>
        ) : (
          <YStack key={blockIndex} gap="$1">
            {block.items.map((item, itemIndex) => (
              <XStack key={itemIndex} gap="$2">
                <Text tone="soft">{'•'}</Text>
                <Text tone="soft" flex={1}>
                  {renderSegments(item, `b${blockIndex}-${itemIndex}`)}
                </Text>
              </XStack>
            ))}
          </YStack>
        ),
      )}
    </YStack>
  )
}

/**
 * FAQ is one top-level collapsible ("FAQ") rather than N top-level accordion
 * items — this keeps the collapsed page short on phone. Opening it reveals an
 * inner Accordion with one item per question, each toggling independently.
 */
export function FaqAccordion({ faq }: FaqAccordionProps) {
  return (
    <Accordion
      items={[
        {
          id: 'faq-section',
          title: 'FAQ',
          content: (
            <Accordion
              items={faq.map((item, index) => ({
                id: `faq-${index}`,
                title: item.question,
                content: renderFaqAnswer(item.answer),
              }))}
            />
          ),
        },
      ]}
    />
  )
}
