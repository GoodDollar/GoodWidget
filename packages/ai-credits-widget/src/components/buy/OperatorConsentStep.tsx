import React from 'react'
import { Button, ButtonText, Card, Heading, Icon, Spinner, Text, XStack, YStack } from '@goodwidget/ui'
import { truncateAddress, compactButtonProps } from '../shared/styles'

interface OperatorConsentStepProps {
  buyerPubKey: string | null
  buyerPrvKey: string | null
  operatorSignature?: string | null
  operatorConsented: boolean
  operatorConsentPending?: boolean
  onSign: () => Promise<void>
  embedded?: boolean
}

export function OperatorConsentStep({
  buyerPubKey,
  buyerPrvKey,
  operatorSignature = null,
  operatorConsented,
  operatorConsentPending = false,
  onSign,
  embedded = false,
}: OperatorConsentStepProps) {
  const canSign = Boolean(buyerPubKey && (buyerPrvKey || operatorSignature))
  const isBusy = operatorConsentPending

  const Shell = embedded ? YStack : Card

  return (
    <Shell gap="$3" {...(!embedded ? { backgroundColor: '$backgroundHover' } : {})}>
      <Heading level={5}>Authorize AntSeed Operator</Heading>
      <Text fontSize="$2" lineHeight="$3">
        Your buyer key signs an EIP-712 SetOperator message. The backend submits it to
        AntseedDeposits so the funding vault can act as your operator. No gas is required from
        you.
      </Text>

      {buyerPubKey && (
        <Text fontSize="$2" lineHeight="$2">
          Buyer address:{' '}
          <Text fontFamily="$mono" fontSize="$2">
            {truncateAddress(buyerPubKey)}
          </Text>
        </Text>
      )}

      {operatorConsented ? (
        <XStack gap="$2" alignItems="center">
          <Icon name="check" size="sm" color="success" />
          <Text color="$success">Operator consent accepted — ready to pay</Text>
        </XStack>
      ) : (
        <Button
          size="sm"
          {...compactButtonProps}
          onPress={() => {
            void onSign()
          }}
          disabled={!canSign || isBusy}
        >
          {isBusy ? (
            <XStack gap="$2" alignItems="center">
              <ButtonText>Submitting…</ButtonText>
              <Spinner size="sm" />
            </XStack>
          ) : (
            <ButtonText>Sign Operator Consent</ButtonText>
          )}
        </Button>
      )}
    </Shell>
  )
}
