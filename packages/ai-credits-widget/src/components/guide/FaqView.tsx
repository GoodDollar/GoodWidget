import React, { useState } from 'react'
import {
  Button,
  ButtonText,
  Card,
  Icon,
  Separator,
  Text,
  XStack,
  YStack,
} from '@goodwidget/ui'

/**
 * Matches the inline markup an answer paragraph may carry: `**bold**` for
 * emphasised terms.
 */
const INLINE_MARKUP = /\*\*([^*]+)\*\*/g

/**
 * Splits a paragraph into plain text and bold runs. Answers are authored
 * copy — not user input — so a tiny markup subset beats threading arrays of
 * styled fragments through every FAQ entry.
 */
function renderInlineRuns(paragraph: string): React.ReactNode[] {
  const runs: React.ReactNode[] = []
  let cursor = 0

  for (const match of paragraph.matchAll(INLINE_MARKUP)) {
    const start = match.index ?? 0
    if (start > cursor) runs.push(paragraph.slice(cursor, start))

    runs.push(
      <Text fontSize="$2" key={`b-${start}`} fontWeight="600">
        {match[1]}
      </Text>,
    )
    cursor = start + match[0].length
  }

  if (cursor < paragraph.length) runs.push(paragraph.slice(cursor))
  return runs
}

/**
 * FAQ items for the API key credits flow.
 *
 * `answer` is a list of paragraphs so longer entries can breathe. Paragraphs
 * may use `**bold**` — see renderInlineRuns.
 */
const FAQ_ITEMS = [
  {
    id: 'goodwallet-only',
    question: 'I only claim G$ UBI — can I still use this?',
    answer: [
      'Yes. If your connected wallet holds G$ on Celo and meets the minimum amount, you can use it ' +
        'to buy AI credits.',
    ],
  },
  {
    id: 'what-is-api-key',
    question: 'What is the API key for?',
    answer: [
      'Your API key lets AI tools such as Claude Code and Codex use your GoodDollar AI credits. ' +
        'Paste the base URL and key into your tool and it works like any other API key.',
      'Your connected wallet private key is never shared. The API key only lets a tool spend your ' +
        'AI credits, up to your monthly spend limit.',
    ],
  },
  {
    id: 'deposit-vs-subscription',
    question: 'Deposit or subscribe — which should I pick?',
    answer: [
      'A **deposit** is a one-time purchase that gives you credits immediately (+10% bonus with GoodID).',
      'A **subscription** uses a monthly G$ stream and earns a higher +20% bonus — ideal if you use AI ' +
        'tools regularly.',
      'You can use both.',
    ],
  },
  {
    id: 'no-code',
    question: 'Do I need to know how to code?',
    answer: [
      'No. Buy credits in this widget, then copy the base URL and API key into your AI tool. ' +
        'There is nothing to install.',
    ],
  },
  {
    id: 'compatible-tools',
    question: 'Which tools can I use my credits with?',
    answer: [
      'Claude Code, Codex, and other AI tools that let you set a custom base URL and API key.',
    ],
  },
  {
    id: 'lost-api-key',
    question: 'What if I lose my API key?',
    answer: [
      'For your security the full key is only shown once, right after it is created, so it cannot be ' +
        'shown again.',
      'Open the **API Key** tab and choose **Rotate** to get a new key. The old key stops working ' +
        'immediately, so update it in any tool that uses it. Your credits are not affected.',
    ],
  },
  {
    id: 'unused-credits',
    question: 'Can I get unused credits back?',
    answer: [
      'Pending policy confirmation: how unused credits are handled has not been finalised yet. ' +
        'This answer will be updated once it is.',
    ],
  },
  {
    id: 'gd-usage',
    question: 'How much G$ will be used?',
    answer: ['Only the amount you choose to deposit or stream through a subscription.'],
  },
] as const

interface FaqItemProps {
  question: string
  answer: readonly string[]
  expanded: boolean
  onToggle: () => void
}

function FaqItem({ question, answer, expanded, onToggle }: FaqItemProps) {
  return (
    <YStack gap="$1">
      <XStack
        justifyContent="space-between"
        alignItems="center"
        gap="$2"
        onPress={onToggle}
        cursor="pointer"
      >
        <Text fontWeight="600" flex={1}>
          {question}
        </Text>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size="xs" color="muted" />
      </XStack>
      {expanded && (
        <YStack gap="$2">
          {answer.map((paragraph) => (
            <Text key={paragraph} fontSize="$2" tone="soft" lineHeight="$3">
              {renderInlineRuns(paragraph)}
            </Text>
          ))}
        </YStack>
      )}
    </YStack>
  )
}

interface FaqViewProps {
  /** Callback to return to the normal tab view. */
  onBack: () => void
}

/**
 * In-widget FAQ view rendered in place of the tab content when the user
 * clicks the FAQs button on the guidance card.
 */
export function FaqView({ onBack }: FaqViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <YStack gap="$4">
      {/* Back navigation */}
      <Button variant="text" alignSelf="flex-start" onPress={onBack} gap="$1">
        <Icon name="arrow-left" size="xs" color="primary" />
        <ButtonText color="$primary" fontSize="$2">
          Back
        </ButtonText>
      </Button>

      {/* FAQ list */}
      <Card gap="$3">
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
    </YStack>
  )
}
