import React, { useState } from 'react'
import { Card, Heading, Icon, Separator, Text, XStack, YStack } from '@goodwidget/ui'

const FAQ_ITEMS = [
  {
    id: 'what-are-credits',
    question: 'What are AI credits?',
    answer:
      'AI credits pay for AntSeed-compatible coding tools. You buy them with G$ on Celo; they settle on Base and appear in your Manage tab balance.',
  },
  {
    id: 'how-to-buy',
    question: 'How do I buy credits?',
    answer:
      'Complete the Buy Credits steps: generate a buyer key, sign operator consent, then enter a one-time G$ deposit and/or a monthly G$ stream and confirm the Celo transaction.',
  },
  {
    id: 'deposit-vs-stream',
    question: 'What is a one-time deposit vs a monthly stream?',
    answer:
      'A one-time deposit converts G$ into credits right away. A monthly stream sets a G$/month flow rate on Celo; credits are added in real time as G$ streams in, not as a single monthly lump.',
  },
  {
    id: 'minimums',
    question: 'What are the minimum amounts?',
    answer:
      'Your first one-time deposit must be at least US$1.00. If you set a monthly stream, it must be at least US$1.00/month. After your first deposit, there is no minimum for additional one-time deposits.',
  },
  {
    id: 'goodid-bonus',
    question: 'How do GoodID bonuses work?',
    answer:
      'With a verified GoodID you receive +10% bonus credits on one-time deposits and +20% on streams. Without GoodID verification, bonuses do not apply.',
  },
  {
    id: 'buyer-key',
    question: 'What is the buyer key?',
    answer:
      'Your payer wallet pays G$ on Celo. The buyer key is a separate key derived from a payer signature; it manages your AI credits on Base. Save the buyer private key from this session for AI API setup and Manage actions like withdraw.',
  },
  {
    id: 'operator-consent',
    question: 'Why do I authorize the AntSeed operator?',
    answer:
      'This one-time sign-off lets the service manage your AI credits on Base for you — including funding after you pay on Celo — without you paying gas on Base. It does not let anyone spend G$ from your payer wallet.',
  },
  {
    id: 'when-credits-arrive',
    question: 'When do credits arrive?',
    answer:
      'After your Celo payment confirms, credits are funded on Base. Funding usually completes within a short time; check the Manage tab for your updated balance.',
  },
  {
    id: 'api-setup',
    question: 'What is API setup?',
    answer:
      'After you have credits, open Manage → API Setup and copy the commands into your terminal. ANTSEED_IDENTITY_HEX is your buyer private key. it links your purchases to the credit balance your AI tools should use.',
  },
] as const

function FaqItem({
  question,
  answer,
  expanded,
  onToggle,
}: {
  question: string
  answer: string
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <YStack gap="$1">
      <XStack
        justifyContent="space-between"
        alignItems="center"
        gap="$2"
        onPress={onToggle}
        cursor="pointer"
      >
        <Text fontSize="$2" fontWeight="600" flex={1}>
          {question}
        </Text>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size="xs" color="muted" />
      </XStack>
      {expanded && (
        <Text fontSize="$2" secondary lineHeight="$3">
          {answer}
        </Text>
      )}
    </YStack>
  )
}

export function BuyCreditsFaq() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <Card gap="$3">
      <Heading level={6}>FAQ</Heading>
      <YStack gap="$3">
        {FAQ_ITEMS.map((item, index) => (
          <YStack key={item.id} gap="$3">
            {index > 0 && <Separator />}
            <FaqItem
              question={item.question}
              answer={item.answer}
              expanded={expandedId === item.id}
              onToggle={() => {
                setExpandedId((current) => (current === item.id ? null : item.id))
              }}
            />
          </YStack>
        ))}
      </YStack>
    </Card>
  )
}
