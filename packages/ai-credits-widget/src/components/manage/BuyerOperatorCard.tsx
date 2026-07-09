import React, { useState } from 'react'
import { Button, ButtonText, Card, Heading, Icon, Spinner, Text, XStack, YStack } from '@goodwidget/ui'
import type { AiCreditsWidgetAdapterActions, AiCreditsWidgetAdapterState } from '../../widgetRuntimeContract'
import { AddressView } from '../shared/AddressView'
import { monospaceSingleLineStyle, compactButtonProps } from '../shared/styles'
import { useCopyFeedback } from '../shared/useCopyFeedback'

interface BuyerOperatorCardProps {
  state: Pick<
    AiCreditsWidgetAdapterState,
    'address' | 'buyerPubKey' | 'buyerPrvKey' | 'operatorConsented'
  >
  actions: Pick<AiCreditsWidgetAdapterActions, 'generateBuyerKey' | 'signOperatorConsent'>
}

export function BuyerOperatorCard({ state, actions }: BuyerOperatorCardProps) {
  const { address, buyerPubKey, buyerPrvKey, operatorConsented } = state
  const { copied: copiedPrivate, copy: copyPrivate } = useCopyFeedback()
  const [isPrivateKeyVisible, setIsPrivateKeyVisible] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSigning, setIsSigning] = useState(false)

  return (
    <Card gap="$2">
      <Heading level={6}>Buyer &amp; Operator</Heading>

      {address && <AddressView label="Payer" address={address} />}
      {buyerPubKey && <AddressView label="Buyer" address={buyerPubKey} />}

      <XStack gap="$2" alignItems="stretch" width="100%">
        <Button
          flex={1}
          flexBasis={0}
          minWidth={0}
          size="sm"
          {...compactButtonProps}
          onPress={() => {
            setIsGenerating(true)
            void Promise.resolve(actions.generateBuyerKey()).finally(() => setIsGenerating(false))
          }}
          disabled={isGenerating}
        >
          <ButtonText>{isGenerating ? 'Signing…' : 'Sign & Generate'}</ButtonText>
        </Button>

        <Button
          flex={1}
          flexBasis={0}
          minWidth={0}
          size="sm"
          {...compactButtonProps}
          onPress={() => {
            setIsSigning(true)
            void Promise.resolve(actions.signOperatorConsent()).finally(() => setIsSigning(false))
          }}
          disabled={operatorConsented || isSigning || !buyerPrvKey}
        >
          {isSigning ? (
            <Spinner size="sm" />
          ) : (
            <ButtonText>{operatorConsented ? 'Consented' : 'Sign Consent'}</ButtonText>
          )}
        </Button>
      </XStack>

      {buyerPrvKey && (
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$1" secondary>
              Buyer Private Key
            </Text>
            <Button
              variant="text"
              size="sm"
              onPress={() => setIsPrivateKeyVisible((prev) => !prev)}
            >
              <ButtonText>{isPrivateKeyVisible ? 'Hide' : 'Reveal'}</ButtonText>
            </Button>
          </XStack>
          <XStack
            backgroundColor="$backgroundMuted"
            borderRadius="$2"
            padding="$2"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text fontSize="$2" style={monospaceSingleLineStyle} flex={1} numberOfLines={1}>
              {isPrivateKeyVisible
                ? buyerPrvKey
                : '•'.repeat(Math.min(48, buyerPrvKey.length))}
            </Text>
            <Button
              size="sm"
              variant="ghost"
              iconSize="sm"
              onPress={() => void copyPrivate(buyerPrvKey)}
            >
              <Icon
                name={copiedPrivate ? 'check' : 'copy'}
                size="xs"
                color={copiedPrivate ? 'success' : 'text'}
              />
            </Button>
          </XStack>
        </YStack>
      )}
    </Card>
  )
}

