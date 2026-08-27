import React, { useState } from 'react'
import { Button, ButtonText, Card, Icon, Separator, Text, XStack, YStack } from '@goodwidget/ui'

/**
 * FAQ items focused on the AntSeed setup and onboarding experience.
 * These are distinct from the purchase-flow FAQ in BuyCreditsFaq.tsx.
 */
const SETUP_FAQ_ITEMS = [
  {
    id: 'goodwallet-only',
    question: 'I only claim UBI with GoodWallet — can I still use this?',
    answer:
      'Yes. Any wallet that holds G$ on Celo works. Connect your wallet here, generate a signer key, ' +
      'and you can buy credits just like any other G$ holder.',
  },
  {
    id: 'ubi-savings',
    question: 'Will this ever touch my daily UBI savings?',
    answer:
      'No. Only the G$ amount you explicitly deposit or stream is used. Your UBI balance and savings ' +
      'remain untouched unless you choose to spend them.',
  },
  {
    id: 'deposit-vs-stream',
    question: 'Deposit or stream — which should I pick?',
    answer:
      'A one-time deposit gives you credits immediately (+10% bonus with GoodID). ' +
      'A monthly stream drips G$ over time and earns a higher +20% bonus — ideal if you use AI tools regularly. ' +
      'You can combine both.',
  },
  {
    id: 'lost-signer-key',
    question: 'What if I lose my signer key?',
    answer:
      'Re-connect your payer wallet and click "Sign & Generate Key" again — it derives the same key deterministically. ' +
      'You can also import a backup private key in the Manage tab.',
  },
  {
    id: 'no-code',
    question: 'Do I need to know how to code?',
    answer:
      'No. The whole flow — wallet connect, signer key, credit purchase — is done in this widget. ' +
      'After that, Antseed provides a desktop app that handles the rest without any command-line steps.',
  },
  {
    id: 'unused-credits',
    question: 'Can I get unused credits back?',
    answer:
      'Yes. The Withdrawable amount shown in the Manage tab can be reclaimed to your payer wallet. ' +
      'Bonus credits (from GoodID) are not withdrawable — they are for AI usage only.',
  },
  {
    id: 'compatible-tools',
    question: 'Which tools can I actually use my credits with?',
    answer:
      'Any tool that supports AntSeed-compatible AI credits, including Claude Code, Codex, and other ' +
      'AI coding assistants. The Antseed desktop app integrates them without extra configuration.',
  },
  {
    id: 'antseed-safe',
    question: 'Is Antseed safe? Can I check it myself?',
    answer:
      'Antseed is an open-source desktop application. Your G$ wallet private key is never shared with it — ' +
      'only the scoped signer key is exposed. You can audit the source code on the AntSeed GitHub repository.',
  },
] as const

interface FaqItemProps {
  question: string
  answer: string
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
        <Text fontSize="$2" secondary lineHeight="$3">
          {answer}
        </Text>
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
