import React from 'react'
import { Accordion, Text } from '@goodwidget/ui'
import type { FaqItemDefinition } from '../widgetRuntimeContract'

interface FaqAccordionProps {
  faq: FaqItemDefinition[]
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
                content: <Text tone="soft">{item.answer}</Text>,
              }))}
            />
          ),
        },
      ]}
    />
  )
}
