import React, { useState } from 'react'
import {
  Anchor,
  Button,
  ButtonText,
  Card,
  Icon,
  Separator,
  Text,
  XStack,
  YStack,
} from '@goodwidget/ui'

/** AntSeed website — same short link used on the setup guidance card. */
const ANTSEED_SITE_URL = 'https://ubi.gd/46pjeqF'

/**
 * Matches the two inline markups an answer paragraph may carry: `**bold**` for
 * emphasised terms and `[label](href)` for inline links.
 */
const INLINE_MARKUP = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g

/**
 * Splits a paragraph into plain text, bold, and link runs. Answers are authored
 * copy — not user input — so a tiny markup subset beats threading arrays of
 * styled fragments through every FAQ entry.
 */
function renderInlineRuns(paragraph: string): React.ReactNode[] {
  const runs: React.ReactNode[] = []
  let cursor = 0

  for (const match of paragraph.matchAll(INLINE_MARKUP)) {
    const start = match.index ?? 0
    if (start > cursor) runs.push(paragraph.slice(cursor, start))

    const [, boldText, linkLabel, linkHref] = match
    if (boldText) {
      runs.push(
        <Text key={`b-${start}`} fontWeight="600">
          {boldText}
        </Text>,
      )
    } else {
      runs.push(
        <Anchor key={`a-${start}`} href={linkHref} target="_blank">
          <Text color="$primary" textDecorationLine="underline">
            {linkLabel}
          </Text>
        </Anchor>,
      )
    }
    cursor = start + match[0].length
  }

  if (cursor < paragraph.length) runs.push(paragraph.slice(cursor))
  return runs
}

/**
 * FAQ items focused on the AntSeed setup and onboarding experience.
 * These are distinct from the purchase-flow FAQ in BuyCreditsFaq.tsx.
 *
 * `answer` is a list of paragraphs so longer entries can breathe. Paragraphs
 * may use `**bold**` and `[label](href)` — see renderInlineRuns.
 */
const SETUP_FAQ_ITEMS = [
  {
    id: 'goodwallet-only',
    question: 'I only claim G$ UBI — can I still use this?',
    answer: [
      'Yes. If your connected wallet holds G$ on Celo and meets the minimum amount, you can use it ' +
        'to buy AI credits.',
    ],
  },
  {
    id: 'what-is-antseed',
    question: 'What is Antseed?',
    answer: [
      'Antseed is a free, open-source desktop application that lets you use your AI credits with ' +
        'supported AI tools.',
      'Your connected wallet private key is never shared with Antseed. Antseed uses your separate ' +
        '**Signer Private Key** to access your AI credits. You can ' +
        `[learn more about Antseed here](${ANTSEED_SITE_URL}).`,
    ],
  },
  {
    id: 'why-credit-management',
    question: 'Why do I need to enable Credit Management?',
    answer: [
      'Enabling Credit Management allows you to use G$ for AI credits on Antseed.',
      'It authorizes the GoodDollar operator to manage the AI credits associated with your Signer, ' +
        'so you can deposit or subscribe with G$ and use those credits through Antseed.',
      'This only applies to your AI credits and does not give access to your connected wallet or ' +
        'its private key.',
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
      'No. You can set up your Signer Key and buy credits directly in this widget. Then use your ' +
        '**Signer Private Key** in the Antseed Desktop App to access your credits.',
      'Advanced users can also use the API.',
    ],
  },
  {
    id: 'compatible-tools',
    question: 'Which tools can I use my credits with?',
    answer: [
      'You can use your credits with AI tools supported through Antseed, including Claude Code, ' +
        'Codex, and other supported AI tools.',
    ],
  },
  {
    id: 'lost-signer-key',
    question: 'What if I lose my Signer Private Key?',
    answer: [
      "If you're using the same device, you can view your Signer Private Key again from the " +
        '**Manage** section.',
      'If you no longer have access to it, reconnect your connected wallet and select ' +
        '**Generate Signer Key** again. Your Signer Key is generated deterministically, so you’ll get the same ' +
        'key again.',
      'You can also import a backed-up Signer Private Key.',
    ],
  },
  {
    id: 'unused-credits',
    question: 'Can I get unused credits back?',
    answer: [
      'Yes. The **Withdrawable** amount shown in the Manage section can be withdrawn back to your ' +
        'connected wallet.',
      'Bonus credits received through GoodID are not withdrawable and can only be used for AI usage.',
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
        <Text fontSize="$2" fontWeight="600" flex={1}>
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

interface SetupFaqViewProps {
  /** Callback to return to the normal buy view. */
  onBack: () => void
}

/**
 * In-widget FAQ view rendered inside the Setup tab content area when the user
 * clicks the FAQs button on the guidance card. Contains setup and onboarding
 * focused questions, distinct from the purchase-flow FAQ.
 */
export function SetupFaqView({ onBack }: SetupFaqViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <YStack gap="$4">
      {/* Back navigation */}
      <Button variant="text" alignSelf="flex-start" onPress={onBack} gap="$1">
        <Icon name="arrow-left" size="xs" color="primary" />
        <ButtonText color="$primary" fontSize="$2">
          Back to Set Up
        </ButtonText>
      </Button>

      {/* FAQ list */}
      <Card gap="$3">
        <YStack gap="$3">
          {SETUP_FAQ_ITEMS.map((item, index) => (
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
