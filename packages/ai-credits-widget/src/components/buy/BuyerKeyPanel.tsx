import React, { useState } from 'react'
import { Button, ButtonText, Card, Heading, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import { AiCreditsStatusNotice } from '../theme/cards'
import { monospaceSingleLineStyle, compactButtonProps } from '../shared/styles'
import { useCopyFeedback } from '../shared/useCopyFeedback'

interface BuyerKeyPanelProps {
  buyerPubKey: string | null
  buyerKeyPrivate: string | null
  buyerPubKeySaved: boolean
  onGenerate: () => void | Promise<void>
  onConfirm: () => void
  embedded?: boolean
}

export function BuyerKeyPanel({
  buyerPubKey,
  buyerKeyPrivate,
  buyerPubKeySaved,
  onGenerate,
  onConfirm,
  embedded = false,
}: BuyerKeyPanelProps) {
  const { copied: copiedAddress, copy: copyAddress } = useCopyFeedback()
  const { copied: copiedPrivate, copy: copyPrivate } = useCopyFeedback()
  const [isPrivateKeyVisible, setIsPrivateKeyVisible] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      await onGenerate()
    } finally {
      setIsGenerating(false)
    }
  }

  const Shell = embedded ? YStack : Card

  return (
    <Shell gap="$3">
      <Heading level={5}>Buyer Key</Heading>
      <Text>
        Sign a message with your payer wallet to derive a deterministic AntSeed buyer key. Save the
        private key — you will need it to authenticate from your developer tools.
      </Text>

      <YStack gap="$3">
        <Button size="sm" {...compactButtonProps} onPress={handleGenerate} disabled={isGenerating}>
          <ButtonText>{isGenerating ? 'Waiting for signature…' : 'Sign & Generate Key'}</ButtonText>
        </Button>

        {buyerPubKey && (
          <YStack gap="$2">
            <Text variant="label" secondary>
              Address (registered on-chain)
            </Text>
            <XStack
              backgroundColor="$backgroundMuted"
              borderRadius="$2"
              padding="$3"
              justifyContent="space-between"
              alignItems="center"
            >
              <Text fontSize="$2" style={monospaceSingleLineStyle} flex={1} numberOfLines={1}>
                {buyerPubKey}
              </Text>
              <Button size="sm" variant="ghost" iconSize="sm" onPress={() => void copyAddress(buyerPubKey)}>
                <Icon
                  name={copiedAddress ? 'check' : 'copy'}
                  size="xs"
                  color={copiedAddress ? 'success' : 'text'}
                />
              </Button>
            </XStack>

            {buyerKeyPrivate && (
              <>
                <XStack justifyContent="space-between" alignItems="center">
                  <Text variant="label" secondary>
                    Private Key — save this securely
                  </Text>
                  <Button
                    variant="text"
                    size="sm"
                    onPress={() => {
                      setIsPrivateKeyVisible((prev) => !prev)
                    }}
                  >
                    <ButtonText>{isPrivateKeyVisible ? 'Hide' : 'Reveal'}</ButtonText>
                  </Button>
                </XStack>
                <AiCreditsStatusNotice borderColor="$warning">
                  <Text color="$warning" fontSize="$2">
                    ⚠ Revealing your private key can expose your account. Never share it — store it in a
                    secure place.
                  </Text>
                </AiCreditsStatusNotice>
                <XStack
                  backgroundColor="$backgroundMuted"
                  borderRadius="$2"
                  padding="$3"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Text fontSize="$2" style={monospaceSingleLineStyle} flex={1} numberOfLines={1}>
                    {isPrivateKeyVisible
                      ? buyerKeyPrivate
                      : '•'.repeat(Math.min(48, buyerKeyPrivate.length))}
                  </Text>
                  <Button
                    size="sm"
                    variant="ghost"
                    iconSize="sm"
                    onPress={() => void copyPrivate(buyerKeyPrivate)}
                  >
                    <Icon
                      name={copiedPrivate ? 'check' : 'copy'}
                      size="xs"
                      color={copiedPrivate ? 'success' : 'text'}
                    />
                  </Button>
                </XStack>
              </>
            )}

            {!buyerPubKeySaved && (
              <Button size="sm" {...compactButtonProps} onPress={onConfirm}>
                <ButtonText>I've Saved My Private Key</ButtonText>
              </Button>
            )}

            {buyerPubKeySaved && (
              <XStack gap="$2" alignItems="center">
                <Icon name="check" size="sm" color="success" />
                <Text color="$success" fontSize="$2">
                  Key confirmed — you can proceed
                </Text>
              </XStack>
            )}
          </YStack>
        )}
      </YStack>
    </Shell>
  )
}
