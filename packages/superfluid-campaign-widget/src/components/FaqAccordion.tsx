import React from 'react'
import { Accordion, Heading, Text, YStack } from '@goodwidget/ui'
import type { FaqItemMockData } from '../widgetRuntimeContract'

interface FaqAccordionProps {
  faq: FaqItemMockData[]
}

/** Thin wrapper feeding CampaignMockData.faq into the shared Accordion primitive. */
export function FaqAccordion({ faq }: FaqAccordionProps) {
  return (
    <YStack gap="$3" width="100%">
      <Heading level={4}>FAQ</Heading>
      <Accordion
        items={faq.map((item, index) => ({
          id: `faq-${index}`,
          title: item.question,
          content: <Text secondary>{item.answer}</Text>,
        }))}
      />
    </YStack>
  )
}
