import React from 'react'
import { Accordion, Anchor, Text, YStack } from '@goodwidget/ui'
import type { AccordionItem } from '@goodwidget/ui'
import { BRIDGE_FAQ_ITEMS } from '../faqContent'
import { BridgingTabContent } from './shared'

function FaqAnswer({ item }: { item: (typeof BRIDGE_FAQ_ITEMS)[number] }) {
  return (
    <YStack gap="$2">
      {item.answer.map((paragraph, index) => (
        <Text key={`${item.id}-paragraph-${index}`} secondary>
          {paragraph}
        </Text>
      ))}
      {item.links?.map((link) => (
        <Text key={link.href} secondary>
          {link.text ? `${link.text} ` : null}
          <Anchor href={link.href}>{link.linkText}</Anchor>
        </Text>
      ))}
    </YStack>
  )
}

// One Accordion row per question, collapsed by default (Accordion's own
// single-open behavior keeps the tab short). Content is static reference
// copy from GoodProtocolUI's Main Bridge FAQ — see faqContent.ts.
export function FaqTab() {
  const items: AccordionItem[] = BRIDGE_FAQ_ITEMS.map((item) => ({
    id: item.id,
    title: item.question,
    content: <FaqAnswer item={item} />,
  }))

  return (
    <BridgingTabContent>
      <Accordion items={items} />
    </BridgingTabContent>
  )
}
