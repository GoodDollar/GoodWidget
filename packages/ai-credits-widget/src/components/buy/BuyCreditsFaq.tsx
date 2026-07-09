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
      'Credits live on Base while you pay with G$ on Celo. Operator consent lets the AntSeed funding vault manage your buyer account on Base — mainly to fund credits after your Celo payment — without you paying Base gas for each step. It does not grant access to G$ on Celo or let anyone withdraw USD without your buyer key. See “What is Buyer & Operator?” for the full payer vs buyer vs operator breakdown.',
  },
  {
    id: 'when-credits-arrive',
    question: 'When do credits arrive?',
    answer:
      'After your Celo payment confirms, credits are funded on Base. Funding usually completes within a short time; check the Manage tab for your updated balance.',
  },
  {
    id: 'buyer-operator',
    question: 'What is Buyer & Operator?',
    answer:
      'Payer is the wallet that pays G$ on Celo. Buyer is a separate key derived from a payer signature; it owns your AI credit account on Base. Sign & Generate creates the buyer key for the connected payer.\n\nOperator consent is a one-time sign-off so the AntSeed funding vault can act as your operator on Base. After you pay G$ on Celo, the operator can fund your credits and handle routine Base-side actions for you without you paying Base gas. It cannot access your payer wallet, move G$ on Celo, or withdraw USD — those require your buyer private key.',
  },
  {
    id: 'withdraw',
    question: 'What funds can I withdraw?',
    answer:
      'You can withdraw unused principal up to the Withdrawable amount shown in Manage. Bonus credits from GoodID are not withdrawable and stay for AI usage only.\n\nWithdrawals are signed with your buyer private key and settled on Base as USD to your payer wallet address — the same wallet that pays G$ on Celo. Your total credit balance will be higher than the withdrawable amount when bonuses are included.',
  },
  {
    id: 'api-setup',
    question: 'What is API setup?',
    answer:
      'After you have credits, open Manage → API Setup and copy the commands into your terminal. ANTSEED_IDENTITY_HEX is your buyer private key. GOODDOLLAR_BUYER_ADDRESS is your buyer address — it links your purchases to the credit balance your AI tools should use.',
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
        <YStack gap="$2">
          {answer.split('\n\n').map((paragraph, index) => (
            <Text key={index} fontSize="$2" secondary lineHeight="$3">
              {paragraph}
            </Text>
          ))}
        </YStack>
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
